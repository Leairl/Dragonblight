using ArgentPonyWarcraftClient;
using StackExchange.Redis;
using TwitchLib.Api.Helix.Models.Entitlements;

partial class CharacterCacheService(IWarcraftRedisProxy redisProxy, ILogger<CharacterCacheService> logger, IConfiguration Config, IConnectionMultiplexer redis)
{
    //how many players of each Shuffle and Blitz spec ladder are synced
    private const int SpecLadderLimit = 1000;
    //Shuffle and Blitz each have this many spec ladders feeding their combined "All" ladder
    private const int SpecLadderCount = 40;

    //the progress the rankings page shows for a bracket, from 0 to 1
    private static string SyncStatusKey(string bracket, string region, GameFlavor flavor)
        => flavor.KeyPrefix() + bracket + region + "SyncStatus";

    //the combined Shuffle or Blitz ladder is refilled spec by spec, so its progress is the share of
    //spec ladders finished this cycle, counted up from 0 as each one completes
    public async Task ResetCombinedSyncStatus(string group, string region)
    {
        var db = redis.GetDatabase();
        await db.KeyDeleteAsync(SyncStatusKey(group, region, GameFlavor.Retail) + "Done");
        await db.StringSetAsync(SyncStatusKey(group, region, GameFlavor.Retail), "0");
    }

    private async Task AdvanceCombinedSyncStatus(string group, string region)
    {
        var db = redis.GetDatabase();
        var done = await db.StringIncrementAsync(SyncStatusKey(group, region, GameFlavor.Retail) + "Done");
        var progress = Math.Min(1m, (decimal)done / SpecLadderCount);
        await db.StringSetAsync(SyncStatusKey(group, region, GameFlavor.Retail), progress.ToString());
    }

