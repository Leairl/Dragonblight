using System.Security.Cryptography.X509Certificates;
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

        [HttpGet("SpecStatistics")]
        public async Task<ActionResult<List<SpecRatingCounts>>> GetSpecStatistics(string region, string bracket)
        {
            try
            {
                //any Shuffle or Blitz bracket, e.g. "blitz-overall", counts that mode's spec ladders
                var ladder = bracket.Split('-')[0];
                if (ladder == "shuffle" || ladder == "blitz")
                {
                    return Ok(await _warcraftCachedData.GetSoloSpecStats(ladder, region, HttpContext.GetGameFlavor()));
                }
                return Ok(await _warcraftCachedData.GetClassSpecStats(bracket, region, HttpContext.GetGameFlavor()));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while getting spec stats.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("Compositions")]
        public async Task<ActionResult<List<CompositionCounts>>> GetCompositions(string region, string bracket)
        {
            try
            {
                return Ok(await _warcraftCachedData.GetCompositions(bracket, region, HttpContext.GetGameFlavor()));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while getting compositions.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }
    }
}