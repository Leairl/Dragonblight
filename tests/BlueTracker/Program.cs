using System.Reflection;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;

var categories = JsonSerializer.Deserialize<JsonElement>("""
{"categories":[{"id":1,"name":"Community","parent_category_id":null},{"id":2,"name":"General Discussion","parent_category_id":1},{"id":3,"name":"WoW Classic"},{"id":4,"name":"Mists of Pandaria Classic Discussion","parent_category_id":3},{"id":5,"name":"Season of Discovery","parent_category_id":3},{"id":6,"name":"WoW Classic Hardcore","parent_category_id":3},{"id":7,"name":"In Development"},{"id":8,"name":"Burning Crusade Classic PTR","parent_category_id":7}]}
""");
var map = categories.GetProperty("categories").EnumerateArray().ToDictionary(c => c.GetProperty("id").GetInt32());
var method = typeof(BlueTrackerController).GetMethod("Matches", BindingFlags.NonPublic | BindingFlags.Static)!;
var checks = 0;
void Check(bool condition, string message) { if (!condition) throw new Exception(message); checks++; }
bool Matches(int id, string title, bool classic) => (bool)method.Invoke(null, [map, id, title, classic])!;
Check(Matches(4, "Hotfixes", true), "MoP category must match Classic");
Check(!Matches(4, "Hotfixes", false), "MoP must not appear in Retail");
Check(!Matches(5, "Hotfixes", true), "Season of Discovery must not appear in MoP");
Check(!Matches(6, "Hotfixes", true), "Hardcore must not appear in MoP");
Check(!Matches(8, "PTR notes", false), "Classic PTR must not appear in Retail");
Check(Matches(2, "Mists of Pandaria Hotfixes", true), "MoP titles in shared categories must match");
Check(!Matches(2, "Mists of Pandaria Hotfixes", false), "Shared MoP titles must not appear in Retail");
Check(Matches(2, "Retail hotfixes", false), "Retail general discussion must match");
Check(!Matches(999, "Hotfixes", false), "Unknown categories must not default to Retail");
Check(!Matches(2, "WoW Classic Hardcore", false), "Classic titles in shared categories must not appear in Retail");
using var cache = new MemoryCache(new MemoryCacheOptions());
var factory = new FakeFactory(categories.GetRawText());
var controller = new BlueTrackerController(factory, cache, NullLogger<BlueTrackerController>.Instance) { ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() } };
var result = await controller.List("us") as OkObjectResult;
Check(result != null, "Tracker should return JSON");
Check(factory.Paths.Any(p => p.Contains("before_post_id=100")), "Tracker must use post-ID cursor");
Check((await controller.List("invalid")) is BadRequestObjectResult, "Reject unsupported regions");
Check((await controller.Post("us", 1)) is NotFoundResult, "Reject non-Blizzard authors");
Check((await controller.Post("us", 2)) is OkObjectResult, "Render a Blizzard post for the current flavor");
controller.HttpContext.Request.Headers[GameFlavorRequest.HeaderName] = "retail";
Check((await controller.Post("us", 2)) is NotFoundResult, "Reject post detail from the other flavor");
var count = factory.Paths.Count;
await controller.Post("us", 2);
Check(factory.Paths.Count == count, "Repeated requests must use cached upstream responses");
Console.WriteLine($"Passed {checks} blue tracker checks.");

class FakeFactory(string categories) : IHttpClientFactory
{
    public List<string> Paths { get; } = [];
    public HttpClient CreateClient(string name) => new(new Handler(categories, Paths));
    class Handler(string categories, List<string> paths) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token)
        {
            var path = request.RequestUri!.PathAndQuery; paths.Add(path);
            var json = path.EndsWith("site.json") ? categories : path.Contains("/posts/2.json") ? """{"primary_group_name":"community-manager","name":"Blizzard Author","topic_id":10,"post_number":2,"cooked":"<p>Hotfix</p>"}""" : path.Contains("/t/10.json") ? """{"title":"MoP Hotfixes","category_id":4}""" : path.Contains("/posts/1.json") ? """{"primary_group_name":"users"}""" : path.Contains("before_post_id") ? """{"posts":[]}""" : """{"posts":[{"id":100,"category_id":4,"topic_title":"MoP news","topic_id":10,"post_number":1,"created_at":"2026-10-01T00:00:00Z"}]}""";
            return Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.OK) { Content = new StringContent(json) });
        }
    }
}
