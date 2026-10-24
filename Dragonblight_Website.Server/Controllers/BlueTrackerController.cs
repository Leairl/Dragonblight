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
    private async Task<Dictionary<int, JsonElement>> Categories(string region) =>
        (await Get(region, "/site.json")).GetProperty("categories").EnumerateArray().ToDictionary(c => Number(c, "id"));

    // Unknown categories are excluded rather than silently assigned to Retail.
    private static bool Matches(Dictionary<int, JsonElement> categories, int categoryId, string title, bool classic)
    {
        var names = new List<string>();
        var seen = new HashSet<int>();
        while (categories.TryGetValue(categoryId, out var category) && seen.Add(categoryId))
        {
            names.Add(Text(category, "name"));
            categoryId = Number(category, "parent_category_id");
        }
        if (names.Count == 0) return false;
        var categoryNames = string.Join(" ", names);
        var mop = Regex.IsMatch(title + " " + categoryNames, @"\b(Mists of Pandaria|MoP)\b", RegexOptions.IgnoreCase);
        if (classic) return mop;
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
            var classic = HttpContext.GetGameFlavor() == GameFlavor.MistsClassic;
            var posts = new List<JsonElement>();
            var cursor = "";
            for (var page = 0; page < 5 && posts.Count < 30; page++)
            {
                var batch = (await Get(region, $"/groups/blizzard-tracker/posts.json{cursor}")).GetProperty("posts");
                if (batch.GetArrayLength() == 0) break;
                cursor = $"?before_post_id={Number(batch[batch.GetArrayLength() - 1], "id")}";
                posts.AddRange(batch.EnumerateArray().Where(p => Matches(categories, Number(p, "category_id"), Text(p, "topic_title"), classic)));
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
            if (Text(post, "primary_group_name") is not ("community-manager" or "blizzard" or "api_users" or "blue")) return NotFound();
            var topic = await Get(region, $"/t/{Number(post, "topic_id")}.json");
            var categories = await Categories(region);
            if (!Matches(categories, Number(topic, "category_id"), Text(topic, "title"), HttpContext.GetGameFlavor() == GameFlavor.MistsClassic)) return NotFound();
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
