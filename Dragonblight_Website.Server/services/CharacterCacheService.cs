using System.Collections.Immutable;
using System.Runtime.CompilerServices;
using ArgentPonyWarcraftClient;
using Dragonblight_Website.Server.Helpers;
using StackExchange.Redis;
using TwitchLib.Api.Helix.Models.Entitlements;

partial class CharacterCacheService(IWarcraftRedisProxy warcraftRedisProxy, ILogger<CharacterCacheService> logger, IConfiguration Config, IConnectionMultiplexer redis, RatingHistoryService ratingHistory)
{
    //how many players of each Shuffle and Blitz spec ladder are synced
    private const int SpecLadderLimit = 500;

    //the progress the rankings page shows for a bracket, from 0 to 1
    private static string SyncStatusKey(string bracket, string region, GameFlavor flavor)
        => flavor.KeyPrefix() + bracket + region + "SyncStatus";

    //uses PvpLeaderboardEntry in generic method in order to locate character slug / name in warcraft client
    public async Task BatchCacheCharSummary(string bracket, string region, PvpLeaderboardEntry[] oldarray, PvpLeaderboardEntry[] newarray, int batchSize, GameFlavor flavor, Dictionary<string, (PvpLeaderboard Old, PvpLeaderboard New)> soloSnapshots)
    {
        using var HttpClient = new HttpClient();
        using var RateLimitedHttpClient = new RateLimitedHttpClient(HttpClient);
        var keyGroup = bracket.Split('-')[0].ToLower();
        var clientId = Config[flavor.KeyPrefix() + region.ToLower() + keyGroup + "bracket-battlenetApi:clientId"];
        var clientSecret = Config[flavor.KeyPrefix() + region.ToLower() + keyGroup + "bracket-battlenetApi:clientSecret"];
        var warcraftClient = new WarcraftClient(clientId, clientSecret, Region.US, Locale.en_US, RateLimitedHttpClient);
        warcraftRedisProxy.overrideClient = warcraftClient;
        await warcraftRedisProxy.ClearAllCachedClassCharacters(bracket, region, flavor);
        await warcraftRedisProxy.ClearPvpCharacterSummary(bracket, region, flavor);
        //Shuffle and Blitz keep a ladder per spec, 80 of them a region, so only each spec's top players
        //are looked up and stored. The old ladder is left whole: it is only searched for comparisons.
        if ((keyGroup == "shuffle" || keyGroup == "blitz") && !bracket.EndsWith("-overall"))
        {
            newarray = newarray.OrderBy(p => p.Rank).Take(SpecLadderLimit).ToArray();
        }
        var batchAmount = newarray.Length / batchSize;
        decimal percent = 0;
        await redis.GetDatabase().StringSetAsync(SyncStatusKey(bracket, region, flavor), percent.ToString());
        var snapshots = new List<CharacterRatingSnapshot>();
        var season = await warcraftRedisProxy.GetSeason(region, flavor);
        var ladderBrackets = await warcraftRedisProxy.GetLadderBrackets(region, flavor);
        for (int i = 0; i < batchAmount; i++)
        {
            var slice = newarray.Skip(i * batchSize).Take(batchSize);
            //obtains character realm, character name, and region.
            foreach (var player in slice)
            {
                try
                {
                    var name = player.Character.Name.ToLower();
                    await warcraftRedisProxy.RecordCharacter(player.Character.Id, player.Character.Name, player.Character.Realm.Slug, region, flavor);
                    var summary = await warcraftRedisProxy.GetCharSummary(player.Character.Realm.Slug, name, region, flavor);
                    if (summary == new CharacterProfileSummary())
                    {
                        redis.GetDatabase().KeyDelete(WarcraftRedisProxy.VersionedKey("GetCharacter" + player.Character.Realm.Slug + name + warcraftRedisProxy.GetProfileRegion(region, flavor)));
                        await Task.Delay(500);
                        summary = await warcraftRedisProxy.GetCharSummary(player.Character.Realm.Slug, name, region, flavor);
                    }
                    var talents = await warcraftRedisProxy.GetCharacterSpecName(player.Character.Realm.Slug, name, region, flavor);
                    if (talents == "" && flavor != GameFlavor.Retail)
                    {
                        redis.GetDatabase().KeyDelete(WarcraftRedisProxy.VersionedKey("characterSpecSummary" + name + player.Character.Realm.Slug + warcraftRedisProxy.GetProfileRegion(region, flavor)));
                        redis.GetDatabase().KeyDelete(WarcraftRedisProxy.VersionedKey(flavor.KeyPrefix() + "characterSpecName" + name + player.Character.Realm.Slug + region));
                        await Task.Delay(500);
                        talents = await warcraftRedisProxy.GetCharacterSpecName(player.Character.Realm.Slug, name, region, flavor);
                    }
                    var newPvpCharSummary = new PvpCharacterSummary
                    {
                        PvpEntry = player,
                        charSummary = summary,
                        spec = talents
                    };
                    var specName = flavor == GameFlavor.Retail ? summary.ActiveSpec?.Name ?? "" : talents;
                    await warcraftRedisProxy.SavePvpCharacterSummary(newPvpCharSummary, bracket, region, flavor);
                    var activitySpec = specName;
                    //filters by ladder spec name or default to the active spec
                    var specLadder = LadderNames.ForSpec(keyGroup, summary.CharacterClass?.Name, newPvpCharSummary.spec);
                    var ladderSpec = ladderBrackets.FirstOrDefault(l => l.Slug == specLadder)?.SpecName;
                    if (!string.IsNullOrEmpty(ladderSpec))
                    {
                        activitySpec = ladderSpec;
                    }

                    var oldEntries = oldarray;
                    //if the ladder we want is from a specialization, we get the old ladder for that spec
                    if (soloSnapshots.TryGetValue(specLadder, out var specSnapshot))
                    {
                        oldEntries = specSnapshot.Old.Entries;
                    }
                    //gets the first entry in the old ladder from the specialization we are looking at for that character.
                    //takes the closest one in case one we find first has more games played than the current ladder entry.
                    var oldPlayer = oldEntries
                        .Where(p => p.Character.Id == player.Character.Id && p.SeasonMatchStatistics.Played <= player.SeasonMatchStatistics.Played)
                        .OrderByDescending(p => p.SeasonMatchStatistics.Played)
                        .FirstOrDefault();
                    //if we find a match of the character from the old overall ladder
                    var bracketEntry = oldarray.FirstOrDefault(p => oldPlayer != null
                        && p.Character.Id == player.Character.Id
                        && p.SeasonMatchStatistics.Played == oldPlayer.SeasonMatchStatistics.Played
                        && p.SeasonMatchStatistics.Won == oldPlayer.SeasonMatchStatistics.Won
                        && p.SeasonMatchStatistics.Lost == oldPlayer.SeasonMatchStatistics.Lost);
                    // we set oldPlayer to that entry in the overall ladder so we can use the correct rank 
                    if (bracketEntry != null)
                    {
                        oldPlayer = bracketEntry;
                    }
                    // since its checking by the right spec then we can update the activity page and the cache if the character's games played has changed
                    if (oldPlayer != null && oldPlayer.SeasonMatchStatistics.Played != player.SeasonMatchStatistics.Played)
                    {
                        await warcraftRedisProxy.InsertToBracketActivityPage(bracket, region, oldPlayer, player, activitySpec, flavor);
                        await warcraftRedisProxy.InsertActivityCacheClassCharacter(bracket, oldPlayer, player, summary, activitySpec, region, flavor);
                        await warcraftRedisProxy.InsertToPlayerPageActivity(bracket, region, player, flavor);
                    }
                    // if the character wasn't in the old ladder, or if the character's games played has changed, record a snapshot of their rating
                    if (oldPlayer == null || oldPlayer.SeasonMatchStatistics.Played != player.SeasonMatchStatistics.Played)
                    {
                        snapshots.Add(CharacterRatingSnapshot.FromEntry(player, bracket, region, flavor, season));
                    }

                    await warcraftRedisProxy.InsertCacheClassCharacter(bracket, player, summary, activitySpec, region, flavor);
                    //files the character under its account's alt key while we are already walking the ladder
                    await warcraftRedisProxy.IndexAltList(player.Character.Realm.Slug, name, region, flavor);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Error in BatchCacheCharSummary");
                }
            }
            percent = (decimal)(i + 1) / batchAmount;
            await redis.GetDatabase().StringSetAsync(SyncStatusKey(bracket, region, flavor), percent.ToString());
        }
        ;
        //a ladder under one batch never enters the loop, so finishing is what marks it complete
        await redis.GetDatabase().StringSetAsync(SyncStatusKey(bracket, region, flavor), "1");
        await warcraftRedisProxy.BracketPlayerExpiration(bracket, region, flavor);
        try
        {
            await warcraftRedisProxy.UpdateEstimatedCutoffs(bracket, region, newarray, flavor);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error estimating cutoffs for " + bracket);
        }
        try
        {
            //save snapshots of characters whose games played has changed to the database
            await ratingHistory.SaveSnapshots(snapshots);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error saving rating history for " + bracket);
        }


        warcraftRedisProxy.overrideClient = null;
    }
    public async Task CacheLadder(string region, string bracket, PvpLeaderboard OldLeaderboard, PvpLeaderboard NewLeaderboard, GameFlavor flavor, Dictionary<string, (PvpLeaderboard Old, PvpLeaderboard New)> soloSnapshots)
    {
        try
        {
            await BatchCacheCharSummary(bracket, region, OldLeaderboard.Entries.ToArray(), NewLeaderboard.Entries.ToArray(), 5, flavor, soloSnapshots);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheLadder");
        }
    }
    // doing this because we need to know what the class and specializations are of a player before we load
    // the shuffle and blitz overall ladders. Loading Blitz and Shuffle overall last
    public void MoveSoloBracketsToEnd(List<string> ladders, string bracketToMove)
    {
        var index = ladders.IndexOf(bracketToMove);
        if (index >= 0)
        {
            ladders.RemoveAt(index);
            ladders.Add(bracketToMove);
        }
    }

