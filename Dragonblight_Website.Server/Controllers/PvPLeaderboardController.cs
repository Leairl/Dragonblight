using System.Security.Cryptography.X509Certificates;
using System.Text.Json.Serialization;
using ArgentPonyWarcraftClient;
using Microsoft.AspNetCore.Mvc;
using StackExchange.Redis;
using TwitchLib.Api.Helix.Models.ChannelPoints;

namespace Dragonblight_Website.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PvpLeaderboardController : ControllerBase
    {
        private readonly ILogger<PvpLeaderboardController> _logger;
        private readonly IWarcraftRedisProxy _warcraftCachedData; //underscore is syntax to global variable
        private readonly IConnectionMultiplexer _redis;


        public PvpLeaderboardController(ILogger<PvpLeaderboardController> logger, IWarcraftRedisProxy warcraftCachedData, IConnectionMultiplexer redis)
        {
            _logger = logger;
            _warcraftCachedData = warcraftCachedData; //dependency injection to IWarcraftRedisProxy cs file
            _redis = redis;
        }
        [HttpGet("GetSyncStatus")]
        public async Task<ActionResult<decimal>> GetSyncStatus(string region, string bracket)
        {
            try
            {
                //the sync writes the status under the flavor's prefix, like every other ladder key
                var syncStatus = await _redis.GetDatabase().StringGetAsync(HttpContext.GetGameFlavor().KeyPrefix() + bracket + region + "SyncStatus");
                if (syncStatus.IsNullOrEmpty)
                {
                    return Ok(0);
                }
                return Ok(decimal.Parse(syncStatus.ToString()));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the sync status.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        /* 
        "dynamic-classic-us" is static name for region in us, need to find other static region names in developer.battle.net
        */
        [HttpGet("Get3v3Ladder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> Get3v3Ladder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("3v3", region, HttpContext.GetGameFlavor()); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the 3v3 ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("Get2v2Ladder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> Get2v2Ladder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("2v2", region, HttpContext.GetGameFlavor()); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the 2v2 ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("Get5v5Ladder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> Get5v5Ladder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("5v5", region, HttpContext.GetGameFlavor()); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the 5v5 ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetRBGLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetRBGLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("rbg", region, HttpContext.GetGameFlavor()); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
                //needs to create a seperate instance of pvpseasonreward to implement our rank property
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the RBG ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }
       [HttpGet("GetShuffleLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle", region, GameFlavor.Retail); 
                ladder = ladder.OrderByDescending(l => l?.PvpEntry.Rating).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }
       [HttpGet("GetBlitzLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz", region, GameFlavor.Retail); 
                ladder = ladder.OrderByDescending(l => l?.PvpEntry.Rating).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }
        [HttpGet("GetShuffleWarriorFuryLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleWarriorFuryLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-warrior-fury", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Fury Warrior Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleDeathKnightBloodLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleDeathKnightBloodLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-deathknight-blood", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Blood Death Knight Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleDeathKnightFrostLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleDeathKnightFrostLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-deathknight-frost", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Frost Death Knight Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleDeathKnightUnholyLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleDeathKnightUnholyLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-deathknight-unholy", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Unholy Death Knight Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleDemonHunterDevourerLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleDemonHunterDevourerLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-demonhunter-devourer", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Devourer Demon Hunter Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleDemonHunterHavocLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleDemonHunterHavocLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-demonhunter-havoc", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Havoc Demon Hunter Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleDemonHunterVengeanceLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleDemonHunterVengeanceLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-demonhunter-vengeance", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Vengeance Demon Hunter Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleDruidBalanceLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleDruidBalanceLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-druid-balance", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Balance Druid Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleDruidFeralLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleDruidFeralLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-druid-feral", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Feral Druid Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleDruidGuardianLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleDruidGuardianLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-druid-guardian", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Guardian Druid Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleDruidRestorationLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleDruidRestorationLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-druid-restoration", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Restoration Druid Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleEvokerDevastationLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleEvokerDevastationLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-evoker-devastation", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Devastation Evoker Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleEvokerPreservationLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleEvokerPreservationLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-evoker-preservation", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Preservation Evoker Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleEvokerAugmentationLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleEvokerAugmentationLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-evoker-augmentation", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Augmentation Evoker Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleHunterBeastMasteryLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleHunterBeastMasteryLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-hunter-beastmastery", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Beast Mastery Hunter Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleHunterMarksmanshipLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleHunterMarksmanshipLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-hunter-marksmanship", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Marksmanship Hunter Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleHunterSurvivalLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleHunterSurvivalLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-hunter-survival", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Survival Hunter Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleMageArcaneLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleMageArcaneLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-mage-arcane", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Arcane Mage Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleMageFireLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleMageFireLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-mage-fire", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Fire Mage Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleMageFrostLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleMageFrostLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-mage-frost", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Frost Mage Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleMonkBrewmasterLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleMonkBrewmasterLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-monk-brewmaster", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Brewmaster Monk Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleMonkWindwalkerLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleMonkWindwalkerLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-monk-windwalker", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Windwalker Monk Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleMonkMistweaverLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleMonkMistweaverLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-monk-mistweaver", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Mistweaver Monk Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShufflePaladinHolyLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShufflePaladinHolyLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-paladin-holy", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Holy Paladin Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShufflePaladinProtectionLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShufflePaladinProtectionLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-paladin-protection", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Protection Paladin Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShufflePaladinRetributionLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShufflePaladinRetributionLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-paladin-retribution", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Retribution Paladin Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShufflePriestDisciplineLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShufflePriestDisciplineLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-priest-discipline", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Discipline Priest Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShufflePriestHolyLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShufflePriestHolyLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-priest-holy", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Holy Priest Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShufflePriestShadowLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShufflePriestShadowLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-priest-shadow", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Shadow Priest Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleRogueAssassinationLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleRogueAssassinationLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-rogue-assassination", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Assassination Rogue Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleRogueOutlawLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleRogueOutlawLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-rogue-outlaw", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Outlaw Rogue Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleRogueSubtletyLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleRogueSubtletyLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-rogue-subtlety", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Subtlety Rogue Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleShamanElementalLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleShamanElementalLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-shaman-elemental", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Elemental Shaman Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleShamanEnhancementLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleShamanEnhancementLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-shaman-enhancement", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Enhancement Shaman Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleShamanRestorationLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleShamanRestorationLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-shaman-restoration", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Restoration Shaman Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleWarlockAfflictionLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleWarlockAfflictionLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-warlock-affliction", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Affliction Warlock Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleWarlockDemonologyLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleWarlockDemonologyLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-warlock-demonology", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Demonology Warlock Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleWarlockDestructionLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleWarlockDestructionLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-warlock-destruction", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Destruction Warlock Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleWarriorArmsLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleWarriorArmsLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-warrior-arms", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Arms Warrior Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetShuffleWarriorProtectionLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetShuffleWarriorProtectionLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("shuffle-warrior-protection", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Protection Warrior Solo Shuffle ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzWarriorFuryLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzWarriorFuryLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-warrior-fury", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Fury Warrior Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzDeathKnightBloodLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzDeathKnightBloodLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-deathknight-blood", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Blood Death Knight Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzDeathKnightFrostLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzDeathKnightFrostLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-deathknight-frost", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Frost Death Knight Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzDeathKnightUnholyLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzDeathKnightUnholyLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-deathknight-unholy", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Unholy Death Knight Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzDemonHunterDevourerLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzDemonHunterDevourerLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-demonhunter-devourer", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Devourer Demon Hunter Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzDemonHunterHavocLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzDemonHunterHavocLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-demonhunter-havoc", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Havoc Demon Hunter Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzDemonHunterVengeanceLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzDemonHunterVengeanceLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-demonhunter-vengeance", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Vengeance Demon Hunter Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzDruidBalanceLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzDruidBalanceLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-druid-balance", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Balance Druid Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzDruidFeralLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzDruidFeralLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-druid-feral", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Feral Druid Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzDruidGuardianLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzDruidGuardianLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-druid-guardian", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Guardian Druid Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzDruidRestorationLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzDruidRestorationLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-druid-restoration", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Restoration Druid Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzEvokerDevastationLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzEvokerDevastationLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-evoker-devastation", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Devastation Evoker Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzEvokerPreservationLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzEvokerPreservationLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-evoker-preservation", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Preservation Evoker Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzEvokerAugmentationLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzEvokerAugmentationLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-evoker-augmentation", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Augmentation Evoker Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzHunterBeastMasteryLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzHunterBeastMasteryLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-hunter-beastmastery", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Beast Mastery Hunter Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzHunterMarksmanshipLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzHunterMarksmanshipLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-hunter-marksmanship", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Marksmanship Hunter Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzHunterSurvivalLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzHunterSurvivalLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-hunter-survival", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Survival Hunter Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzMageArcaneLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzMageArcaneLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-mage-arcane", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Arcane Mage Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzMageFireLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzMageFireLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-mage-fire", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Fire Mage Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzMageFrostLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzMageFrostLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-mage-frost", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Frost Mage Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzMonkBrewmasterLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzMonkBrewmasterLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-monk-brewmaster", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Brewmaster Monk Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzMonkWindwalkerLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzMonkWindwalkerLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-monk-windwalker", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Windwalker Monk Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzMonkMistweaverLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzMonkMistweaverLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-monk-mistweaver", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Mistweaver Monk Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzPaladinHolyLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzPaladinHolyLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-paladin-holy", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Holy Paladin Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzPaladinProtectionLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzPaladinProtectionLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-paladin-protection", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Protection Paladin Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzPaladinRetributionLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzPaladinRetributionLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-paladin-retribution", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Retribution Paladin Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzPriestDisciplineLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzPriestDisciplineLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-priest-discipline", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Discipline Priest Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzPriestHolyLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzPriestHolyLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-priest-holy", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Holy Priest Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzPriestShadowLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzPriestShadowLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-priest-shadow", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Shadow Priest Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzRogueAssassinationLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzRogueAssassinationLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-rogue-assassination", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Assassination Rogue Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzRogueOutlawLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzRogueOutlawLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-rogue-outlaw", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Outlaw Rogue Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzRogueSubtletyLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzRogueSubtletyLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-rogue-subtlety", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Subtlety Rogue Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzShamanElementalLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzShamanElementalLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-shaman-elemental", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Elemental Shaman Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzShamanEnhancementLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzShamanEnhancementLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-shaman-enhancement", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Enhancement Shaman Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzShamanRestorationLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzShamanRestorationLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-shaman-restoration", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Restoration Shaman Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzWarlockAfflictionLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzWarlockAfflictionLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-warlock-affliction", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Affliction Warlock Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzWarlockDemonologyLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzWarlockDemonologyLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-warlock-demonology", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Demonology Warlock Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzWarlockDestructionLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzWarlockDestructionLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-warlock-destruction", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Destruction Warlock Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzWarriorArmsLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzWarriorArmsLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-warrior-arms", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Arms Warrior Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetBlitzWarriorProtectionLadder")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetBlitzWarriorProtectionLadder(int skip, int take, string region)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries("blitz-warrior-protection", region, GameFlavor.Retail); 
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the Protection Warrior Blitz ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetSeasonStart")]
        public async Task<ActionResult<DateTimeOffset?>> GetSeasonStart(string region)
        {
            try
            {
                return Ok(await _warcraftCachedData.GetSeasonStart(region, HttpContext.GetGameFlavor()));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the season start.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetPvPRewards")]
        public async Task<ActionResult<IEnumerable<PvpSeasonRewardWithRank>>> GetPvPRewards(string region)
        {
            try
            {
                var pvpRewards = await _warcraftCachedData.GetPvPRewards(region, HttpContext.GetGameFlavor());
                if (pvpRewards != null && pvpRewards.Rewards != null && pvpRewards.Rewards.Any())
                {
                    var pvpSeasonRewardWithRank = pvpRewards.Rewards.Select(async r =>
                    {
                        return new PvpSeasonRewardWithRank
                        {
                        Bracket = r.Bracket,
                        Achievement = r.Achievement,
                        RatingCutoff = r.RatingCutoff,
                        Faction = r.Faction,
                        Specialization = r.Specialization,
                        rank = await GetRankFromCutoffs(r.RatingCutoff, r.Bracket.Type, region, r.Specialization?.Id)
                        };
                    });
                    var result = await Task.WhenAll(pvpSeasonRewardWithRank);
                    return Ok(result);
                }
                return Ok(new List<PvpSeasonRewardWithRank>());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the PvP rewards.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }
        // generates an instance to compare data with (using record) as opposed to checking the instance of that class
        public record PvpSeasonRewardWithRank : PvpSeasonReward
            
        {
           [JsonPropertyName("rank")]
            public int rank { get; set; }
        }
        //Blizzard's playable-specialization id for Fury Warrior
        private const int FurySpecId = 72;
        //Blizzard's playable-specialization id for Blood Death Knight
        private const int DeathKnightBloodSpecId = 250;
        //Blizzard's playable-specialization id for Frost Death Knight
        private const int DeathKnightFrostSpecId = 251;
        //Blizzard's playable-specialization id for Unholy Death Knight
        private const int DeathKnightUnholySpecId = 252;
        //Blizzard's playable-specialization id for Devourer Demon Hunter
        private const int DemonHunterDevourerSpecId = 1480;
        //Blizzard's playable-specialization id for Havoc Demon Hunter
        private const int DemonHunterHavocSpecId = 577;
        //Blizzard's playable-specialization id for Vengeance Demon Hunter
        private const int DemonHunterVengeanceSpecId = 581;
        //Blizzard's playable-specialization id for Balance Druid
        private const int DruidBalanceSpecId = 102;
        //Blizzard's playable-specialization id for Feral Druid
        private const int DruidFeralSpecId = 103;
        //Blizzard's playable-specialization id for Guardian Druid
        private const int DruidGuardianSpecId = 104;
        //Blizzard's playable-specialization id for Restoration Druid
        private const int DruidRestorationSpecId = 105;
        //Blizzard's playable-specialization id for Devastation Evoker
        private const int EvokerDevastationSpecId = 1467;
        //Blizzard's playable-specialization id for Preservation Evoker
        private const int EvokerPreservationSpecId = 1468;
        //Blizzard's playable-specialization id for Augmentation Evoker
        private const int EvokerAugmentationSpecId = 1473;
        //Blizzard's playable-specialization id for Beast Mastery Hunter
        private const int HunterBeastMasterySpecId = 253;
        //Blizzard's playable-specialization id for Marksmanship Hunter
        private const int HunterMarksmanshipSpecId = 254;
        //Blizzard's playable-specialization id for Survival Hunter
        private const int HunterSurvivalSpecId = 255;
        //Blizzard's playable-specialization id for Arcane Mage
        private const int MageArcaneSpecId = 62;
        //Blizzard's playable-specialization id for Fire Mage
        private const int MageFireSpecId = 63;
        //Blizzard's playable-specialization id for Frost Mage
        private const int MageFrostSpecId = 64;
        //Blizzard's playable-specialization id for Brewmaster Monk
        private const int MonkBrewmasterSpecId = 268;
        //Blizzard's playable-specialization id for Windwalker Monk
        private const int MonkWindwalkerSpecId = 269;
        //Blizzard's playable-specialization id for Mistweaver Monk
        private const int MonkMistweaverSpecId = 270;
        //Blizzard's playable-specialization id for Holy Paladin
        private const int PaladinHolySpecId = 65;
        //Blizzard's playable-specialization id for Protection Paladin
        private const int PaladinProtectionSpecId = 66;
        //Blizzard's playable-specialization id for Retribution Paladin
        private const int PaladinRetributionSpecId = 70;
        //Blizzard's playable-specialization id for Discipline Priest
        private const int PriestDisciplineSpecId = 256;
        //Blizzard's playable-specialization id for Holy Priest
        private const int PriestHolySpecId = 257;
        //Blizzard's playable-specialization id for Shadow Priest
        private const int PriestShadowSpecId = 258;
        //Blizzard's playable-specialization id for Assassination Rogue
        private const int RogueAssassinationSpecId = 259;
        //Blizzard's playable-specialization id for Outlaw Rogue
        private const int RogueOutlawSpecId = 260;
        //Blizzard's playable-specialization id for Subtlety Rogue
        private const int RogueSubtletySpecId = 261;
        //Blizzard's playable-specialization id for Elemental Shaman
        private const int ShamanElementalSpecId = 262;
        //Blizzard's playable-specialization id for Enhancement Shaman
        private const int ShamanEnhancementSpecId = 263;
        //Blizzard's playable-specialization id for Restoration Shaman
        private const int ShamanRestorationSpecId = 264;
        //Blizzard's playable-specialization id for Affliction Warlock
        private const int WarlockAfflictionSpecId = 265;
        //Blizzard's playable-specialization id for Demonology Warlock
        private const int WarlockDemonologySpecId = 266;
        //Blizzard's playable-specialization id for Destruction Warlock
        private const int WarlockDestructionSpecId = 267;
        //Blizzard's playable-specialization id for Arms Warrior
        private const int WarriorArmsSpecId = 71;
        //Blizzard's playable-specialization id for Protection Warrior
        private const int WarriorProtectionSpecId = 73;

        [HttpGet("GetRankFromCutoffs")]
        public async Task<int> GetRankFromCutoffs(int cutoff, string bracket, string region, int? specId = null)
        {
            try
            {
                if (bracket == "ARENA_2v2")
                {
                    return (await _warcraftCachedData.Get2v2Leaderboard(region, HttpContext.GetGameFlavor())).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "ARENA_3v3")
                {
                    return (await _warcraftCachedData.Get3v3Leaderboard(region, HttpContext.GetGameFlavor())).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "ARENA_5v5")
                {
                    return (await _warcraftCachedData.Get5v5Leaderboard(region, HttpContext.GetGameFlavor())).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BATTLEGROUNDS")
                {
                    return (await _warcraftCachedData.GetRBGLeaderboard(region, HttpContext.GetGameFlavor())).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                //every spec has its own Solo Shuffle ladder and all their rewards say SHUFFLE, so the
                //reward's spec id picks the ladder. Specs without a ladder method yet rank as 0.
                if (bracket == "SHUFFLE" && specId == FurySpecId)
                {
                    return (await _warcraftCachedData.GetShuffleWarriorFuryLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == DeathKnightBloodSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleDeathKnightBloodLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == DeathKnightFrostSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleDeathKnightFrostLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == DeathKnightUnholySpecId)
                {
                    return (await _warcraftCachedData.GetShuffleDeathKnightUnholyLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == DemonHunterDevourerSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleDemonHunterDevourerLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == DemonHunterHavocSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleDemonHunterHavocLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == DemonHunterVengeanceSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleDemonHunterVengeanceLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == DruidBalanceSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleDruidBalanceLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == DruidFeralSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleDruidFeralLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == DruidGuardianSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleDruidGuardianLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == DruidRestorationSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleDruidRestorationLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == EvokerDevastationSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleEvokerDevastationLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == EvokerPreservationSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleEvokerPreservationLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == EvokerAugmentationSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleEvokerAugmentationLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == HunterBeastMasterySpecId)
                {
                    return (await _warcraftCachedData.GetShuffleHunterBeastMasteryLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == HunterMarksmanshipSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleHunterMarksmanshipLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == HunterSurvivalSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleHunterSurvivalLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == MageArcaneSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleMageArcaneLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == MageFireSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleMageFireLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == MageFrostSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleMageFrostLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == MonkBrewmasterSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleMonkBrewmasterLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == MonkWindwalkerSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleMonkWindwalkerLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == MonkMistweaverSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleMonkMistweaverLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == PaladinHolySpecId)
                {
                    return (await _warcraftCachedData.GetShufflePaladinHolyLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == PaladinProtectionSpecId)
                {
                    return (await _warcraftCachedData.GetShufflePaladinProtectionLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == PaladinRetributionSpecId)
                {
                    return (await _warcraftCachedData.GetShufflePaladinRetributionLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == PriestDisciplineSpecId)
                {
                    return (await _warcraftCachedData.GetShufflePriestDisciplineLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == PriestHolySpecId)
                {
                    return (await _warcraftCachedData.GetShufflePriestHolyLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == PriestShadowSpecId)
                {
                    return (await _warcraftCachedData.GetShufflePriestShadowLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == RogueAssassinationSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleRogueAssassinationLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == RogueOutlawSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleRogueOutlawLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == RogueSubtletySpecId)
                {
                    return (await _warcraftCachedData.GetShuffleRogueSubtletyLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == ShamanElementalSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleShamanElementalLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == ShamanEnhancementSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleShamanEnhancementLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == ShamanRestorationSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleShamanRestorationLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == WarlockAfflictionSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleWarlockAfflictionLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == WarlockDemonologySpecId)
                {
                    return (await _warcraftCachedData.GetShuffleWarlockDemonologyLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == WarlockDestructionSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleWarlockDestructionLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == WarriorArmsSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleWarriorArmsLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "SHUFFLE" && specId == WarriorProtectionSpecId)
                {
                    return (await _warcraftCachedData.GetShuffleWarriorProtectionLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                //Blitz is per spec too; its rewards name the spec the same way, so the Shuffle spec ids apply
                if (bracket == "BLITZ" && specId == FurySpecId)
                {
                    return (await _warcraftCachedData.GetBlitzWarriorFuryLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == DeathKnightBloodSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzDeathKnightBloodLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == DeathKnightFrostSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzDeathKnightFrostLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == DeathKnightUnholySpecId)
                {
                    return (await _warcraftCachedData.GetBlitzDeathKnightUnholyLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == DemonHunterDevourerSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzDemonHunterDevourerLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == DemonHunterHavocSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzDemonHunterHavocLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == DemonHunterVengeanceSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzDemonHunterVengeanceLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == DruidBalanceSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzDruidBalanceLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == DruidFeralSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzDruidFeralLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == DruidGuardianSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzDruidGuardianLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == DruidRestorationSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzDruidRestorationLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == EvokerDevastationSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzEvokerDevastationLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == EvokerPreservationSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzEvokerPreservationLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == EvokerAugmentationSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzEvokerAugmentationLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == HunterBeastMasterySpecId)
                {
                    return (await _warcraftCachedData.GetBlitzHunterBeastMasteryLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == HunterMarksmanshipSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzHunterMarksmanshipLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == HunterSurvivalSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzHunterSurvivalLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == MageArcaneSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzMageArcaneLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == MageFireSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzMageFireLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == MageFrostSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzMageFrostLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == MonkBrewmasterSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzMonkBrewmasterLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == MonkWindwalkerSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzMonkWindwalkerLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == MonkMistweaverSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzMonkMistweaverLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == PaladinHolySpecId)
                {
                    return (await _warcraftCachedData.GetBlitzPaladinHolyLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == PaladinProtectionSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzPaladinProtectionLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == PaladinRetributionSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzPaladinRetributionLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == PriestDisciplineSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzPriestDisciplineLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == PriestHolySpecId)
                {
                    return (await _warcraftCachedData.GetBlitzPriestHolyLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == PriestShadowSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzPriestShadowLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == RogueAssassinationSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzRogueAssassinationLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == RogueOutlawSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzRogueOutlawLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == RogueSubtletySpecId)
                {
                    return (await _warcraftCachedData.GetBlitzRogueSubtletyLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == ShamanElementalSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzShamanElementalLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == ShamanEnhancementSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzShamanEnhancementLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == ShamanRestorationSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzShamanRestorationLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == WarlockAfflictionSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzWarlockAfflictionLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == WarlockDemonologySpecId)
                {
                    return (await _warcraftCachedData.GetBlitzWarlockDemonologyLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == WarlockDestructionSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzWarlockDestructionLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == WarriorArmsSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzWarriorArmsLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                if (bracket == "BLITZ" && specId == WarriorProtectionSpecId)
                {
                    return (await _warcraftCachedData.GetBlitzWarriorProtectionLeaderboard(region)).Entries.Where(p => p.Rating >= cutoff).Last().Rank;
                }
                return 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the rank from cutoffs.");
                return 0;
            }
        }

        [HttpPost("GetLadderFiltered")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetLadderFiltered(int skip, int take, string region, List<string> classes, string bracket)
        // foreach allows us to select multiple classes on our leaderboard
        {
            try
            {
                List<PvpCharacterSummary> result = [];
                List<PvpLeaderboardEntry?> filteredLadder = [];
                foreach (var charClass in classes)
                {
                    var fullLeaderboard = await _warcraftCachedData.CachedClassCharacters(region, charClass, bracket, HttpContext.GetGameFlavor());
                    filteredLadder.AddRange(fullLeaderboard);
                }
                filteredLadder = filteredLadder.OrderBy(r => r?.Rank).Skip(skip).Take(take).ToList();
                //going through the list of all selected filters, connects our leaderboardentries to our profilesummary, and combines the players
                var LadderLeaderboardEntries = filteredLadder.Where(p => p != null).Select(p => p!).Select(async ladderEntry =>
                {
                    var ProfileSummaryEntries = await _warcraftCachedData.GetCharSummary(ladderEntry.Character.Realm.Slug, ladderEntry.Character.Name, region, HttpContext.GetGameFlavor());
                    var specName = await _warcraftCachedData.GetCharacterSpecName(ladderEntry.Character.Realm.Slug, ladderEntry.Character.Name, region, HttpContext.GetGameFlavor());
                    return new PvpCharacterSummary
                    {
                        // 3 properties pulled from class below (rbgEntry is pulling all leaderboad data & ProfileSummaryEntry is pulling CharacterSummary data)
                        PvpEntry = ladderEntry,
                        charSummary = ProfileSummaryEntries,
                        spec = specName
                    };
                });
                result = result.Concat(await Task.WhenAll(LadderLeaderboardEntries)).ToList();
                //displays correct ranking and returns all selected classes we want to filter
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the filtered ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }
        public class PvpCharacterSummary
        {
            [JsonPropertyName("pvpEntry")]
            public required PvpLeaderboardEntry PvpEntry { get; init; }

            [JsonPropertyName("charSummary")]
            public required CharacterProfileSummary charSummary { get; init; }
            
            [JsonPropertyName("spec")]
            public required string spec { get; init; }
        }
    }
}
