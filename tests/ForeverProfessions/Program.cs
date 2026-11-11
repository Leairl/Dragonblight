using System.Net;
using System.Reflection;
using System.Text.Json;
using ArgentPonyWarcraftClient;
using Dragonblight_Website.Server.Controllers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using StackExchange.Redis;

//No credentials, Blizzard requests or running Redis required.
var checks = 0;
void Check(bool condition, string message) { if (!condition) throw new Exception(message); checks++; }
var handler = new BlizzardHandler();
using var http = new HttpClient(handler);
using var limited = new RateLimitedHttpClient(http);
var client = new WarcraftClient("test-id", "test-secret", limited);
var values = new Dictionary<string, RedisValue>();
var hashes = new Dictionary<string, Dictionary<string, RedisValue>>();
var database = Stub.Create<IDatabase>((method, args) => method.Name switch
{
    "StringGetAsync" => Get(args),
    "StringSetAsync" => Set(args),
    "KeyDeleteAsync" when args[0] is RedisKey[] keys => Delete(keys),
    "KeyDeleteAsync" when args[0] is RedisKey key => Task.FromResult(Delete([key]).Result > 0),
    "KeyExistsAsync" when args[0] is RedisKey key => Task.FromResult(Exists(key)),
    "KeyRenameAsync" => Rename((RedisKey)args[0]!, (RedisKey)args[1]!),
    "HashSetAsync" when args[1] is HashEntry[] entries => HashSet((RedisKey)args[0]!, entries),
    "HashGetAsync" when args[1] is RedisValue[] fields => HashGet((RedisKey)args[0]!, fields),
    _ => throw new NotSupportedException(method.Name)
});
//Lookups run in parallel (a whole achievement batch at once), so the fake Redis is locked like the real one is atomic.
Task<RedisValue> Get(object?[] args)
{
    lock (values) return Task.FromResult(values.GetValueOrDefault(((RedisKey)args[0]!).ToString()));
}
Task<long> Delete(RedisKey[] keys)
{
    lock (values) return Task.FromResult((long)keys.Count(key => values.Remove(key.ToString()) | hashes.Remove(key.ToString())));
}
bool Exists(RedisKey key)
{
    lock (values) return values.ContainsKey(key.ToString()) || hashes.ContainsKey(key.ToString());
}
Task<bool> Rename(RedisKey from, RedisKey to)
{
    lock (values)
    {
        if (!hashes.Remove(from.ToString(), out var hash)) return Task.FromResult(false);
        hashes[to.ToString()] = hash;
        return Task.FromResult(true);
    }
}
Task HashSet(RedisKey key, HashEntry[] entries)
{
    lock (values)
    {
        var hash = hashes.TryGetValue(key.ToString(), out var existing) ? existing : hashes[key.ToString()] = [];
        foreach (var entry in entries) hash[entry.Name.ToString()] = entry.Value;
    }
    return Task.CompletedTask;
}
Task<RedisValue[]> HashGet(RedisKey key, RedisValue[] fields)
{
    lock (values)
    {
        var hash = hashes.GetValueOrDefault(key.ToString());
        return Task.FromResult(fields.Select(field => hash?.GetValueOrDefault(field.ToString()) ?? RedisValue.Null).ToArray());
    }
}
Task<bool> Set(object?[] args)
{
    var key = ((RedisKey)args[0]!).ToString();
    lock (values)
    {
        if (args.OfType<When>().Contains(When.NotExists) && values.ContainsKey(key)) return Task.FromResult(false);
        values[key] = (RedisValue)args[1]!;
    }
    return Task.FromResult(true);
}
var redis = Stub.Create<IConnectionMultiplexer>((method, _) => method.Name switch
{
    "GetDatabase" => database,
    "GetEndPoints" => Array.Empty<EndPoint>(),
    _ => throw new NotSupportedException(method.Name)
});
using var memory = new MemoryCache(new MemoryCacheOptions());
//The production proxy is internal; exercise it through its public interface.
var proxyType = typeof(ForeverCharacterController).Assembly.GetType("WarcraftRedisProxy")!;
var logger = typeof(NullLogger<>).MakeGenericType(proxyType).GetField("Instance")!.GetValue(null);
var proxy = (IWarcraftRedisProxy)Activator.CreateInstance(proxyType, client, redis, memory, logger)!;

var flat = await proxy.GetForeverProfessions("example-player", "us");
Check(flat?.Primaries[0].SkillPoints == 0, "A zero skill level must be preserved");
Check(flat!.Primaries[0].MaxSkillPoints == 75, "Flat profession skill must be preserved");
Check(flat.Secondaries[0].Profession.Name == "Fishing", "Secondary professions must be preserved");
Check(handler.Paths.Last().Contains("/character/example-player/professions?namespace=profile-forever-us"), "Use the realmless character route and Forever namespace");
var calls = handler.Paths.Count;
await proxy.GetForeverProfessions("example-player", "us");
Check(handler.Paths.Count == calls, "Repeated reads must use Redis");
handler.FlatSkills = false;
var tiered = await proxy.GetForeverProfessions("tiered-player", "us");
Check(tiered?.Primaries[0].Tiers[0].SkillPoints == 42, "Skill tiers must be preserved");
Check(tiered!.Primaries[0].Tiers[0].KnownRecipes[0].Name == "Test recipe", "Known recipes must be preserved");
await proxy.GetForeverProfessions("example-player", "eu");
Check(handler.Paths.Last().StartsWith("https://eu.api.blizzard.com/"), "Regions must have separate caches and hosts");
Check(handler.Paths.Last().Contains("namespace=profile-forever-eu"), "EU must use the Forever namespace too");
Check(handler.Paths.All(path => path.Contains("namespace=profile-forever-")), "No profession requests may use Retail or MoP namespaces");

handler.Status = HttpStatusCode.NotFound;
Check(await proxy.GetForeverProfessions("missing-player", "us") == null, "Missing upstream data must not become an empty profession list");
handler.Status = HttpStatusCode.InternalServerError;
var failed = false;
try { await proxy.GetForeverProfessions("retry-player", "us"); }
catch (HttpRequestException) { failed = true; }
Check(failed, "An upstream failure must surface as an error");
handler.Status = HttpStatusCode.OK;
Check(await proxy.GetForeverProfessions("retry-player", "us") != null, "Failures must not poison the cache");
var empty = JsonSerializer.Deserialize<CharacterProfessionsSummary>("{}");
Check(empty?.Primaries == null && empty?.Secondaries == null, "Omitted profession arrays must be allowed");

