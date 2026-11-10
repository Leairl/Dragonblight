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

        private readonly RatingHistoryService _ratingHistory;

        public PvpStatController(ILogger<PvpStatController> logger, IWarcraftRedisProxy warcraftCachedData, RatingHistoryService ratingHistory)
        {
            _logger = logger;
            _warcraftCachedData = warcraftCachedData; //dependency injection to IWarcraftRedisProxy cs file
            _ratingHistory = ratingHistory;
        }
        //finds the rows in the rating history table for a character, and returns them as a list of ratings.
        [HttpGet("GetRatingHistory")]
        public async Task<ActionResult<List<RatingHistoryPoint>>> GetRatingHistory(string server, string characterName, string region, string bracketType, int? specId)
        {
            try
            {
                var flavor = HttpContext.GetGameFlavor();
                var profile = await _warcraftCachedData.GetCharSummary(server.ToLower(), characterName.ToLower(), region, flavor);
                var ladder = await _warcraftCachedData.RewardLadder(bracketType, region, specId, flavor);
                var season = await _warcraftCachedData.GetSeason(region, flavor);
                return Ok(await _ratingHistory.GetRatingHistory(flavor, region, profile.Id, ladder, season));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching rating history.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        //the character's all-time highest arena ratings, keyed by bracket ("2v2", "3v3")
        [HttpGet("GetHighestRatings")]
        public async Task<ActionResult<Dictionary<string, int>>> GetHighestRatings(string server, string characterName, string region)
        {
            try
            {
                return Ok(await _warcraftCachedData.GetHighestRatings(server.ToLower(), characterName.ToLower(), region, HttpContext.GetGameFlavor()));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching highest ratings.");
                return Ok(new Dictionary<string, int>());
            }
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
                var flavor = HttpContext.GetGameFlavor();
                var Brackets = flavor.Brackets();
                var Season = await _warcraftCachedData.GetSeason(region, flavor);
                List<CharacterPvpBracketStatistics> results = new List<CharacterPvpBracketStatistics>();
                //every bracket is asked for at once rather than one after another; WhenAll keeps them in
                //the order asked, which is the order the cards are labelled by
                var bracketRatings = await Task.WhenAll(Brackets.Select(bracket =>
                    _warcraftCachedData.GetPvpBracketRating(server.ToLower(), characterName.ToLower(), bracket, region, flavor)));
                foreach (var fetchedBracketRating in bracketRatings)
                {
                    var BracketRating = fetchedBracketRating;
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
                if (flavor == GameFlavor.Retail)
                {
                    var profile = await _warcraftCachedData.GetCharSummary(server.ToLower(), characterName.ToLower(), region, flavor);
                    var ladderBrackets = await _warcraftCachedData.GetLadderBrackets(region, flavor);
                    var specBrackets = ladderBrackets.Where(b => b.SpecName != null && b.ClassName == profile?.CharacterClass?.Name).ToList();
                    //a class has a Shuffle and a Blitz ladder per spec, up to 8 calls, so these run at once too
                    var specRatings = await Task.WhenAll(specBrackets.Select(specBracket =>
                        _warcraftCachedData.GetPvpBracketRating(server.ToLower(), characterName.ToLower(), specBracket.Slug, region, flavor)));
                    foreach (var (specBracket, fetchedRating) in specBrackets.Zip(specRatings))
                    {
                        var specRating = fetchedRating;
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