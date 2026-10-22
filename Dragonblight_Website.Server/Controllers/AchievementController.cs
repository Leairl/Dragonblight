using System.Text.Json.Serialization;
using ArgentPonyWarcraftClient;
using Microsoft.AspNetCore.Mvc;

namespace Dragonblight_Website.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AchievementController : ControllerBase
    {
        private readonly ILogger<AchievementController> _logger;
        private readonly IWarcraftRedisProxy _warcraftCachedData; //underscore is syntax to global variable


        public AchievementController(ILogger<AchievementController> logger, IWarcraftRedisProxy warcraftCachedData)
        {
            _logger = logger;
            _warcraftCachedData = warcraftCachedData; //dependency injection to IWarcraftRedisProxy cs file
        }
        /* 
        "dynamic-classic-us" is static name for region in us, need to find other static region names in developer.battle.net
        */
        [HttpGet("GetCharacterAchievements")]
        public async Task<ActionResult<CharacterAchievementsSummary>> GetCharacterAchievements(string server, string characterName, string region)
        {
            try
            {
                var result = await _warcraftCachedData.GetCharacterAchievements(server.ToLower(), characterName.ToLower(), region, HttpContext.GetGameFlavor());
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching character achievements.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }
        //the character's best PvP title from each season, newest first
        [HttpGet("GetHighestSeasonalAchievements")]
        public async Task<ActionResult<List<SeasonalAchievement>>> GetHighestSeasonalAchievements(string server, string characterName, string region)
        {
            try
            {
                //finds the highest title achieved in a season
                var flavor = HttpContext.GetGameFlavor();
                var AchievementSummary = await _warcraftCachedData.GetCharacterAchievements(server.ToLower(), characterName.ToLower(), region, flavor);
                var highestTier = (AchievementSummary?.Achievements ?? [])
                    .Where(achieve => achieve.CompletedTimestamp != null)
                    .Select(achieve => (achieve, title: PvpTitles.SeasonalTitles(achieve.Achievement?.Name)))
                    .Where(x => x.title != null)
                    .GroupBy(x => x.title!.Value.season)
                    .Select(season => season.OrderByDescending(x => x.title!.Value.tier).First())
                    .OrderByDescending(x => x.achieve.CompletedTimestamp);

                var result = new List<SeasonalAchievement>();
                foreach (var (achieve, title) in highestTier)
                {
                    result.Add(new SeasonalAchievement
                    {
                        Id = achieve.Id,
                        Name = achieve.Achievement.Name,
                        Tier = title!.Value.tier.ToString(),
                        Season = title.Value.season,
                    });
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching seasonal achievements.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }
       [HttpGet("GetCountofAllSeasonalAchievements")]
        public async Task<ActionResult<List<TierAchievements>>> GetCountofAllSeasonalAchievements(string server, string characterName, string region)
        {
            try
            {
                //finds the highest title achieved in a season
                var flavor = HttpContext.GetGameFlavor();
                var AchievementSummary = await _warcraftCachedData.GetCharacterAchievements(server.ToLower(), characterName.ToLower(), region, flavor);
                var achievesPerTier = (AchievementSummary?.Achievements ?? [])
                    .Where(achieve => achieve.CompletedTimestamp != null)
                    .Select(achieve => (achieve, title: PvpTitles.SeasonalTitles(achieve.Achievement?.Name)))
                    .Where(x => x.title != null)
                    .OrderByDescending(x => x.achieve.CompletedTimestamp)
                    //this is for tbc achieves (when achievements were released in 2008)
                    .ThenByDescending(x => x.achieve.Id)
                    .GroupBy(x => x.title!.Value.tier)
                    .Select(tier => new {tier = tier.Key, achievements = tier.Select((a,b) => (a.achieve, a.title!.Value.season))});

                var result = new List<TierAchievements>();
                foreach (var ta in achievesPerTier)
                {
                    result.Add( new TierAchievements
                    {
                        Tier = ta.tier.ToString(),
                        Achievements = ta.achievements.Select(a => new SeasonalAchievement
                        {
                        Id = a.achieve.Id,
                        Name = a.achieve.Achievement.Name,
                        Tier = ta.tier.ToString(),
                        Season = a.season,
                        }).ToList(),
                    });
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching seasonal achievements.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

    }
    public class SeasonalAchievement

    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("tier")]
        public string? Tier { get; set; }

        [JsonPropertyName("season")]
        public string? Season { get; set; }
    }
    public class TierAchievements

    {
        [JsonPropertyName("tier")]
        public string? Tier { get; set; }

        [JsonPropertyName("achievements")]
        public List<SeasonalAchievement>? Achievements { get; set; }

    }
}