var controller = new ForeverCharacterController(NullLogger<ForeverCharacterController>.Instance, proxy, new ForeverStatsQueue())
{
    ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
};
var result = await controller.GetProfessions("US", "EXAMPLE-PLAYER");
Check(result.Result is OkObjectResult { Value: CharacterProfessionsSummary }, "Controller must return profession data and normalize character input");
calls = handler.Paths.Count;
Check((await controller.GetProfessions("invalid", "example-player")).Result is BadRequestObjectResult, "Reject unsupported regions");
Check((await controller.GetProfessions("us", "../example")).Result is BadRequestObjectResult, "Reject invalid slugs");
Check(handler.Paths.Count == calls, "Invalid requests must not call Blizzard");
Check(typeof(ProfileController).GetMethod("GetProfessions") == null, "Retail/MoP must not expose the new endpoint");
handler.Status = HttpStatusCode.NotFound;
Check((await controller.GetProfessions("us", "not-found")).Result is NotFoundObjectResult, "Missing data should return 404");
Check((await controller.GetProfessions("us", "not-found")).Result is NotFoundObjectResult { Value: ProblemDetails { Status: 404 } }, "The generated client needs a structured 404 with its status");
handler.Status = HttpStatusCode.InternalServerError;
Check((await controller.GetProfessions("us", "failed-player")).Result is StatusCodeResult { StatusCode: 500 }, "Upstream failures should return 500, not an empty success");

