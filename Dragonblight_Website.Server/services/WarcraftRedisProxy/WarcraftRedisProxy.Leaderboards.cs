using System.Text.Json;
using ArgentPonyWarcraftClient;
using Dragonblight_Website.Server.Helpers;
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
        return await GetBlizzardDataCached<List<SpecRatingCounts>>(flavor.KeyPrefix() + "specStatsWithRaces" + ladder + region, async () =>
        {
            var stats = new List<SpecRatingCounts>();
            var ladderBrackets = await GetLadderBrackets(region, flavor);
            foreach (var bracket in ladderBrackets.Where(l => l.Ladder == ladder && !string.IsNullOrEmpty(l.SpecName)))
            {
                var leaderboard = await GetLeaderboard(region, bracket.Slug, flavor);
                var ratings = leaderboard?.Entries?.Where(e => e != null).Select(e => e.Rating).ToList() ?? [];
                //races come from the synced profiles, which only cover each spec ladder's top players
                var summaries = await GetPvpLeaderSummaries(bracket.Slug, region, flavor);
                var players = summaries.OfType<PvpCharacterSummary>()
                    .Where(s => !string.IsNullOrEmpty(s.charSummary?.Race?.Name))
                    .Select(s => (s.PvpEntry.Rating, s.charSummary.Race.Name))
                    .ToList();
                stats.Add(new SpecRatingCounts
                {
                    ClassName = bracket.ClassName ?? "",
                    SpecName = bracket.SpecName ?? "",
                    PlayersAtRating = CountPlayersAtRatings(ratings),
                    RacesAtRating = CountRacesAtRatings(players)
                });
            }
            return stats;
        }, TimeSpan.FromHours(1));
    }
    //the same counts for brackets without spec ladders, like 3v3, from the class lists the character sync fills.
    public async Task<List<SpecRatingCounts>> GetClassSpecStats(string bracket, string region, GameFlavor flavor)
    {
        //reading every profile is slow, so this keeps the result briefly. A sync refills the lists, so it can't stay stale for long
        return await GetBlizzardDataCached<List<SpecRatingCounts>>(flavor.KeyPrefix() + "classSpecStats" + bracket + region, async () =>
        {
            //the class lists know each player's spec and the profiles know their race, so the character id connects them
            var raceByCharacter = new Dictionary<int, string>();
            foreach (var summary in (await GetPvpLeaderSummaries(bracket, region, flavor)).OfType<PvpCharacterSummary>())
            {
                if (!string.IsNullOrEmpty(summary.charSummary?.Race?.Name))
                {
                    raceByCharacter.TryAdd(summary.PvpEntry.Character.Id, summary.charSummary.Race.Name);
                }
            }

            var stats = new List<SpecRatingCounts>();
            var classes = await GetPlayableClasses(region, flavor);
            foreach (var wowClass in classes)
            {
                var entries = await CachedClassCharacters(region, wowClass.Name, bracket, flavor);
                var specGroups = entries.OfType<ClassLadderEntry>().Where(e => !string.IsNullOrEmpty(e.Spec)).GroupBy(e => e.Spec);
                foreach (var specGroup in specGroups)
                {
                    var players = specGroup
                        .Where(e => raceByCharacter.ContainsKey(e.Character.Id))
                        .Select(e => (e.Rating, raceByCharacter[e.Character.Id]))
                        .ToList();
                    stats.Add(new SpecRatingCounts
                    {
                        ClassName = wowClass.Name,
                        SpecName = specGroup.Key,
                        PlayersAtRating = CountPlayersAtRatings(specGroup.Select(e => e.Rating).ToList()),
                        RacesAtRating = CountRacesAtRatings(players)
                    });
                }
            }
            return stats;
        }, TimeSpan.FromMinutes(5));
    }
    private static Dictionary<int, int> CountPlayersAtRatings(List<int> ratings)
    {
        return SpecStatRatings.ToDictionary(minRating => minRating, minRating => ratings.Count(rating => rating >= minRating));
    }
    private static Dictionary<int, Dictionary<string, int>> CountRacesAtRatings(List<(int Rating, string Race)> players)
    {
        return SpecStatRatings.ToDictionary(minRating => minRating, minRating => players
            .Where(player => player.Rating >= minRating)
            .GroupBy(player => player.Race)
            .ToDictionary(race => race.Key, race => race.Count()));
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

    //Fetches the ladder from Blizzard and only then replaces the cached copy. Deleting the cached copy
    //first left the ladder empty for the site whenever the fetch failed.
    public async Task<PvpLeaderboard> RefreshLeaderboard(string region, string bracket, GameFlavor flavor)
    {
        var ns = GetDynamicRegion(region, flavor);
        return await GetBlizzardData<PvpLeaderboard>("getLeaderboard" + bracket + ns, async () =>
        {
            var currLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, flavor), bracket, ns, GetRegion(ns), GetLocale(ns));
            if (!currLeaderboard.Success || currLeaderboard.Value == null)
            {
                throw new InvalidOperationException("Blizzard did not return the " + bracket + " " + ns + " ladder: " + currLeaderboard.Error?.Detail);
            }
            return currLeaderboard.Value;
        }, TimeSpan.FromHours(3));
    }
}
