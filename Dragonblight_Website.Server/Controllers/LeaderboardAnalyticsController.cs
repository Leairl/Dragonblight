using System.Security.Cryptography.X509Certificates;
using System.Text.Json.Serialization;
using ArgentPonyWarcraftClient;
using Microsoft.AspNetCore.Mvc;
using TwitchLib.Api.Helix.Models.ChannelPoints;

namespace Dragonblight_Website.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LeaderboardAnalyticsController : ControllerBase
    {
        private readonly ILogger<LeaderboardAnalyticsController> _logger;
        private readonly IWarcraftRedisProxy _warcraftCachedData; //underscore is syntax to global variable


        public LeaderboardAnalyticsController(ILogger<LeaderboardAnalyticsController> logger, IWarcraftRedisProxy warcraftCachedData)
        {
            _logger = logger;
            _warcraftCachedData = warcraftCachedData; //dependency injection to IWarcraftRedisProxy cs file
        }

[HttpPost("ClassStatisticsForLeaderboard")]
        public async Task<ActionResult<IEnumerable<ClassAnalytics>>> GetLeaderboardAnalytics( string region, string bracket)
        // foreach allows us to select multiple classes on our leaderboard
        
        {
            try{
            List<string> classes = ["Warrior", "Paladin", "Hunter", "Rogue", "Priest", "Death Knight", "Shaman", "Mage", "Warlock", "Druid", "Monk"];
            List<ClassAnalytics?> result = [];
            foreach (var charClass in classes) {
                var classLeaderboard = await _warcraftCachedData.CachedClassCharacters(region, charClass, bracket, HttpContext.GetGameFlavor());
                result.Add(new ClassAnalytics {
                    className = charClass,
                    PvpEntries = classLeaderboard.ToArray()
                });   
            }
            return Ok(result);
        }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while getting class stats.");
                return StatusCode(500, "An error occurred while processing your request.");
            }

        }
        public class ClassAnalytics
        {
            [JsonPropertyName("PvpEntries")]
            public required PvpLeaderboardEntry?[] PvpEntries { get; init; }

            [JsonPropertyName("className")]
            public required string className { get; init; }
        }
    }
}