handler.Status = HttpStatusCode.OK;
calls = handler.Paths.Count;
var recipes = (await controller.GetRecipes("US", [2359, 2359])).Result as OkObjectResult;
var recipeRows = recipes?.Value as ForeverRecipeDetails[];
Check(recipeRows?.Length == 1, "Recipe batches must deduplicate IDs");
Check(recipeRows![0].recipe?.CraftedItem.Id == 2996, "Recipe details must include the real crafted item ID, not treat the recipe ID as a spell ID");
Check(recipeRows[0].recipe?.Reagents[0].Quantity == 2, "Recipe details must include reagent quantities");
Check(recipeRows[0].recipe?.CraftedQuantity.Value == 1, "Recipe details must include output quantities");
Check(recipeRows[0].icon == "https://example.com/recipe-icon.jpg", "Recipe icons must come from recipe media");
Check(handler.Paths.Count == calls + 2, "One recipe needs one detail request and one media request");
Check(handler.Paths.Skip(calls).All(path => path.Contains("namespace=static-forever-us")), "Recipe requests must use Forever static data only");
calls = handler.Paths.Count;
await controller.GetRecipes("us", [2359]);
Check(handler.Paths.Count == calls, "Static recipe data and icons must be cached");
await controller.GetRecipes("eu", [2359]);
Check(handler.Paths.Last().StartsWith("https://eu.api.blizzard.com/") && handler.Paths.Last().Contains("namespace=static-forever-eu"), "Static recipe caches must be region-specific");
calls = handler.Paths.Count;
Check((await controller.GetRecipes("invalid", [2359])).Result is BadRequestObjectResult, "Recipe batches must validate the region");
Check((await controller.GetRecipes("us", [])).Result is BadRequestObjectResult, "Reject empty recipe batches");
Check((await controller.GetRecipes("us", [0])).Result is BadRequestObjectResult, "Reject nonpositive recipe IDs");
Check((await controller.GetRecipes("us", Enumerable.Range(1, 11).ToArray())).Result is BadRequestObjectResult, "Reject batches over ten recipes");
Check(handler.Paths.Count == calls, "Invalid batches must not call Blizzard");
var partial = (await controller.GetRecipes("us", [2359, 9999])).Result as OkObjectResult;
var partialRows = partial?.Value as ForeverRecipeDetails[];
Check(partialRows?.Length == 2 && partialRows[0].recipe != null && partialRows[1].recipe == null, "One missing recipe must not hide the other known recipes");
handler.Status = HttpStatusCode.InternalServerError;
var unavailable = (await controller.GetRecipes("us", [2360])).Result as OkObjectResult;
Check((unavailable?.Value as ForeverRecipeDetails[])?[0].recipe == null, "Unavailable details must remain distinguishable from an empty recipe");
handler.Status = HttpStatusCode.OK;
var retry = (await controller.GetRecipes("us", [2360])).Result as OkObjectResult;
Check((retry?.Value as ForeverRecipeDetails[])?[0].recipe != null, "Failed recipe requests must not poison the cache");
var tierResult = (await controller.GetSkillTierRecipes("US", 197, 2948)).Result as OkObjectResult;
var tierRows = tierResult?.Value as ForeverSkillTierRecipe[];
Check(tierRows?.Length == 3 && tierRows[0].category == "Reagents" && tierRows[2].name == "Linen Cloak", "Skill tier recipes must be flattened in order with their categories");
Check(tierRows!.All(row => row.id != 52147), "Season of Discovery recipes aren't in Forever and must be left out");
Check(handler.Paths.Last().Contains("/profession/197/skill-tier/2948?namespace=static-forever-us"), "Skill tiers must use the Forever static namespace");
calls = handler.Paths.Count;
await controller.GetSkillTierRecipes("us", 197, 2948);
Check(handler.Paths.Count == calls, "Skill tier recipe lists must be cached");
Check((await controller.GetSkillTierRecipes("us", 197, 9999)).Result is NotFoundObjectResult, "A tier Blizzard doesn't have must be a 404");
calls = handler.Paths.Count;
Check((await controller.GetSkillTierRecipes("xx", 197, 2948)).Result is BadRequestObjectResult, "Skill tier recipes must validate the region");
Check((await controller.GetSkillTierRecipes("us", 0, 2948)).Result is BadRequestObjectResult, "Reject nonpositive profession IDs");
Check(handler.Paths.Count == calls, "Invalid skill tier requests must not call Blizzard");
var pvp = await proxy.GetForeverPvpSummary("luna-amariyo", "eu");
Check(pvp?.HonorableKills == 94 && pvp.PvpRank == 0, "Forever PvP must preserve kills and unranked zero");
Check(pvp!.PvpMapStatistics![0].MatchStatistics.Won == 0, "Battleground zero wins must be preserved");
Check(handler.Paths.Last().Contains("/character/luna-amariyo/pvp-summary?namespace=profile-forever-eu"), "PvP must use the realmless Forever endpoint");
calls = handler.Paths.Count;
await proxy.GetForeverPvpSummary("luna-amariyo", "eu");
Check(handler.Paths.Count == calls, "PvP summaries must be cached");
await proxy.GetForeverPvpSummary("luna-amariyo", "us");
Check(handler.Paths.Last().StartsWith("https://us.api.blizzard.com/") && handler.Paths.Last().Contains("namespace=profile-forever-us"), "PvP cache must isolate regions");
Check((await controller.GetPvpSummary("EU", "LUNA-AMARIYO")).Result is OkObjectResult { Value: ForeverPvpSummary }, "PvP controller must normalize input");
calls = handler.Paths.Count;
Check((await controller.GetPvpSummary("invalid", "example-player")).Result is BadRequestObjectResult, "PvP must validate regions");
Check((await controller.GetPvpSummary("us", "../example")).Result is BadRequestObjectResult, "PvP must validate slugs");
Check((await controller.GetPvpSummary("us", new string('a', 65) + "-player")).Result is BadRequestObjectResult, "PvP must bound slug length");
Check(handler.Paths.Count == calls, "Invalid PvP requests must not call Blizzard");
handler.Status = HttpStatusCode.NotFound;
Check((await controller.GetPvpSummary("us", "missing-player")).Result is NotFoundObjectResult { Value: ProblemDetails { Status: 404 } }, "Missing PvP must return structured 404");
handler.Status = HttpStatusCode.InternalServerError;
Check((await controller.GetPvpSummary("us", "retry-player")).Result is StatusCodeResult { StatusCode: 500 }, "Failed PvP must not return empty success");
handler.Status = HttpStatusCode.OK;
Check((await controller.GetPvpSummary("us", "retry-player")).Result is OkObjectResult, "PvP failures must not poison the cache");
var emptyPvp = JsonSerializer.Deserialize<ForeverPvpSummary>("{}");
Check(emptyPvp?.HonorableKills == null && emptyPvp?.PvpRank == null && emptyPvp?.PvpMapStatistics == null, "Missing PvP fields must not become zero");
Check(typeof(ProfileController).GetMethod("GetPvpSummary") == null, "Retail/MoP must not expose Forever PvP");
var stats = await proxy.GetForeverCharacterStats("judgement-judy", "eu");
Check(stats?.Health == 919 && stats.Power == 1028 && stats.PowerType?.Name == "Mana", "Stats must preserve health and resource type");
Check(stats!.Spirit?.Effective == 75 && stats.Defense?.Effective == 136, "Stats must preserve Classic-specific spirit and defense");
Check(stats.FireResistance?.Effective == 0 && stats.SpellHealing == 11, "Stats must preserve resistances and healing");
Check(stats.MeleeHit?.Value == 0 && stats.MeleeCrit?.Value > 6, "Stats must preserve reported hit bonus and fractional crit");
Check(handler.Paths.Last().Contains("/character/judgement-judy/statistics?namespace=profile-forever-eu"), "Stats must use the realmless Forever endpoint");
calls = handler.Paths.Count;
await proxy.GetForeverCharacterStats("judgement-judy", "eu");
Check(handler.Paths.Count == calls, "Stats must be cached");
await proxy.GetForeverCharacterStats("judgement-judy", "us");
Check(handler.Paths.Last().StartsWith("https://us.api.blizzard.com/") && handler.Paths.Last().Contains("namespace=profile-forever-us"), "Stats caches must isolate regions");
await proxy.GetForeverCharacterStats("élise-example", "eu");
Check(handler.Paths.Last().Contains("%C3%A9lise-example"), "Stats must escape accented slugs");
Check((await controller.GetStats("EU", "JUDGEMENT-JUDY")).Result is OkObjectResult { Value: ForeverCharacterStatistics }, "Stats controller must normalize input");
calls = handler.Paths.Count;
Check((await controller.GetStats("invalid", "example-player")).Result is BadRequestObjectResult, "Stats must validate regions");
Check((await controller.GetStats("us", "../example")).Result is BadRequestObjectResult, "Stats must validate slugs");
Check((await controller.GetStats("us", new string('a', 65) + "-player")).Result is BadRequestObjectResult, "Stats must bound slug length");
Check(handler.Paths.Count == calls, "Invalid stats requests must not call Blizzard");
handler.Status = HttpStatusCode.NotFound;
Check((await controller.GetStats("us", "missing-player")).Result is NotFoundObjectResult { Value: ProblemDetails { Status: 404 } }, "Missing stats must return structured 404");
handler.Status = HttpStatusCode.InternalServerError;
Check((await controller.GetStats("us", "retry-player")).Result is StatusCodeResult { StatusCode: 500 }, "Stats failures must not return an empty success");
handler.Status = HttpStatusCode.OK;
Check((await controller.GetStats("us", "retry-player")).Result is OkObjectResult, "Stats failures must not poison the cache");
var emptyStats = JsonSerializer.Deserialize<ForeverCharacterStatistics>("{}");
Check(emptyStats?.Health == null && emptyStats?.SpellHealing == null && emptyStats?.Defense == null, "Omitted stats must not become zero");
Check(typeof(ProfileController).GetMethod("GetStats") == null, "The Forever stats endpoint must stay separate from Retail/MoP");
var reputations = await proxy.GetForeverReputations("jeebu-weebu", "us");
Check(reputations?.Reputations?[0].Faction?.Name == "Bloodsail Buccaneers", "Reputations must preserve faction names");
var standing = reputations!.Reputations![0].Standing!;
Check(standing.Name == "Hated" && standing.Tier == 0 && standing.Raw == -33900, "Reputations must preserve API names, tier zero and negative raw standing");
Check(standing.Value == 8100 && standing.Max == 36000, "Within-standing progress must be kept separate from raw standing");
Check(reputations.Reputations[1].Standing?.Value == 0, "Zero reputation progress must be preserved");
Check(handler.Paths.Last().Contains("/character/jeebu-weebu/reputations?namespace=profile-forever-us"), "Reputations must use the realmless Forever endpoint");
calls = handler.Paths.Count;
await proxy.GetForeverReputations("jeebu-weebu", "us");
Check(handler.Paths.Count == calls, "Reputations must be cached");
await proxy.GetForeverReputations("jeebu-weebu", "eu");
Check(handler.Paths.Last().StartsWith("https://eu.api.blizzard.com/") && handler.Paths.Last().Contains("namespace=profile-forever-eu"), "Reputation caches must isolate regions");
await proxy.GetForeverReputations("élise-example", "eu");
Check(handler.Paths.Last().Contains("%C3%A9lise-example"), "Reputations must escape accented slugs");
Check((await controller.GetReputations("US", "JEEBU-WEEBU")).Result is OkObjectResult { Value: ForeverReputationsSummary }, "Reputations controller must normalize input");
calls = handler.Paths.Count;
Check((await controller.GetReputations("invalid", "example-player")).Result is BadRequestObjectResult, "Reputations must validate regions");
Check((await controller.GetReputations("us", "../example")).Result is BadRequestObjectResult, "Reputations must validate slugs");
Check((await controller.GetReputations("us", new string('a', 65) + "-player")).Result is BadRequestObjectResult, "Reputations must bound slug length");
Check(handler.Paths.Count == calls, "Invalid reputation requests must not call Blizzard");
handler.Status = HttpStatusCode.NotFound;
Check((await controller.GetReputations("us", "missing-player")).Result is NotFoundObjectResult { Value: ProblemDetails { Status: 404 } }, "Missing reputations must return structured 404");
handler.Status = HttpStatusCode.InternalServerError;
Check((await controller.GetReputations("us", "retry-player")).Result is StatusCodeResult { StatusCode: 500 }, "Reputation failures must not return an empty success");
handler.Status = HttpStatusCode.OK;
Check((await controller.GetReputations("us", "retry-player")).Result is OkObjectResult, "Reputation failures must not poison the cache");
Check(JsonSerializer.Deserialize<ForeverReputationsSummary>("{}")?.Reputations == null, "Omitted reputations must remain absent");
var missingStanding = JsonSerializer.Deserialize<ForeverReputationsSummary>("""{"reputations":[{"standing":{}}]}""")!.Reputations![0].Standing!;
Check(missingStanding.Value == null && missingStanding.Max == null && missingStanding.Tier == null, "Missing standing fields must not become zero");
Check(typeof(ProfileController).GetMethod("GetReputations") == null, "Reputations must remain Forever-only");
var achievements = await proxy.GetForeverAchievements("judgement-judy", "eu");
Check(achievements?.TotalQuantity == 4 && achievements.TotalPoints == 0, "Completed counts and zero achievement points must remain distinct from row counts and Legacy rewards");
Check(achievements!.Achievements![0].CompletedTimestamp == 1794171240000, "Achievement timestamps must remain epoch milliseconds");
Check(achievements.Achievements[1].Criteria?.ChildCriteria?[0].Amount == 132, "Nested character criterion progress must be preserved");
Check(achievements.RecentEvents?[0].Achievement?.Name == "Novice Paladin", "Recent achievement names and timestamps must be preserved");
Check(handler.Paths.Last().Contains("/character/judgement-judy/achievements?namespace=profile-forever-eu"), "Achievements must use the realmless Forever endpoint");
calls = handler.Paths.Count;
await proxy.GetForeverAchievements("judgement-judy", "eu");
Check(handler.Paths.Count == calls, "Achievement summaries must be cached");
await proxy.GetForeverAchievements("judgement-judy", "us");
Check(handler.Paths.Last().StartsWith("https://us.api.blizzard.com/") && handler.Paths.Last().Contains("namespace=profile-forever-us"), "Achievement caches must isolate regions");
await proxy.GetForeverAchievements("élise-example", "eu");
Check(handler.Paths.Last().Contains("%C3%A9lise-example"), "Achievement slugs must be escaped");
Check((await controller.GetAchievements("EU", "JUDGEMENT-JUDY")).Result is OkObjectResult { Value: ForeverAchievementsSummary }, "Achievement controller must normalize input");
calls = handler.Paths.Count;
Check((await controller.GetAchievements("invalid", "example-player")).Result is BadRequestObjectResult, "Achievement regions must be validated");
Check((await controller.GetAchievements("us", "../example")).Result is BadRequestObjectResult, "Achievement slugs must be validated");
Check((await controller.GetAchievements("us", new string('a', 65) + "-player")).Result is BadRequestObjectResult, "Achievement slug length must be bounded");
Check(handler.Paths.Count == calls, "Invalid achievement requests must not call Blizzard");
handler.Status = HttpStatusCode.NotFound;
Check((await controller.GetAchievements("us", "missing-player")).Result is NotFoundObjectResult { Value: ProblemDetails { Status: 404 } }, "Missing achievements must return structured 404");
handler.Status = HttpStatusCode.InternalServerError;
Check((await controller.GetAchievements("us", "retry-player")).Result is StatusCodeResult { StatusCode: 500 }, "Failed achievements must not return empty success");
handler.Status = HttpStatusCode.OK;
Check((await controller.GetAchievements("us", "retry-player")).Result is OkObjectResult, "Achievement failures must not poison the cache");
Check(JsonSerializer.Deserialize<ForeverAchievementsSummary>("{}")?.Achievements == null, "Omitted achievement arrays must remain absent");
var emptyCriteria = JsonSerializer.Deserialize<ForeverAchievementCriteriaProgress>("""{"id":1}""")!;
Check(emptyCriteria.Amount == null && emptyCriteria.IsCompleted == null, "Missing criterion progress must not become zero or incomplete");