    private async Task<(PvpLeaderboard Old, PvpLeaderboard New)> SnapshotLadder(string region, string bracket, GameFlavor flavor)
    {
        var oldLeaderboard = await warcraftRedisProxy.GetLeaderboard(region, bracket, flavor);
        await warcraftRedisProxy.ClearLeaderboard(bracket, region, flavor);
        var newLeaderboard = await warcraftRedisProxy.GetLeaderboard(region, bracket, flavor);
        return (oldLeaderboard, newLeaderboard);
    }
    public async Task CacheAllLadders(string region, GameFlavor flavor)
    {
        var pvpLeaderboardIndex = await warcraftRedisProxy.GetLeaderboardIndex(region, flavor);
        List<string> ladders = pvpLeaderboardIndex.Leaderboards.Select(l => l.Name).ToList();
        MoveSoloBracketsToEnd(ladders, "shuffle-overall");
        MoveSoloBracketsToEnd(ladders, "blitz-overall");

        var soloSnapshots = new Dictionary<string, (PvpLeaderboard Old, PvpLeaderboard New)>();
        foreach (var ladder in ladders.Where(l => l.StartsWith("shuffle") || l.StartsWith("blitz")))
        {
            try
            {
                soloSnapshots[ladder] = await SnapshotLadder(region, ladder, flavor);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error fetching " + ladder);
            }
        }
        foreach (var ladder in ladders)
        {
            try
            {
                //arena and RBG ladders have no spec ladders to agree with, so they are still fetched just before use
                var (oldLeaderboard, newLeaderboard) = soloSnapshots.TryGetValue(ladder, out var snapshot)
                    ? snapshot
                    : await SnapshotLadder(region, ladder, flavor);
                await CacheLadder(region, ladder, oldLeaderboard, newLeaderboard, flavor, soloSnapshots);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error in CacheAllLadders for " + ladder);
            }
        }
    }
}