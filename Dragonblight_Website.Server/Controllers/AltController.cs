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
                var ladderBrackets = await _warcraftCachedData.GetLadderBrackets(region, flavor);
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
                    var specBrackets = ladderBrackets.Where(b => b.SpecName != null && b.ClassName == summary.CharacterClass?.Name);
                    var soloRatings = new List<SoloRating>();
                    foreach (var specBracket in specBrackets)
                    {
                        var rating = await BracketRating(altServer, altName, specBracket.Slug, region, flavor);
                        if (rating > 0)
                        {
                            soloRatings.Add(new SoloRating
                            {
                                slug = specBracket.Slug,
                                ladder = specBracket.Ladder,
                                className = specBracket.ClassName ?? "",
                                specName = specBracket.SpecName ?? "",
                                specId = specBracket.SpecId ?? 0,
                                rating = rating
                            });
                        }
                    }
                    alts.Add(new GetAltsResponse
                    {
                        Name = summary?.Name ?? altName,
                        Realm = altServer,
                        Classchar = summary?.CharacterClass?.Name,
                        Spec = await _warcraftCachedData.GetCharacterSpecName(altServer, altName, region, flavor),
                        Ratings = ratings,
                        SoloRatings = soloRatings,
                        PreviousNames = alt.PreviousNames
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
        public string? Name { get; set; }

        [JsonPropertyName("realm")]
        public string? Realm { get; set; }

        [JsonPropertyName("classchar")]
        public string? Classchar { get; set; }

        [JsonPropertyName("spec")]
        public string? Spec { get; set; }
        

        [JsonPropertyName("ratings")]
        public Dictionary<string, int> Ratings { get; set; } = [];


        [JsonPropertyName("soloRatings")]
        public List<SoloRating> SoloRatings { get; set; } = [];

        [JsonPropertyName("previousNames")]
        public List<PreviousCharacterName> PreviousNames { get; set; } = [];
    }
    //one Shuffle or Blitz spec the alt has played
    public class SoloRating
    {
        [JsonPropertyName("slug")]
        public string slug { get; set; } = "";
        [JsonPropertyName("ladder")]
        public string ladder { get; set; } = "";
        [JsonPropertyName("className")]
        public string className { get; set; } = "";
        [JsonPropertyName("specName")]
        public string specName { get; set; } = "";
        [JsonPropertyName("specId")]
        public int specId { get; set; }
        [JsonPropertyName("rating")]
        public int rating { get; set; }
    }
}