calls = handler.Paths.Count;
var achievementRows = ((await controller.GetAchievementDetails("EU", [62015, 62015])).Result as OkObjectResult)?.Value as ForeverAchievementDetails[];
Check(achievementRows?.Length == 1, "Achievement batches must deduplicate IDs");
Check(achievementRows![0].achievement?.RewardDescription == "Earn 1 Legacy Point.", "Legacy reward text must not be discarded or converted into achievement points");
Check(achievementRows[0].achievement?.Criteria?.ChildCriteria?[0].Amount == 150, "Nested definition targets must survive deserialization");
Check(achievementRows[0].achievement?.Criteria?.ChildCriteria?[0].ShowProgressBar == true, "Criterion progress bar flags must survive deserialization");
Check(achievementRows[0].icon == "https://example.com/achievement.jpg", "Achievement icons must use media assets");
Check(handler.Paths.Count == calls + 2 && handler.Paths.Skip(calls).All(path => path.Contains("namespace=static-forever-eu")), "Static achievements must use the Forever namespace");
calls = handler.Paths.Count;
await controller.GetAchievementDetails("eu", [62015]);
Check(handler.Paths.Count == calls, "Achievement definitions and icons must be cached");
await controller.GetAchievementDetails("us", [62015]);
Check(handler.Paths.Last().StartsWith("https://us.api.blizzard.com/") && handler.Paths.Last().Contains("namespace=static-forever-us"), "Static achievement caches must isolate regions");
calls = handler.Paths.Count;
Check((await controller.GetAchievementDetails("invalid", [62015])).Result is BadRequestObjectResult, "Achievement detail regions must be validated");
Check((await controller.GetAchievementDetails("us", [])).Result is BadRequestObjectResult, "Empty achievement batches must be rejected");
Check((await controller.GetAchievementDetails("us", [0])).Result is BadRequestObjectResult, "Nonpositive achievement IDs must be rejected");
Check((await controller.GetAchievementDetails("us", Enumerable.Range(1, ForeverCharacterController.MaxAchievementBatch + 1).ToArray())).Result is BadRequestObjectResult, "Achievement batches must be bounded");
Check(handler.Paths.Count == calls, "Invalid achievement detail requests must not call Blizzard");
var partialAchievements = ((await controller.GetAchievementDetails("us", [62015, 9999])).Result as OkObjectResult)?.Value as ForeverAchievementDetails[];
Check(partialAchievements?.Length == 2 && partialAchievements[0].achievement != null && partialAchievements[1].achievement == null, "Missing static achievements must not hide available rows");
handler.Status = HttpStatusCode.InternalServerError;
var failedDetails = ((await controller.GetAchievementDetails("us", [62016])).Result as OkObjectResult)?.Value as ForeverAchievementDetails[];
Check(failedDetails?[0].achievement == null, "Unavailable static details must remain distinguishable from empty definitions");
handler.Status = HttpStatusCode.OK;
var retriedDetails = ((await controller.GetAchievementDetails("us", [62016])).Result as OkObjectResult)?.Value as ForeverAchievementDetails[];
Check(retriedDetails?[0].achievement != null, "Failed static achievements must not poison the cache");
//A character's whole achievement list fits in one request.
calls = handler.Paths.Count;
var wholeList = ((await controller.GetAchievementDetails("eu", Enumerable.Range(70000, ForeverCharacterController.MaxAchievementBatch).ToArray())).Result as OkObjectResult)?.Value as ForeverAchievementDetails[];
Check(wholeList?.Length == ForeverCharacterController.MaxAchievementBatch && wholeList.All(row => row.achievement != null), "A full batch must return every achievement");
Check(handler.Paths.Count == calls + 2 * ForeverCharacterController.MaxAchievementBatch, "A cold batch needs one definition and one media request per achievement");