    //uses PvpLeaderboardEntry in generic method in order to locate character slug / name in warcraft client
    public async Task BatchCacheCharSummary(string bracket, string region, PvpLeaderboardEntry[] oldarray, PvpLeaderboardEntry[] newarray, int batchSize = 5, GameFlavor flavor = GameFlavor.MistsClassic)
    {   
        using var HttpClient = new HttpClient();
        using var RateLimitedHttpClient = new RateLimitedHttpClient(HttpClient);
        var keyGroup = bracket.Split('-')[0].ToLower();
        var clientId = Config[flavor.KeyPrefix() + region.ToLower() + keyGroup + "bracket-battlenetApi:clientId"];
        var clientSecret = Config[flavor.KeyPrefix() + region.ToLower() + keyGroup + "bracket-battlenetApi:clientSecret"];
        var warcraftClient = new WarcraftClient(clientId, clientSecret, Region.US, Locale.en_US, RateLimitedHttpClient);
        redisProxy.overrideClient = warcraftClient;
        await redisProxy.ClearAllCachedClassCharacters(bracket, region, flavor);
        await redisProxy.ClearPvpCharacterSummary(bracket, region, flavor);
        //Shuffle and Blitz keep a ladder per spec, 80 of them a region, so only each spec's top players
        //are looked up and stored. The old ladder is left whole: it is only searched for comparisons.
        if (keyGroup == "shuffle" || keyGroup == "blitz")
        {
            newarray = newarray.OrderBy(p => p.Rank).Take(SpecLadderLimit).ToArray();
        }
        var batchAmount = newarray.Length/batchSize;
        decimal percent = 0;
        await redis.GetDatabase().StringSetAsync(SyncStatusKey(bracket, region, flavor), percent.ToString());
        for(int i = 0; i<batchAmount; i++)
        {
            var slice = newarray.Skip(i*batchSize).Take(batchSize);
            //obtains character realm, character name, and region.
            foreach(var player in slice) {
                try 
                {
                    var oldPlayer = oldarray.FirstOrDefault(p => {
                        return p.Character.Id == player.Character.Id;
                    });
                    var summary = await redisProxy.GetCharSummary(player.Character.Realm.Slug, player.Character.Name, region, flavor);
                    if (summary == new CharacterProfileSummary())
                    {
                        redis.GetDatabase().KeyDelete("GetCharacter" + player.Character.Realm.Slug + player.Character.Name + redisProxy.GetProfileRegion(region, flavor));
                        await Task.Delay(500);
                        summary = await redisProxy.GetCharSummary(player.Character.Realm.Slug, player.Character.Name, region, flavor);
                    }
                    var talents = await redisProxy.GetCharacterSpecName(player.Character.Realm.Slug, player.Character.Name, region, flavor);
                    if (talents == "" && flavor != GameFlavor.Retail)
                    {
                        redis.GetDatabase().KeyDelete("characterSpecSummary" + player.Character.Name + player.Character.Realm.Slug + redisProxy.GetProfileRegion(region, flavor));
                        redis.GetDatabase().KeyDelete(flavor.KeyPrefix() + "characterSpecName" + player.Character.Name + player.Character.Realm.Slug + region);
                        await Task.Delay(500);
                        talents = await redisProxy.GetCharacterSpecName(player.Character.Realm.Slug, player.Character.Name, region, flavor);
                    }
                    var newPvpCharSummary = new PvpCharacterSummary
                        {
                        PvpEntry = player,
                        charSummary = summary,
                        spec = talents
                        };
                    await redisProxy.SavePvpCharacterSummary(newPvpCharSummary, bracket, region, flavor);
                    if (oldPlayer != null && oldPlayer.SeasonMatchStatistics.Played != player.SeasonMatchStatistics.Played) {
                        await redisProxy.InsertToBracketActivityPage(bracket, region, oldPlayer, player, flavor);
                        await redisProxy.InsertActivityCacheClassCharacter(bracket, oldPlayer, player, summary, region, flavor);
                        await redisProxy.InsertToPlayerPageActivity(bracket, region, player, flavor);
                    };
                    await redisProxy.InsertCacheClassCharacter(bracket, player, summary, region, flavor);
                    //files the character under its account's alt key while we are already walking the ladder
                    await redisProxy.IndexAltList(player.Character.Realm.Slug, player.Character.Name, region, flavor);
                }
                catch (Exception ex) 
                {
                    logger.LogError(ex, "Error in BatchCacheCharSummary");
                }
            }
            percent = (decimal)(i+1)/batchAmount;
            await redis.GetDatabase().StringSetAsync(SyncStatusKey(bracket, region, flavor), percent.ToString());
        };
        //a ladder under one batch never enters the loop, so finishing is what marks it complete
        await redis.GetDatabase().StringSetAsync(SyncStatusKey(bracket, region, flavor), "1");
        if (keyGroup == "shuffle" || keyGroup == "blitz")
        {
            await AdvanceCombinedSyncStatus(keyGroup, region);
        }
        await redisProxy.BracketPlayerExpiration(bracket, region, flavor);
        redisProxy.overrideClient = null;
    }
    //get rbgLeaderboard in redis (defined method with a defined type to execute x function)
    public async Task CacheRBGLadder(string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        //not using string since we are executing from GetRBGLeaderboard method in warcraftclient
        try
        {
            var oldRbgLeaderboard = await redisProxy.GetRBGLeaderboard(region, flavor);
            await redisProxy.ClearLeaderboard("rbg", region, flavor);
            var newRbgLeaderboard = await redisProxy.GetRBGLeaderboard(region, flavor);
            await BatchCacheCharSummary("rbg", region, oldRbgLeaderboard.Entries.ToArray(), newRbgLeaderboard.Entries.ToArray(), 5, flavor);
        }
        catch (Exception ex) 
        {
            logger.LogError(ex, "Error in CacheRBGLadder");
        }
    }
    //get 2v2Leaderboard in redis (defined method with a defined type to execute x function)
    public async Task Cache2v2Ladder(string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        try
        {
            //not using string since we are executing from Get2v2Leaderboard method in warcraftclient
            var oldleaderboard2v2 = await redisProxy.Get2v2Leaderboard(region, flavor);
            await redisProxy.ClearLeaderboard("2v2", region, flavor);
            var new2v2Leaderboard = await redisProxy.Get2v2Leaderboard(region, flavor);
            await BatchCacheCharSummary("2v2", region, oldleaderboard2v2.Entries.ToArray(), new2v2Leaderboard.Entries.ToArray(), 5, flavor);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in Cache2v2Ladder");
        }
    }
    //get Leaderboard3v3 in redis (defined method with a defined type to execute x function)
    public async Task Cache3v3Ladder(string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        try
        {
            //not using string since we are executing from Get3v3Leaderboard method in warcraftclient
            var oldleaderboard3v3 = await redisProxy.Get3v3Leaderboard(region, flavor);
            await redisProxy.ClearLeaderboard("3v3", region, flavor);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboard3v3 = await redisProxy.Get3v3Leaderboard(region, flavor);
            await BatchCacheCharSummary("3v3", region, oldleaderboard3v3.Entries.ToArray(), newleaderboard3v3.Entries.ToArray(), 5, flavor);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in Cache3v3Ladder");
        }
    }
    //get Leaderboard5v5 in redis (defined method with a defined type to execute x function)
    public async Task Cache5v5Ladder(string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        try
        {
            //not using string since we are executing from Get5v5Leaderboard method in warcraftclient
            var oldleaderboard5v5 = await redisProxy.Get5v5Leaderboard(region, flavor);
            await redisProxy.ClearLeaderboard("5v5", region, flavor);
            var newleaderboard5v5 = await redisProxy.Get5v5Leaderboard(region, flavor);
            await BatchCacheCharSummary("5v5", region, oldleaderboard5v5.Entries.ToArray(), newleaderboard5v5.Entries.ToArray(), 5, flavor);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in Cache5v5Ladder");
        }
    }
    public async Task CacheAllLadders(string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        // await CacheRBGLadder(region, flavor);
        // if (flavor.Brackets().Contains("5v5"))
        // {
        //     await Cache5v5Ladder(region, flavor);
        // }
        if (flavor == GameFlavor.Retail)
        {
            await redisProxy.ClearPvpCharacterSummary("blitz", region, GameFlavor.Retail);
            await ResetCombinedSyncStatus("blitz", region);
            await CacheBlitzWarriorFuryLadder(region);
            await CacheBlitzDeathKnightBloodLadder(region);
            await CacheBlitzDeathKnightFrostLadder(region);
            await CacheBlitzDeathKnightUnholyLadder(region);
            await CacheBlitzDemonHunterDevourerLadder(region);
            await CacheBlitzDemonHunterHavocLadder(region);
            await CacheBlitzDemonHunterVengeanceLadder(region);
            await CacheBlitzDruidBalanceLadder(region);
            await CacheBlitzDruidFeralLadder(region);
            await CacheBlitzDruidGuardianLadder(region);
            await CacheBlitzDruidRestorationLadder(region);
            await CacheBlitzEvokerDevastationLadder(region);
            await CacheBlitzEvokerPreservationLadder(region);
            await CacheBlitzEvokerAugmentationLadder(region);
            await CacheBlitzHunterBeastMasteryLadder(region);
            await CacheBlitzHunterMarksmanshipLadder(region);
            await CacheBlitzHunterSurvivalLadder(region);
            await CacheBlitzMageArcaneLadder(region);
            await CacheBlitzMageFireLadder(region);
            await CacheBlitzMageFrostLadder(region);
            await CacheBlitzMonkBrewmasterLadder(region);
            await CacheBlitzMonkWindwalkerLadder(region);
            await CacheBlitzMonkMistweaverLadder(region);
            await CacheBlitzPaladinHolyLadder(region);
            await CacheBlitzPaladinProtectionLadder(region);
            await CacheBlitzPaladinRetributionLadder(region);
            await CacheBlitzPriestDisciplineLadder(region);
            await CacheBlitzPriestHolyLadder(region);
            await CacheBlitzPriestShadowLadder(region);
            await CacheBlitzRogueAssassinationLadder(region);
            await CacheBlitzRogueOutlawLadder(region);
            await CacheBlitzRogueSubtletyLadder(region);
            await CacheBlitzShamanElementalLadder(region);
            await CacheBlitzShamanEnhancementLadder(region);
            await CacheBlitzShamanRestorationLadder(region);
            await CacheBlitzWarlockAfflictionLadder(region);
            await CacheBlitzWarlockDemonologyLadder(region);
            await CacheBlitzWarlockDestructionLadder(region);
            await CacheBlitzWarriorArmsLadder(region);
            await CacheBlitzWarriorProtectionLadder(region);
            await redisProxy.ClearPvpCharacterSummary("shuffle", region, GameFlavor.Retail);
            await ResetCombinedSyncStatus("shuffle", region);
            await CacheShuffleWarriorFuryLadder(region);
            await CacheShuffleDeathKnightBloodLadder(region);
            await CacheShuffleDeathKnightFrostLadder(region);
            await CacheShuffleDeathKnightUnholyLadder(region);
            await CacheShuffleDemonHunterDevourerLadder(region);
            await CacheShuffleDemonHunterHavocLadder(region);
            await CacheShuffleDemonHunterVengeanceLadder(region);
            await CacheShuffleDruidBalanceLadder(region);
            await CacheShuffleDruidFeralLadder(region);
            await CacheShuffleDruidGuardianLadder(region);
            await CacheShuffleDruidRestorationLadder(region);
            await CacheShuffleEvokerDevastationLadder(region);
            await CacheShuffleEvokerPreservationLadder(region);
            await CacheShuffleEvokerAugmentationLadder(region);
            await CacheShuffleHunterBeastMasteryLadder(region);
            await CacheShuffleHunterMarksmanshipLadder(region);
            await CacheShuffleHunterSurvivalLadder(region);
            await CacheShuffleMageArcaneLadder(region);
            await CacheShuffleMageFireLadder(region);
            await CacheShuffleMageFrostLadder(region);
            await CacheShuffleMonkBrewmasterLadder(region);
            await CacheShuffleMonkWindwalkerLadder(region);
            await CacheShuffleMonkMistweaverLadder(region);
            await CacheShufflePaladinHolyLadder(region);
            await CacheShufflePaladinProtectionLadder(region);
            await CacheShufflePaladinRetributionLadder(region);
            await CacheShufflePriestDisciplineLadder(region);
            await CacheShufflePriestHolyLadder(region);
            await CacheShufflePriestShadowLadder(region);
            await CacheShuffleRogueAssassinationLadder(region);
            await CacheShuffleRogueOutlawLadder(region);
            await CacheShuffleRogueSubtletyLadder(region);
            await CacheShuffleShamanElementalLadder(region);
            await CacheShuffleShamanEnhancementLadder(region);
            await CacheShuffleShamanRestorationLadder(region);
            await CacheShuffleWarlockAfflictionLadder(region);
            await CacheShuffleWarlockDemonologyLadder(region);
            await CacheShuffleWarlockDestructionLadder(region);
            await CacheShuffleWarriorArmsLadder(region);
            await CacheShuffleWarriorProtectionLadder(region);
        }
        // await Cache3v3Ladder(region, flavor);
        // await Cache2v2Ladder(region, flavor);

    }

}
