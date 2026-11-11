using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

[ApiController]
[Route("api/blue-tracker")]
public class BlueTrackerController(IHttpClientFactory clients, IMemoryCache cache, ILogger<BlueTrackerController> logger) : ControllerBase
{
    private static string Root(string region) => $"https://{region}.forums.blizzard.com/en/wow";
    private static string Text(JsonElement e, string key) => e.TryGetProperty(key, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString()! : "";
    private static int Number(JsonElement e, string key) => e.TryGetProperty(key, out var v) && v.ValueKind == JsonValueKind.Number && v.TryGetInt32(out var n) ? n : 0;
    private async Task<JsonElement> Get(string region, string path)
    {
        var key = $"blue:{region}:{path}";
        if (cache.TryGetValue<JsonElement>(key, out var value)) return value;
        using var response = await clients.CreateClient("BlizzardForums").GetAsync(Root(region) + path);
        response.EnsureSuccessStatusCode();
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        value = doc.RootElement.Clone();
        cache.Set(key, value, TimeSpan.FromMinutes(5));
        return value;
    }
    // the forum groups Blizzard employees post from
    private static bool IsBlizzardGroup(string group) => group is "community-manager" or "blizzard" or "api_users" or "blue";

    // Whether a Blizzard employee opened the thread a blue post is in: its own first post, or a thread
    // whose first post is from a Blizzard group. Who opened a thread never changes, so it's kept a day.
    private async Task<bool> StartedByBlizzard(string region, int topicId, int postNumber)
    {
        if (postNumber == 1) return true;
        var key = $"blue:starter:{region}:{topicId}";
        if (cache.TryGetValue<bool>(key, out var known)) return known;
        var topic = await Get(region, $"/t/{topicId}.json");
        var started = false;
        if (topic.TryGetProperty("post_stream", out var stream) && stream.TryGetProperty("posts", out var first) && first.GetArrayLength() > 0)
        {
            started = Number(first[0], "post_number") == 1 && IsBlizzardGroup(Text(first[0], "primary_group_name"));
        }
        cache.Set(key, started, TimeSpan.FromDays(1));
        return started;
    }

    private async Task<Dictionary<int, JsonElement>> Categories(string region) =>
        (await Get(region, "/site.json")).GetProperty("categories").EnumerateArray().ToDictionary(c => Number(c, "id"));

    // Unknown categories are excluded rather than silently assigned to Retail.
    private static bool Matches(Dictionary<int, JsonElement> categories, int categoryId, string title, GameFlavor flavor)
    {
        var names = new List<string>();
        var seen = new HashSet<int>();
        while (categories.TryGetValue(categoryId, out var category) && seen.Add(categoryId))
        {
            names.Add(Text(category, "name"));
            categoryId = Number(category, "parent_category_id");
        }
        if (names.Count == 0) return false;
        // WoW: Forever has its own forum section ("WoW: Forever", with General Discussion and Bug Report)
        // and a beta board under In Development; site-wide news that's about Forever names it in the title
        if (flavor == GameFlavor.Forever)
        {
            return names.Any(n => n.Contains("Forever", StringComparison.OrdinalIgnoreCase))
                || title.Contains("Forever", StringComparison.OrdinalIgnoreCase);
        }
        var categoryNames = string.Join(" ", names);
        var mop = Regex.IsMatch(title + " " + categoryNames, @"\b(Mists of Pandaria|MoP)\b", RegexOptions.IgnoreCase);
        if (flavor == GameFlavor.MistsClassic) return mop;
        if (mop || Regex.IsMatch(title + " " + categoryNames, @"\b(Classic|Hardcore|Season of Discovery|Forever)\b", RegexOptions.IgnoreCase)) return false;
        return names.Any(n => new[] { "Community", "Gameplay", "Classes", "PVP", "PvP", "In Development" }.Contains(n));
    }
    private object Summary(JsonElement post, Dictionary<int, JsonElement> categories, string region)
    {
        var id = Number(post, "category_id");
        var category = categories.TryGetValue(id, out var c) ? Text(c, "name") : "";
        var name = Text(post, "name");
        var topicId = Number(post, "topic_id");
        var postNumber = Number(post, "post_number");
        return new { id = Number(post, "id"), title = Text(post, "topic_title"), author = string.IsNullOrEmpty(name) ? Text(post, "username") : name,
            authorTitle = Text(post, "user_title"), createdAt = Text(post, "created_at"), category,
            excerpt = WebUtility.HtmlDecode(Regex.Replace(Text(post, "excerpt"), "<[^>]*>", "")),
            sourceUrl = $"{Root(region)}/t/{topicId}/{postNumber}", postNumber };
    }
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string region = "us")
    {
        if (region is not ("us" or "eu")) return BadRequest("Unsupported region.");
        try
        {
            var categories = await Categories(region);
            var flavor = HttpContext.GetGameFlavor();
            var posts = new List<JsonElement>();
            var cursor = "";
            for (var page = 0; page < 5 && posts.Count < 30; page++)
            {
                var batch = (await Get(region, $"/groups/blizzard-tracker/posts.json{cursor}")).GetProperty("posts");
                if (batch.GetArrayLength() == 0) break;
                cursor = $"?before_post_id={Number(batch[batch.GetArrayLength() - 1], "id")}";
                foreach (var p in batch.EnumerateArray().Where(p => Matches(categories, Number(p, "category_id"), Text(p, "topic_title"), flavor)))
                {
                    // Forever shows Blizzard's own threads (hotfixes, tuning, announcements and their
                    // updates), not Blizzard replies in threads players started
                    if (flavor == GameFlavor.Forever && !await StartedByBlizzard(region, Number(p, "topic_id"), Number(p, "post_number"))) continue;
                    posts.Add(p);
                }
            }
            return Ok(posts.DistinctBy(p => Number(p, "id")).OrderByDescending(p => Text(p, "created_at")).Take(30).Select(p => Summary(p, categories, region)));
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            logger.LogWarning(ex, "Blizzard blue tracker unavailable for {Region}", region);
            return Problem("Blizzard’s forums are temporarily unavailable. Please try again shortly.", statusCode: 502);
        }
    }
    [HttpGet("{region}/{postId:int}")]
    public async Task<IActionResult> Post(string region, int postId)
    {
        if (region is not ("us" or "eu") || postId <= 0) return BadRequest();
        try
        {
            var post = await Get(region, $"/posts/{postId}.json");
            // Individual post JSON includes the author's group, not membership in the tracker group.
            if (!IsBlizzardGroup(Text(post, "primary_group_name"))) return NotFound();
            var topic = await Get(region, $"/t/{Number(post, "topic_id")}.json");
            var categories = await Categories(region);
            var flavor = HttpContext.GetGameFlavor();
            if (!Matches(categories, Number(topic, "category_id"), Text(topic, "title"), flavor)) return NotFound();
            if (flavor == GameFlavor.Forever && !await StartedByBlizzard(region, Number(post, "topic_id"), Number(post, "post_number"))) return NotFound();
            return Ok(new { title = Text(topic, "title"), author = Text(post, "name") is { Length: > 0 } name ? name : Text(post, "username"),
                authorTitle = Text(post, "user_title"), createdAt = Text(post, "created_at"), updatedAt = Text(post, "updated_at"),
                html = Text(post, "cooked"), sourceUrl = $"{Root(region)}/t/{Number(post, "topic_id")}/{Number(post, "post_number")}" });
        }
        catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { return NotFound(); }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            logger.LogWarning(ex, "Blizzard post {PostId} unavailable", postId);
            return Problem("This Blizzard post could not be loaded. Please try again shortly.", statusCode: 502);
        }
    }
}