//Blizzard 404s are remembered, so a missing definition or icon is not requested on every view.
calls = handler.Paths.Count;
await controller.GetAchievementDetails("us", [9999]);
Check(handler.Paths.Count == calls, "Missing static achievements must be cached as missing");
await controller.GetRecipes("us", [9999]);
await controller.GetRecipes("us", [9999]);
Check(handler.Paths.Count(path => path.Contains("/recipe/9999")) == 2, "Missing static recipes and icons must be cached as missing");

//Complete static batches are cacheable by the browser; partial ones are not, so a retry reaches the server.
string? CacheControlOf(Func<Task> request)
{
    controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
    request().GetAwaiter().GetResult();
    return controller.Response.Headers.CacheControl.ToString();
}
Check(CacheControlOf(() => controller.GetAchievementDetails("us", [62015])) == "public, max-age=86400", "Complete achievement batches must be browser-cacheable");
Check(CacheControlOf(() => controller.GetAchievementDetails("us", [62015, 9999])) == "", "Partial achievement batches must not be browser-cached");
Check(CacheControlOf(() => controller.GetRecipes("us", [2359])) == "public, max-age=86400", "Complete recipe batches must be browser-cacheable");
Check(CacheControlOf(() => controller.GetAchievements("us", "judgement-judy")) == "private, max-age=300", "Character tabs may be reused briefly by the browser");
handler.Status = HttpStatusCode.NotFound;
Check(CacheControlOf(() => controller.GetAchievements("us", "missing-player")) == "", "Missing characters must not be browser-cached");
handler.Status = HttpStatusCode.OK;
Check(typeof(ProfileController).GetMethod("GetAchievements") == null, "The new achievements endpoint must remain Forever-only");

//---- collections ----
handler.Status = HttpStatusCode.OK;
calls = handler.Paths.Count;
var collections = ((await controller.GetCollections("EU", "KROM-NOBLUNGG")).Result as OkObjectResult)?.Value as ForeverCollectionsPage;
Check(collections != null, "Collections controller must normalize input and return a page");
Check(collections!.mounts.Select(m => m.Mount!.Name).SequenceEqual(["Striped Dawnsaber", "Swift Zebra"]), "Mounts must be sorted by name");
Check(collections.mounts[0].IsUseable == false, "A mount the character can't use must stay marked");
Check(collections.pets.Length == 2 && collections.pets.All(p => p.Species!.Id == 50) && collections.pets[0].Quality?.Type == "UNCOMMON", "Two pets of one species must both be kept, with quality");
Check(collections.unlockedBattlePetSlots == 0, "A reported zero pet slots must be preserved");
Check(collections.toys.Length == 0, "An omitted toy array must become an empty list");
Check(collections.appearanceSlots.Length == 2 && collections.appearanceSlots[0] is { type: "HEAD", name: "Head", count: 2 },
    "Slots sharing a name must be merged in Blizzard's order, counting each shown appearance once");
Check(collections.appearanceSlots[1] is { type: "CHEST", name: "Chest", count: 0, appearances.Length: 0 }, "Appearances with no item must be left out of the list and the count");
var head = collections.appearanceSlots[0].appearances;
Check(head.Select(a => a.id).SequenceEqual([29124, 63427]), "Each slot must list its appearances once, in Blizzard's order, without the game's Hidden items");
Check(head[0] is { name: "Stalwart Helm", quality: "EPIC" }, "An appearance shared by several items must be named after the best of them");
Check(head[1] is { name: "Plain Helm (GB)", quality: "COMMON" }, "Appearances must be named from Forever's item catalog in the region's locale");
Check(handler.Paths.Count(path => path.Contains("/search/item?namespace=static-forever-eu") && path.Contains("is_equippable=true")) == 1, "The catalog must come from Forever's equippable item search");
var searches = BlizzardHandler.Searches;
await controller.GetCollections("eu", "luna-amariyo");
Check(BlizzardHandler.Searches == searches, "The appearance catalog must be built once and reused by every character");
Check(collections.totals is { mounts: 3, pets: 2, toys: 1 }, "Totals must count Forever's game data indexes");
var collectionPaths = handler.Paths.Skip(calls).ToList();
Check(collectionPaths.Count(path => path.Contains("/character/krom-noblungg/collections/") && path.Contains("namespace=profile-forever-eu")) == 4, "Collections must use the four realmless Forever endpoints");
Check(collectionPaths.Count(path => path.Contains("/index?namespace=static-forever-eu")) == 3, "Totals must use Forever's static namespace");
calls = handler.Paths.Count;
await controller.GetCollections("eu", "krom-noblungg");
Check(handler.Paths.Count == calls, "Collections and totals must be cached");
Check(CacheControlOf(() => controller.GetCollections("eu", "krom-noblungg")) == "private, max-age=300", "The collections tab may be reused briefly by the browser");
Check((await controller.GetCollections("invalid", "krom-noblungg")).Result is BadRequestObjectResult, "Collection regions must be validated");
Check((await controller.GetCollections("us", "../example")).Result is BadRequestObjectResult, "Collection slugs must be validated");
handler.Status = HttpStatusCode.NotFound;
Check((await controller.GetCollections("us", "missing-collector")).Result is NotFoundObjectResult { Value: ProblemDetails { Status: 404 } }, "A character with no collections must return a structured 404");
handler.Status = HttpStatusCode.InternalServerError;
Check((await controller.GetCollections("us", "failed-collector")).Result is StatusCodeResult { StatusCode: 500 }, "Collection failures must not return an empty success");
handler.Status = HttpStatusCode.OK;
Check((await controller.GetCollections("us", "failed-collector")).Result is OkObjectResult, "Collection failures must not poison the cache");

