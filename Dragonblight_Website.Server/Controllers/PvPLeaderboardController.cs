using System.Security.Cryptography.X509Certificates;
using System.Text.Json.Serialization;
using ArgentPonyWarcraftClient;
using Dragonblight_Website.Server.Helpers;
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

        [HttpGet("GetPlayableClasses")]
        public async Task<ActionResult<List<WowClass>>> GetPlayableClasses(string region)
    => Ok(await _warcraftCachedData.GetPlayableClasses(region, HttpContext.GetGameFlavor()));

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

        [HttpGet("GetLadders")]
        public async Task<ActionResult<IEnumerable<PvpCharacterSummary>>> GetLadders(int skip, int take, string region, string bracket)
        {
            try
            {
                var ladder = await _warcraftCachedData.GetPvpLeaderSummaries(bracket, region, HttpContext.GetGameFlavor());
                ladder = ladder.OrderBy(l => l?.PvpEntry.Rank).ToList();
                return Ok(ladder.Skip(skip).Take(take));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the " + bracket + " ladder.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetLeaderboardIndex")]
        public async Task<ActionResult<PvpLeaderboardsIndex>> GetLeaderboardIndex(string region)
        {
            try
            {
                var leaderboardIndex = await _warcraftCachedData.GetLeaderboardIndex(region, HttpContext.GetGameFlavor());
                return Ok(leaderboardIndex);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the leaderboard index.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetLadderBrackets")]
        public async Task<ActionResult<List<LadderBracket>>> GetLadderBrackets(string region)
        {
            try
            {
                var ladderBrackets = await _warcraftCachedData.GetLadderBrackets(region, HttpContext.GetGameFlavor());
                return Ok(ladderBrackets);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching the ladder brackets.");
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

        [HttpGet("GetRankFromCutoffs")]
        public async Task<int> GetRankFromCutoffs(int cutoff, string bracketType, string region, int? specId = null)
        {
            try
            {

                string bracket = bracketType.Replace("ARENA_", "").Replace("BATTLEGROUNDS", "rbg");
                if (bracketType == "SHUFFLE" || bracketType == "BLITZ")
                {
                    var getPlayableSpec = await _warcraftCachedData.PlayableSpecialization(specId ?? 0, region, HttpContext.GetGameFlavor());
                    bracket = LadderNames.ForSpec(LadderNames.BracketName(bracketType), getPlayableSpec?.PlayableClass?.Name, getPlayableSpec?.Name);

                }
                return (await _warcraftCachedData.GetLeaderboard(region, bracket, HttpContext.GetGameFlavor())).Entries.Last(p => p.Rating >= cutoff).Rank;
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
                //filters by class and sorts by rank after pulling all data from the pvpleaderboard from a specific bracket
                if (bracket.EndsWith("-overall"))
                {
                    var classNames = classes.Select(c => c.Split(':')[0]).ToHashSet();
                    var ladder = await _warcraftCachedData.GetPvpLeaderSummaries(bracket, region, HttpContext.GetGameFlavor());
                    return Ok(ladder
                        .Where(l => l?.charSummary?.CharacterClass?.Name != null && classNames.Contains(l.charSummary.CharacterClass.Name))
                        .OrderBy(l => l!.PvpEntry.Rank)
                        .Skip(skip).Take(take));
                }
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
