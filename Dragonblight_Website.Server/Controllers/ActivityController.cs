using System.Text.Json.Serialization;
using ArgentPonyWarcraftClient;
using Microsoft.AspNetCore.Mvc;

namespace Dragonblight_Website.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ActivityController : ControllerBase
    {
        private readonly ILogger<ActivityController> _logger;
        private readonly IWarcraftRedisProxy _warcraftCachedData; //underscore is syntax to global variable
        private static string SyncedSpec(PlayerActivity activity, string currentSpec)
        {
            if (string.IsNullOrEmpty(activity.Spec))
            {
                return currentSpec;
            }
            return activity.Spec;
        }

        public ActivityController(ILogger<ActivityController> logger, IWarcraftRedisProxy warcraftCachedData)
        {
            _logger = logger;
            _warcraftCachedData = warcraftCachedData; //dependency injection to IWarcraftRedisProxy cs file
        }
        /* 
        "dynamic-classic-us" is static name for region in us, need to find other static region names in developer.battle.net
        */
        [HttpGet("LadderHistory")]
        public async Task<ActionResult<List<ActivityCharacterSummary>>> GetLadderHistory(string bracket, string region, int skip, int take)
        {
            try
            {
                var fullLeaderboard = await _warcraftCachedData.GetBracketActivityPage(bracket, region, HttpContext.GetGameFlavor());
                var firstHundredPlayers = fullLeaderboard.Where(l => l != null).Select(l => l!).OrderBy(d => DateTime.Now.Subtract(d.NewPlayer.Time).Hours).ThenBy(r => r.NewPlayer.Rank).Skip(skip).Take(take);
                var LeaderboardEntry = firstHundredPlayers.Select(async p =>
                {
                    var ProfileSummaryEntry = await _warcraftCachedData.GetCharSummary(p.NewPlayer.Character.Realm.Slug, p.NewPlayer.Character.Name, region, HttpContext.GetGameFlavor());
                    var specName = await _warcraftCachedData.GetCharacterSpecName(p.NewPlayer.Character.Realm.Slug, p.NewPlayer.Character.Name, region, HttpContext.GetGameFlavor());
                    return new ActivityCharacterSummary
                    {
                        PrevPvpEntry = p.OldPlayer,
                        CurrPvpEntry = p.NewPlayer,
                        TimeDifference = p.NewPlayer.Time.TimeAgo(),
                        CharSummary = ProfileSummaryEntry,
                        spec = SyncedSpec(p, specName)
                    };
                });
                var result = await Task.WhenAll(LeaderboardEntry);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching ladder history.");
                return StatusCode(500, "An error occurred while processing your request.");
            }

        }
        [HttpPost("LadderHistoryFiltered")]
        public async Task<ActionResult<List<ActivityCharacterSummary>>> GetLadderHistoryFiltered(string bracket, string region, List<string> classes, int skip, int take)
        {
            try
            {
                List<ActivityCharacterSummary> result = [];
                List<PlayerActivity?> filteredLadder = [];
                foreach (var charClass in classes)
                {
                    var fullLeaderboard = await _warcraftCachedData.GetBracketClassFilteredActivityPage(bracket, region, charClass, HttpContext.GetGameFlavor());
                    filteredLadder.AddRange(fullLeaderboard);
                }
                filteredLadder = filteredLadder.Where(p => p?.NewPlayer != null).OrderBy(r => r?.NewPlayer?.Rank).Skip(skip).Take(take).ToList();
                //going through the list of all selected filters, connects our leaderboardentries to our profilesummary, and combines the players
                var LadderLeaderboardEntries = filteredLadder.Where(l => l != null).Select(l => l!).Select(async ladderEntry =>
                {
                    var ProfileSummaryEntry = await _warcraftCachedData.GetCharSummary(ladderEntry.NewPlayer.Character.Realm.Slug, ladderEntry.NewPlayer.Character.Name, region, HttpContext.GetGameFlavor());
                    var specName = await _warcraftCachedData.GetCharacterSpecName(ladderEntry.NewPlayer.Character.Realm.Slug, ladderEntry.NewPlayer.Character.Name, region, HttpContext.GetGameFlavor());
                    return new ActivityCharacterSummary
                    {
                        // 2 properties pulled from class below (rbgEntry is pulling all leaderboad data & ProfileSummaryEntry is pulling CharacterSummary data)
                        PrevPvpEntry = ladderEntry.OldPlayer,
                        CurrPvpEntry = ladderEntry.NewPlayer,
                        TimeDifference = ladderEntry.NewPlayer.Time.TimeAgo(),
                        CharSummary = ProfileSummaryEntry,
                        spec = SyncedSpec(ladderEntry, specName)
                    };
                });
                result = result.Concat(await Task.WhenAll(LadderLeaderboardEntries)).ToList();
                //displays correct ranking and returns all selected classes we want to filter
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching filtered ladder history.");
                return StatusCode(500, "An error occurred while processing your request.");
            }

        }
        public class ActivityCharacterSummary
        {
            [JsonPropertyName("time")]
            public required string TimeDifference { get; init; }

            [JsonPropertyName("currPvpEntry")]
            public required PvpLeaderboardEntryandTime CurrPvpEntry { get; init; }

            [JsonPropertyName("prevPvpEntry")]
            public required PvpLeaderboardEntryandTime PrevPvpEntry { get; init; }

            [JsonPropertyName("charSummary")]
            public required CharacterProfileSummary CharSummary { get; set; }

            [JsonPropertyName("spec")]
            public required string spec { get; set; }
        }
    }
}