calls = handler.Paths.Count;
var mountIcons = ((await controller.GetCollectionIcons("EU", "mount", [2995, 2995, 2])).Result as OkObjectResult)?.Value as ForeverCollectionIcon[];
Check(mountIcons?.Length == 2, "Icon batches must deduplicate IDs");
Check(mountIcons![0].icon == "https://example.com/creature-display-144509.jpg", "A mount's picture must be its creature display render");
Check(mountIcons[1].icon == null, "A mount with no creature display has no picture");
Check(handler.Paths.Count == calls + 3 && handler.Paths.Skip(calls).All(path => path.Contains("namespace=static-forever-eu")), "Mount pictures need the mount and its display media, in Forever's namespace");
var petIcons = ((await controller.GetCollectionIcons("eu", "pet", [50])).Result as OkObjectResult)?.Value as ForeverCollectionIcon[];
Check(petIcons?[0].icon == "https://example.com/pet-50.jpg", "A pet's icon comes from its species");
var toyIcons = ((await controller.GetCollectionIcons("eu", "toy", [1754])).Result as OkObjectResult)?.Value as ForeverCollectionIcon[];
Check(toyIcons?[0].icon == "https://example.com/item-276242.jpg", "A toy's icon comes from its item media");
calls = handler.Paths.Count;
await controller.GetCollectionIcons("eu", "mount", [2995, 2]);
await controller.GetCollectionIcons("eu", "toy", [1754]);
Check(handler.Paths.Count == calls, "Collection pictures must be cached");
Check(CacheControlOf(() => controller.GetCollectionIcons("eu", "pet", [50])) == "public, max-age=86400", "Complete icon batches must be browser-cacheable");
Check(CacheControlOf(() => controller.GetCollectionIcons("eu", "mount", [2])) == "", "Batches with a missing picture must not be browser-cached");
calls = handler.Paths.Count;
var appearanceIcons = ((await controller.GetCollectionIcons("eu", "appearance", [29124, 7])).Result as OkObjectResult)?.Value as ForeverCollectionIcon[];
Check(appearanceIcons?[0].icon == "https://example.com/item-100.jpg", "A named appearance's icon must come from its item's media");
Check(appearanceIcons![1].icon == "https://render.worldofwarcraft.com/forever-eu/icons/56/907.jpg", "An unnamed appearance's media id is its icon file, used directly");
Check(handler.Paths.Count == calls + 2, "Appearance icons need one media call for an item, and one appearance call for an unnamed one");
calls = handler.Paths.Count;
await controller.GetCollectionIcons("eu", "appearance", [29124, 7]);
Check(handler.Paths.Count == calls, "Appearance icons must be cached");
Check(collections.pets[0].CreatureDisplay?.Id == 5207, "A pet's own creature display must be kept for its preview");
Check((await controller.GetCollectionIcons("eu", "heirloom", [1])).Result is BadRequestObjectResult, "Unknown collection kinds must be rejected");
Check((await controller.GetCollectionIcons("eu", "pet", [])).Result is BadRequestObjectResult, "Empty icon batches must be rejected");
Check((await controller.GetCollectionIcons("eu", "pet", [0])).Result is BadRequestObjectResult, "Nonpositive icon IDs must be rejected");
Check((await controller.GetCollectionIcons("eu", "pet", Enumerable.Range(1, ForeverCharacterController.MaxCollectionIconBatch + 1).ToArray())).Result is BadRequestObjectResult, "Icon batches must be bounded");
Check(typeof(ProfileController).GetMethod("GetCollections") == null, "The collections endpoint must remain Forever-only");

//---- Legacy Points ----
handler.Status = HttpStatusCode.OK;
calls = handler.Paths.Count;
var legacy = ((await controller.GetLegacyPoints("EU", "JUDGEMENT-JUDY")).Result as OkObjectResult)?.Value as ForeverLegacyPoints;
Check(legacy is { earned: 1, total: 3 }, "Legacy Points count completed achievements that award them, out of every awarding achievement");
Check(handler.Paths.Skip(calls).Any(path => path.Contains("/achievement/index?namespace=static-forever-eu")), "Legacy rewards come from Forever's achievement index");
calls = handler.Paths.Count;
await controller.GetLegacyPoints("eu", "judgement-judy");
Check(handler.Paths.Count == calls, "Legacy rewards and achievements must be cached");
Check(CacheControlOf(() => controller.GetLegacyPoints("eu", "judgement-judy")) == "private, max-age=300", "Legacy Points may be reused briefly by the browser");
Check((await controller.GetLegacyPoints("xx", "judgement-judy")).Result is BadRequestObjectResult, "Legacy Point regions must be validated");
Check((await controller.GetLegacyPoints("eu", "../x")).Result is BadRequestObjectResult, "Legacy Point slugs must be validated");
handler.Status = HttpStatusCode.NotFound;
Check((await controller.GetLegacyPoints("eu", "nobody-here")).Result is NotFoundObjectResult { Value: ProblemDetails { Status: 404 } }, "A character with no achievements must return a structured 404");
handler.Status = HttpStatusCode.OK;
//one definition Blizzard can't find means the list can't be trusted; it fails rather than undercounting, and isn't kept
BlizzardHandler.AchievementIndex = """{"achievements":[{"id":61997,"name":"a"},{"id":9999,"name":"missing"}]}""";
Check((await controller.GetLegacyPoints("us", "judgement-judy")).Result is StatusCodeResult { StatusCode: 500 }, "An unreadable definition must fail, not undercount");
BlizzardHandler.AchievementIndex = """{"achievements":[{"id":61997,"name":"a"}]}""";
Check(((await controller.GetLegacyPoints("us", "judgement-judy")).Result as OkObjectResult)?.Value is ForeverLegacyPoints { earned: 1, total: 1 }, "A failed Legacy reward list must not be cached");
Console.WriteLine($"Passed {checks} Forever character checks.");

