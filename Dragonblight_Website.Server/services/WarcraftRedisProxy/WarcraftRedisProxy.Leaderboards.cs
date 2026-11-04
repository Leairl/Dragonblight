using System.Text.Json;
using ArgentPonyWarcraftClient;
using Dragonblight_Website.Server.Helpers;


//PvP ladders, seasons and rewards. The ladders and seasons come from Blizzard and are cached;
//ladder history is our own record, kept as Redis lists.
partial class WarcraftRedisProxy
{
    public async Task<PvpLeaderboard> GetLeaderboard(string region, string bracket, GameFlavor flavor)
    {
        var ns = GetDynamicRegion(region, flavor);
        return await GetBlizzardDataCached<PvpLeaderboard>("getLeaderboard" + bracket + ns, async () =>
        {
            var currLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, flavor), bracket, ns, GetRegion(ns), GetLocale(ns));
            return currLeaderboard.Value;
        }, TimeSpan.FromHours(3)); //uses getredisproxy generic type of pvpleaderboard to get rbg ladder + region from redis
    }
    public async Task<PvpLeaderboardsIndex> GetLeaderboardIndex(string region, GameFlavor flavor)
    {
        var ns = GetDynamicRegion(region, flavor);
        return await GetBlizzardDataCached<PvpLeaderboardsIndex>("getLeaderboardsIndex" + ns, async () =>
        {
            var currLeaderboardIndex = await warcraftClient.GetPvpLeaderboardsIndexAsync(await GetSeason(region, flavor), ns, GetRegion(ns), GetLocale(ns));
            return currLeaderboardIndex.Value;
        }, TimeSpan.FromHours(3)); //uses getredisproxy generic type of pvpleaderboard to get rbg ladder + region from redis
    }
    
    // Gets all ladder brackets and finds all of the specialization data we need for shuffle and blitz.
    public async Task<List<LadderBracket>> GetLadderBrackets(string region, GameFlavor flavor)
    {
        var ns = GetDynamicRegion(region, flavor);
        return await GetBlizzardDataCached<List<LadderBracket>>("getLadderBrackets" + ns, async () =>
        {
            var leaderboardIndex = await GetLeaderboardIndex(region, flavor);
            var ladderNames = leaderboardIndex.Leaderboards.Select(l => l.Name).ToHashSet();
            // overall shuffle / blitz ladders and arena brackets without a spec
            var brackets = ladderNames.Where(name => !name.Contains("-") || name.EndsWith("-overall")).Select(name => new LadderBracket { Slug = name, Ladder = name.Split('-')[0]}).ToList();
           
           var specIndex = await PlayableSpecializationsIndex(region, flavor);
            foreach (var specList in specIndex?.CharacterSpecializations ?? [])
            {
                var spec = await PlayableSpecialization(specList.Id, region, flavor);
                // returns all data we want from a spec we find
                foreach (var ladder in new[] { "shuffle", "blitz" })
                {
                    var slug = LadderNames.ForSpec(ladder, spec?.PlayableClass?.Name, spec?.Name);
                    if (ladderNames.Contains(slug))
                    {
                        brackets.Add(new LadderBracket { 
                        Slug = slug, Ladder = ladder,
                        ClassName = spec?.PlayableClass?.Name, 
                        SpecName = spec?.Name,
                        SpecId = spec?.Id,
                         });
                    }
                }
            }
            return brackets;
        }, TimeSpan.FromHours(3)); 
    }
    //the minimum ratings the spec stats page offers on its slider
    private static readonly int[] SpecStatRatings = [1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700];

    //counts every spec's ladder and puts that data in a dictionary as an overall count for the spec stats page.
    public async Task<List<SpecRatingCounts>> GetSoloSpecStats(string ladder, string region, GameFlavor flavor)
    {
        return await GetBlizzardDataCached<List<SpecRatingCounts>>(flavor.KeyPrefix() + "specStatsPerHundred" + ladder + region, async () =>
        {
            var stats = new List<SpecRatingCounts>();
            var ladderBrackets = await GetLadderBrackets(region, flavor);
            foreach (var bracket in ladderBrackets.Where(l => l.Ladder == ladder && !string.IsNullOrEmpty(l.SpecName)))
            {
                var leaderboard = await GetLeaderboard(region, bracket.Slug, flavor);
                var ratings = leaderboard?.Entries?.Where(e => e != null).Select(e => e.Rating).ToList() ?? [];
                stats.Add(new SpecRatingCounts
                {
                    ClassName = bracket.ClassName ?? "",
                    SpecName = bracket.SpecName ?? "",
                    PlayersAtRating = CountPlayersAtRatings(ratings)
                });
            }
            return stats;
        }, TimeSpan.FromHours(1));
    }
    //the same counts for brackets without spec ladders, like 3v3, from the class lists the character sync fills.
    public async Task<List<SpecRatingCounts>> GetClassSpecStats(string bracket, string region, GameFlavor flavor)
    {
        var stats = new List<SpecRatingCounts>();
        var classes = await GetPlayableClasses(region, flavor);
        foreach (var wowClass in classes)
        {
            var entries = await CachedClassCharacters(region, wowClass.Name, bracket, flavor);
            var specGroups = entries.OfType<ClassLadderEntry>().Where(e => !string.IsNullOrEmpty(e.Spec)).GroupBy(e => e.Spec);
            foreach (var specGroup in specGroups)
            {
                stats.Add(new SpecRatingCounts
                {
                    ClassName = wowClass.Name,
                    SpecName = specGroup.Key,
                    PlayersAtRating = CountPlayersAtRatings(specGroup.Select(e => e.Rating).ToList())
                });
            }
        }
        return stats;
    }
    private static Dictionary<int, int> CountPlayersAtRatings(List<int> ratings)
    {
        return SpecStatRatings.ToDictionary(minRating => minRating, minRating => ratings.Count(rating => rating >= minRating));
    }
    public async Task<PvpRewardsIndex> GetPvPRewards(string region, GameFlavor flavor)
    {

        var ns = GetDynamicRegion(region, flavor);
        int season = await GetSeason(region, flavor);
        return await GetBlizzardDataCached<PvpRewardsIndex>("GetPvPRewards" + season + ns, async () =>
        {
            var ActivePvpRewards = await warcraftClient.GetPvpRewardsIndexAsync(season, ns, GetRegion(ns), GetLocale(ns));
            return ActivePvpRewards.Value;
        }, TimeSpan.FromHours(6)); //uses getredisproxy generic type of pvpleaderboard to get rbg ladder + region from redis
    }
    public async Task AddToLadderHistory(string key, string region, PvpLeaderboard currLadder, GameFlavor flavor) //get rbgLeaderboard in redis
    {
        var currLadderAndTime = new PvpLeaderboardAndTime
        {
            Entries = currLadder.Entries,
            Links = currLadder.Links,
            Name = currLadder.Name,
            Season = currLadder.Season,
            Time = DateTime.Now
        };
        var db = redis.GetDatabase();
        await db.ListRightPushAsync(flavor.KeyPrefix() + key + region, JsonSerializer.Serialize(currLadderAndTime));
    }

    public async Task<IEnumerable<PvpLeaderboardAndTime?>> GetLadderHistory(string key, string region, GameFlavor flavor)
    {
        region = GetDynamicRegion(region, flavor);
        var db = redis.GetDatabase(); //var to redis database
        string keyAndRegion = flavor.KeyPrefix() + key + region;

        var ladder = await db.ListRangeAsync(keyAndRegion);
        //convert player to pvpleaderboardentry (for our filtered list of strings)
        return ladder.Where(p => p.HasValue).Select(player =>
        {
            //deserialized out of json to become an object.
            return JsonSerializer.Deserialize<PvpLeaderboardAndTime>(player!.ToString());
        }).ToList();
    }

    //seasons differ per flavor, so the namespace is derived here rather than assumed
    public async Task<int> GetSeason(string region, GameFlavor flavor) // get currSeason in redis
    {
        var ns = GetDynamicRegion(region, flavor);
        return await GetBlizzardDataCached<int>("GetCurrSeason" + ns, async () =>
        {
            var GetCurrSeason = await warcraftClient.GetPvpSeasonsIndexAsync(ns, GetRegion(ns), GetLocale(ns));
            return GetCurrSeason.Value.CurrentSeason.Id;
        }, TimeSpan.FromDays(1)); //uses getredisproxy generic type of pvpleaderboard to get rbg ladder + region from redis
    }
    //when the current season began, so season achievements can be told apart from last season's
    //nullable so a cache miss reads as null and reaches Blizzard; a bare DateTimeOffset would read as year 1
    public async Task<DateTimeOffset?> GetSeasonStart(string region, GameFlavor flavor)
    {
        var ns = GetDynamicRegion(region, flavor);
        int season = await GetSeason(region, flavor);
        return await GetBlizzardDataCached<DateTimeOffset?>("GetSeasonStart" + season + ns, async () =>
        {
            var currSeason = await warcraftClient.GetPvpSeasonAsync(season, ns, GetRegion(ns), GetLocale(ns));
            return currSeason.Success ? currSeason.Value.SeasonStartTimestamp : null;
        }, TimeSpan.FromDays(1));
    }

    public async Task ClearLeaderboard(string bracket, string region, GameFlavor flavor)
    {
        region = GetDynamicRegion(region, flavor);
        string key = "getLeaderboard" + bracket + region;
        var db = redis.GetDatabase();
        await db.KeyDeleteAsync(VersionedKey(key));
    }
}
