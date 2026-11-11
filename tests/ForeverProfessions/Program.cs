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
var database = Stub.Create<IDatabase>((method, args) => method.Name switch
{
    "StringGetAsync" => Task.FromResult(values.GetValueOrDefault(((RedisKey)args[0]!).ToString())),
    "StringSetAsync" => Set(args),
    "KeyDeleteAsync" when args[0] is RedisKey[] keys => Task.FromResult((long)keys.Count(key => values.Remove(key.ToString()))),
    _ => throw new NotSupportedException(method.Name)
});
Task<bool> Set(object?[] args)
{
    var key = ((RedisKey)args[0]!).ToString();
    if (args.OfType<When>().Contains(When.NotExists) && values.ContainsKey(key)) return Task.FromResult(false);
    values[key] = (RedisValue)args[1]!;
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
Console.WriteLine($"Passed {checks} Forever professions checks.");

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
    public List<string> Paths { get; } = [];
    public HttpStatusCode Status { get; set; } = HttpStatusCode.OK;
    public bool FlatSkills { get; set; } = true;
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (request.RequestUri!.AbsolutePath.EndsWith("/token"))
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("""{"access_token":"test-token","expires_in":3600,"token_type":"bearer"}""") });
        var path = request.RequestUri.ToString();
        Paths.Add(path);
        var json = Status != HttpStatusCode.OK ? $$"""{"code":{{(int)Status}},"detail":"Test error"}""" : FlatSkills
            ? """{"primaries":[{"profession":{"id":164,"name":"Blacksmithing"},"skill_points":0,"max_skill_points":75}],"secondaries":[{"profession":{"id":356,"name":"Fishing"},"skill_points":30,"max_skill_points":75}]}"""
            : """{"primaries":[{"profession":{"id":197,"name":"Tailoring"},"tiers":[{"tier":{"id":2948,"name":"Tailoring"},"skill_points":42,"max_skill_points":100,"known_recipes":[{"id":2359,"name":"Test recipe"}]}]}]}""";
        return Task.FromResult(new HttpResponseMessage(Status) { Content = new StringContent(json) });
    }
}