public class Stub : DispatchProxy
{
    public Func<MethodInfo, object?[], object?> Handler { get; set; } = null!;
    public static T Create<T>(Func<MethodInfo, object?[], object?> handler) where T : class
    {
        var result = DispatchProxy.Create<T, Stub>();
        ((Stub)(object)result).Handler = handler;
        return result;
    }
    protected override object? Invoke(MethodInfo? targetMethod, object?[]? args) => Handler(targetMethod!, args ?? []);
}

class BlizzardHandler : HttpMessageHandler
{

    //Collections, their game data indexes and the static data their pictures come from.
    //Two items share appearance 29124: it is named after the better one. 63427 has only the common item;
    //5, 6 and 7 have no item at all, as about a quarter of a real character's appearances do.
    //every fixture definition rewards "Earn 1 Legacy Point."; 9999 is missing from Blizzard
    public static string AchievementIndex = """{"achievements":[{"id":61997,"name":"a"},{"id":62015,"name":"b"},{"id":70001,"name":"c"}]}""";
    public static int Searches;
    static string SearchItems { get { Interlocked.Increment(ref Searches); return """{"results":[{"data":{"id":102,"name":{"en_US":"Hidden Helm","en_GB":"Hidden Helm"},"quality":{"type":"COMMON","name":{"en_US":"Common"}},"media":{"id":102},"appearances":[{"id":8}]}},{"data":{"id":101,"name":{"en_US":"Plain Helm","en_GB":"Plain Helm (GB)"},"quality":{"type":"COMMON","name":{"en_US":"Common"}},"media":{"id":101},"appearances":[{"id":29124},{"id":63427}]}},{"data":{"id":100,"name":{"en_US":"Stalwart Helm","en_GB":"Stalwart Helm"},"quality":{"type":"EPIC","name":{"en_US":"Epic"}},"media":{"id":100},"appearances":[{"id":29124}]}}]}"""; } }

