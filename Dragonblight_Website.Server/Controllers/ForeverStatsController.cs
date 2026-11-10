using Microsoft.AspNetCore.Mvc;

namespace Dragonblight_Website.Server.Controllers
{
    //The WoW: Forever stats page. ForeverStatsJob builds the summary in the background; this
    //only reads it, so the page never waits on Blizzard.
    [ApiController]
    [Route("api/[controller]")]
    public class ForeverStatsController : ControllerBase
    {
        private readonly ILogger<ForeverStatsController> _logger;
        private readonly IWarcraftRedisProxy _warcraftCachedData;

        public ForeverStatsController(ILogger<ForeverStatsController> logger, IWarcraftRedisProxy warcraftCachedData)
        {
            _logger = logger;
            _warcraftCachedData = warcraftCachedData;
        }

        //an empty summary, with no UpdatedAt, until the job's first run finishes
        [HttpGet("GetStats")]
        public async Task<ActionResult<ForeverStatsSummary>> GetStats()
        {
            try
            {
                var summary = await _warcraftCachedData.GetForeverStatsSummary();
                if (summary == null)
                {
                    summary = new ForeverStatsSummary();
                }
                return Ok(summary);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while getting the Forever stats summary.");
                return StatusCode(500);
            }
        }
    }
}
