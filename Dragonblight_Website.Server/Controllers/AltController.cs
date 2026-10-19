using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;

namespace Dragonblight_Website.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AltController : ControllerBase
    {
        private readonly ILogger<AltController> _logger;
        private readonly IWarcraftRedisProxy _warcraftCachedData; //underscore is syntax to global variable

        public AltController(ILogger<AltController> logger, IWarcraftRedisProxy warcraftCachedData)
        {
            _logger = logger;
            _warcraftCachedData = warcraftCachedData;
        }

        [HttpGet("GetAlts")]
        public async Task<ActionResult<List<GetAltsResponse>>> GetAlts(string server, string characterName, string region)
        {
            try
            {
                //flavor comes from the X-Game-Flavor header like every other endpoint
                var flavor = HttpContext.GetGameFlavor();
                server = server.ToLower();
                characterName = characterName.ToLower();
                //the account's other characters, as "charactername,server"
                var altInfo = await _warcraftCachedData.GetAlts(server, characterName, region, flavor);
                var alts = new List<GetAltsResponse>();
                foreach (var alt in altInfo)
                {
                    var altName = alt.Name.ToLower();
                    var altServer = alt.Realm;
                    //class and spec come out of the summary caches the profile pages already fill
                    var summary = await _warcraftCachedData.GetCharSummary(altServer, altName, region, flavor);
                    if (summary == null || summary.Id != alt.Id)
                    {
                        continue;
                    }
                    var ratings = new Dictionary<string, int>();
                    foreach (var bracket in flavor.Brackets())
                    {
                        ratings[bracket] = await BracketRating(altServer, altName, bracket, region, flavor);
                    }
                    alts.Add(new GetAltsResponse
                    {
                        name = summary?.Name ?? altName,
                        realm = altServer,
                        classchar = summary?.CharacterClass?.Name,
                        spec = await _warcraftCachedData.GetCharacterSpecName(altServer, altName, region, flavor),
                        ratings = ratings,
                        previousNames = alt.PreviousNames
                    });
                }
                //a character with no alts is an empty list, not a missing character
                return Ok(alts);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching alt info for {CharacterName} in {Region}", characterName, region);
                return StatusCode(500, "Internal server error");
            }
        }

        //an unplayed bracket comes back as an empty statistics object, which reads as rating 0
        private async Task<int> BracketRating(string server, string characterName, string bracket, string region, GameFlavor flavor)
        {
            var stats = await _warcraftCachedData.GetPvpBracketRating(server, characterName, bracket, region, flavor);
            return stats?.Rating ?? 0;
        }
    }
    public class GetAltsResponse

    {
        [JsonPropertyName("name")]
        public string? name { get; set; }

        [JsonPropertyName("realm")]
        public string? realm { get; set; }

        [JsonPropertyName("classchar")]
        public string? classchar { get; set; }

        [JsonPropertyName("spec")]
        public string? spec { get; set; }

        [JsonPropertyName("ratings")]
        public Dictionary<string, int> ratings { get; set; } = [];

        [JsonPropertyName("previousNames")]
        public List<PreviousCharacterName> previousNames { get; set; } = [];
    }

}