    static string? Collection(string path) => path switch
    {
        _ when path.EndsWith("/collections/mounts") => """{"_links":{},"mounts":[{"mount":{"key":{"href":"x"},"name":"Swift Zebra","id":2},"is_useable":true},{"mount":{"name":"Striped Dawnsaber","id":2995},"is_useable":false}]}""",
        _ when path.EndsWith("/collections/pets") => """{"pets":[{"species":{"name":"Green Wing Macaw","id":50},"level":1,"quality":{"type":"UNCOMMON","name":"Uncommon"},"stats":{"breed_id":0},"creature_display":{"id":5207},"id":1},{"species":{"name":"Green Wing Macaw","id":50},"level":3,"id":2}],"unlocked_battle_pet_slots":0}""",
        _ when path.EndsWith("/collections/toys") => """{"_links":{}}""",
        _ when path.EndsWith("/collections/transmogs") => """{"slots":[{"slot":{"type":"HEAD","name":"Head"},"appearances":[{"key":{"href":"x"},"id":29124},{"id":63427}]},{"slot":{"type":"CHEST","name":"Chest"}},{"slot":{"type":"ROBE","name":"Chest"},"appearances":[{"id":5},{"id":6},{"id":5}]},{"slot":{"type":"HELM","name":"Head"},"appearances":[{"id":63427},{"id":7},{"id":8}]}]}""",
        _ when path.EndsWith("/achievement/index") => AchievementIndex,
        _ when path.EndsWith("/search/item") => SearchItems,
        _ when path.Contains("/data/wow/item-appearance/") => $$$"""{"id":{{{path.Split('/')[^1]}}},"media":{"id":{{{900 + int.Parse(path.Split('/')[^1])}}}}}""",
        _ when path.EndsWith("/mount/index") => """{"mounts":[{"name":"a","id":1},{"name":"b","id":2},{"name":"c","id":2995}]}""",
        _ when path.EndsWith("/pet/index") => """{"pets":[{"name":"a","id":1},{"name":"b","id":50}]}""",
        _ when path.EndsWith("/toy/index") => """{"toys":[{"name":"a","id":1754}]}""",
        _ when path.EndsWith("/data/wow/mount/2995") => """{"id":2995,"creature_displays":[{"id":144509}]}""",
        _ when path.EndsWith("/data/wow/mount/2") => """{"id":2,"creature_displays":[]}""",
        _ when path.Contains("/media/creature-display/") => $$"""{"assets":[{"key":"zoom","value":"https://example.com/creature-display-{{path.Split('/')[^1]}}.jpg"}]}""",
        _ when path.Contains("/data/wow/pet/") => $$"""{"id":{{path.Split('/')[^1]}},"icon":"https://example.com/pet-{{path.Split('/')[^1]}}.jpg"}""",
        _ when path.Contains("/data/wow/toy/") => """{"id":1754,"item":{"id":276242},"media":{"id":276242}}""",
        _ when path.Contains("/media/item/") => $$"""{"id":276242,"assets":[{"key":"icon","value":"https://example.com/item-{{path.Split('/')[^1]}}.jpg","file_data_id":1}]}""",
        _ => null,
    };
    public List<string> Paths { get; } = [];
    public HttpStatusCode Status { get; set; } = HttpStatusCode.OK;
    public bool FlatSkills { get; set; } = true;
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (request.RequestUri!.AbsolutePath.EndsWith("/token"))
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("""{"access_token":"test-token","expires_in":3600,"token_type":"bearer"}""") });
        var path = request.RequestUri.AbsoluteUri;
        lock (Paths) Paths.Add(path);
        var collection = Collection(request.RequestUri.AbsolutePath);
        if (collection != null)
        {
            var body = Status != HttpStatusCode.OK ? $$"""{"code":{{(int)Status}},"detail":"Test error"}""" : collection;
            return Task.FromResult(new HttpResponseMessage(Status) { Content = new StringContent(body) });
        }
        if (request.RequestUri.AbsolutePath.EndsWith("/achievements"))
        {
            var body = Status != HttpStatusCode.OK ? $$"""{"code":{{(int)Status}},"detail":"Test error"}"""
                : """{"total_quantity":4,"total_points":0,"achievements":[{"id":61997,"achievement":{"id":61997,"name":"Novice Paladin"},"criteria":{"id":221473,"is_completed":true},"completed_timestamp":1794171240000},{"id":62015,"achievement":{"id":62015,"name":"Journeyman Blacksmith"},"criteria":{"id":221509,"is_completed":false,"child_criteria":[{"id":221510,"amount":132,"is_completed":false}]}}],"recent_events":[{"achievement":{"id":61997,"name":"Novice Paladin"},"timestamp":1794171240000}]}""";
            return Task.FromResult(new HttpResponseMessage(Status) { Content = new StringContent(body) });
        }
        if (request.RequestUri.AbsolutePath.Contains("/achievement/"))
        {
            var id = int.Parse(request.RequestUri.AbsolutePath.Split('/')[^1]);
            var status = id == 9999 ? HttpStatusCode.NotFound : Status;
            var body = status != HttpStatusCode.OK ? $$"""{"code":{{(int)status}},"detail":"Unavailable achievement"}"""
                : request.RequestUri.AbsolutePath.Contains("/media/")
                    ? $$"""{"id":{{id}},"assets":[{"key":"icon","value":"https://example.com/achievement.jpg"}]}"""
                    : $$$"""{"id":{{{id}}},"name":"Journeyman Blacksmith","description":"Reach 150 skill in Blacksmithing for the first time.","category":{"id":15588,"name":"Blacksmithing"},"is_account_wide":true,"reward_description":"Earn 1 Legacy Point.","criteria":{"id":221509,"amount":0,"child_criteria":[{"id":221510,"description":"150 Blacksmithing Skill","amount":150,"show_progress_bar":true}]}}""";
            return Task.FromResult(new HttpResponseMessage(status) { Content = new StringContent(body) });
        }
        if (request.RequestUri.AbsolutePath.EndsWith("/reputations"))
        {
            var body = Status != HttpStatusCode.OK ? $$"""{"code":{{(int)Status}},"detail":"Test error"}"""
                : """{"reputations":[{"faction":{"id":87,"name":"Bloodsail Buccaneers"},"standing":{"raw":-33900,"value":8100,"max":36000,"tier":0,"name":"Hated"}},{"faction":{"id":72,"name":"Stormwind"},"standing":{"raw":3000,"value":0,"max":6000,"tier":4,"name":"Friendly"}}]}""";
            return Task.FromResult(new HttpResponseMessage(Status) { Content = new StringContent(body) });
        }
        if (request.RequestUri.AbsolutePath.EndsWith("/statistics"))
        {
            var body = Status != HttpStatusCode.OK ? $$"""{"code":{{(int)Status}},"detail":"Test error"}"""
                : """{"health":919,"power":1028,"power_type":{"id":0,"name":"Mana"},"spirit":{"base":41,"effective":75},"defense":{"base":136,"effective":136},"fire_resistance":{"base":0,"effective":0},"spell_healing":11,"melee_hit":{"value":0},"melee_crit":{"value":6.32}}""";
            return Task.FromResult(new HttpResponseMessage(Status) { Content = new StringContent(body) });
        }
        if (request.RequestUri.AbsolutePath.EndsWith("/pvp-summary"))
        {
            var body = Status != HttpStatusCode.OK ? $$"""{"code":{{(int)Status}},"detail":"Test error"}"""
                : """{"honorable_kills":94,"pvp_rank":0,"pvp_map_statistics":[{"world_map":{"id":529,"name":"Arathi Basin"},"match_statistics":{"played":3,"won":0,"lost":3}}]}""";
            return Task.FromResult(new HttpResponseMessage(Status) { Content = new StringContent(body) });
        }
        if (request.RequestUri.AbsolutePath.Contains("/skill-tier/"))
        {
            var missing = request.RequestUri.AbsolutePath.EndsWith("/9999");
            var status = missing ? HttpStatusCode.NotFound : Status;
            var body = status != HttpStatusCode.OK ? $$"""{"code":{{(int)status}},"detail":"Unavailable skill tier"}"""
                : """{"id":2948,"name":"Tailoring","minimum_skill_level":1,"maximum_skill_level":75,"categories":[{"name":"Reagents","recipes":[{"id":2359,"name":"Bolt of Linen Cloth"},{"id":2370,"name":"Bolt of Woolen Cloth"}]},{"name":"Cloaks","recipes":[{"id":2387,"name":"Linen Cloak"}]},{"name":"SEASON OF DISCOVERY","recipes":[{"id":52147,"name":"Crimson Dawnwoven Bag"}]},{"name":"Empty"}]}""";
            return Task.FromResult(new HttpResponseMessage(status) { Content = new StringContent(body) });
        }
        if (request.RequestUri.AbsolutePath.Contains("/recipe/"))
        {
            var id = int.Parse(request.RequestUri.AbsolutePath.Split('/')[^1]);
            var status = id == 9999 ? HttpStatusCode.NotFound : Status;
            var body = status != HttpStatusCode.OK ? $$"""{"code":{{(int)status}},"detail":"Unavailable recipe"}"""
                : request.RequestUri.AbsolutePath.Contains("/media/")
                    ? $$"""{"id":{{id}},"assets":[{"key":"icon","value":"https://example.com/recipe-icon.jpg"}]}"""
                    : $$$"""{"id":{{{id}}},"name":"Bolt of Linen Cloth","crafted_item":{"id":2996,"name":"Bolt of Linen Cloth"},"reagents":[{"reagent":{"id":2589,"name":"Linen Cloth"},"quantity":2}],"crafted_quantity":{"value":1}}""";
            return Task.FromResult(new HttpResponseMessage(status) { Content = new StringContent(body) });
        }
        var json = Status != HttpStatusCode.OK ? $$"""{"code":{{(int)Status}},"detail":"Test error"}""" : FlatSkills
            ? """{"primaries":[{"profession":{"id":164,"name":"Blacksmithing"},"skill_points":0,"max_skill_points":75}],"secondaries":[{"profession":{"id":356,"name":"Fishing"},"skill_points":30,"max_skill_points":75}]}"""
            : """{"primaries":[{"profession":{"id":197,"name":"Tailoring"},"tiers":[{"tier":{"id":2948,"name":"Tailoring"},"skill_points":42,"max_skill_points":100,"known_recipes":[{"id":2359,"name":"Test recipe"}]}]}]}""";
        return Task.FromResult(new HttpResponseMessage(Status) { Content = new StringContent(json) });
    }
}
