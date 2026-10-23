using ArgentPonyWarcraftClient;
using Microsoft.AspNetCore.Mvc;

namespace Dragonblight_Website.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PvpStatController : ControllerBase
    {
        private readonly ILogger<PvpStatController> _logger;
        private readonly IWarcraftRedisProxy _warcraftCachedData; //underscore is syntax to global variable


        public PvpStatController(ILogger<PvpStatController> logger, IWarcraftRedisProxy warcraftCachedData)
        {
            _logger = logger;
            _warcraftCachedData = warcraftCachedData; //dependency injection to IWarcraftRedisProxy cs file
        }
        /* 
        "dynamic-classic-us" is static name for region in us, need to find other static region names in developer.battle.net
        */
        [HttpGet("GetPvPCurrentRating")]
        public async Task<ActionResult<List<CharacterPvpBracketStatistics>>> GetPvPCurrentRating(string server, string characterName, string region)
        {
            try
            {
                //order matters: the client labels rating cards by position using the same list
                var Brackets = HttpContext.GetGameFlavor().Brackets();
                var Season = await _warcraftCachedData.GetSeason(region, HttpContext.GetGameFlavor());
                List<CharacterPvpBracketStatistics> results = new List<CharacterPvpBracketStatistics>();
                foreach (var PvPBracket in Brackets)
                {
                    var BracketRating = await _warcraftCachedData.GetPvpBracketRating(server.ToLower(), characterName.ToLower(), PvPBracket, region, HttpContext.GetGameFlavor());

                    if (Season == (BracketRating?.Season?.Id ?? 0) && BracketRating != null)
                    {
                        results.Add(BracketRating);
                    }
                    else
                    {
                        BracketRating = new CharacterPvpBracketStatistics
                        {
                            Bracket = new Bracket { Type = BracketRating?.Bracket.Type },
                            Rating = 0,
                            Season = new PvpSeasonReference
                            {
                                Id = Season
                            }
                        };
                        results.Add(BracketRating);
                    }
                }
                //Solo Shuffle keeps a rating per spec, so after the fixed brackets come the character's
                //class's spec brackets. They go last so the cards above keep their positions, and only
                //the ones the character has played are kept: an unplayed spec comes back null.
                if (HttpContext.GetGameFlavor() == GameFlavor.Retail)
                {
                    var flavor = HttpContext.GetGameFlavor();
                    var profile = await _warcraftCachedData.GetCharSummary(server.ToLower(), characterName.ToLower(), region, flavor);
                    var ladderBrackets = await _warcraftCachedData.GetLadderBrackets(region, flavor);
                    var specBrackets = ladderBrackets.Where(b => b.SpecName != null && b.ClassName == profile?.CharacterClass?.Name);
                    foreach (var specBracket in specBrackets)
                    {
                        var specRating = await _warcraftCachedData.GetPvpBracketRating(server.ToLower(), characterName.ToLower(), specBracket.Slug, region, flavor);
                        if (specRating?.Bracket == null)
                        {
                            specRating = new CharacterPvpBracketStatistics
                            {
                                Bracket = new Bracket { Type = specBracket.Ladder.ToUpperInvariant() },
                                Specialization = new PlayableSpecializationReference { Id = specBracket.SpecId ?? 0, Name = specBracket.SpecName },
                                Rating = 0,
                                Season = new PvpSeasonReference
                                {
                                    Id = Season
                                }
                            };
                        }
                        if (Season == (specRating?.Season?.Id ?? 0) && specRating != null)
                        {
                            results.Add(specRating);
                        }
                        else
                        {
                            specRating = new CharacterPvpBracketStatistics
                            {
                                Bracket = new Bracket { Type = specBracket.Ladder.ToUpperInvariant() },
                                Specialization = new PlayableSpecializationReference { Id = specBracket.SpecId ?? 0, Name = specBracket.SpecName },
                                Rating = 0,
                                Season = new PvpSeasonReference
                                {
                                    Id = Season
                                }
                            };
                            results.Add(specRating);
                        }
                    }
                }
                return Ok(results);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching PvP ratings.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }
        private static string BracketName(string? name) => (name ?? "").Replace(" ", "").ToLowerInvariant();
    }
}