using System.Collections.Immutable;
using ArgentPonyWarcraftClient;
using StackExchange.Redis;
using TwitchLib.Api.Helix.Models.Entitlements;

partial class CharacterCacheService(IWarcraftRedisProxy warcraftRedisProxy, ILogger<CharacterCacheService> logger, IConfiguration Config, IConnectionMultiplexer redis)
{
    //how many players of each Shuffle and Blitz spec ladder are synced
    private const int SpecLadderLimit = 500;

    //the progress the rankings page shows for a bracket, from 0 to 1
    private static string SyncStatusKey(string bracket, string region, GameFlavor flavor)
        => flavor.KeyPrefix() + bracket + region + "SyncStatus";

    //uses PvpLeaderboardEntry in generic method in order to locate character slug / name in warcraft client
    public async Task BatchCacheCharSummary(string bracket, string region, PvpLeaderboardEntry[] oldarray, PvpLeaderboardEntry[] newarray, int batchSize = 5, GameFlavor flavor = GameFlavor.MistsClassic)
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
                    var summary = await warcraftRedisProxy.GetCharSummary(player.Character.Realm.Slug, player.Character.Name, region, flavor);
                    if (summary == new CharacterProfileSummary())
                    {
                        redis.GetDatabase().KeyDelete("GetCharacter" + player.Character.Realm.Slug + player.Character.Name + warcraftRedisProxy.GetProfileRegion(region, flavor));
                        await Task.Delay(500);
                        summary = await warcraftRedisProxy.GetCharSummary(player.Character.Realm.Slug, player.Character.Name, region, flavor);
                    }
                    var talents = await warcraftRedisProxy.GetCharacterSpecName(player.Character.Realm.Slug, player.Character.Name, region, flavor);
                    if (talents == "" && flavor != GameFlavor.Retail)
                    {
                        redis.GetDatabase().KeyDelete("characterSpecSummary" + player.Character.Name + player.Character.Realm.Slug + warcraftRedisProxy.GetProfileRegion(region, flavor));
                        redis.GetDatabase().KeyDelete(flavor.KeyPrefix() + "characterSpecName" + player.Character.Name + player.Character.Realm.Slug + region);
                        await Task.Delay(500);
                        talents = await warcraftRedisProxy.GetCharacterSpecName(player.Character.Realm.Slug, player.Character.Name, region, flavor);
                    }
                    var newPvpCharSummary = new PvpCharacterSummary
                        {
                        PvpEntry = player,
                        charSummary = summary,
                        spec = talents
                        };
                    await warcraftRedisProxy.SavePvpCharacterSummary(newPvpCharSummary, bracket, region, flavor);
                    if (oldPlayer != null && oldPlayer.SeasonMatchStatistics.Played != player.SeasonMatchStatistics.Played) {
                        await warcraftRedisProxy.InsertToBracketActivityPage(bracket, region, oldPlayer, player, flavor);
                        await warcraftRedisProxy.InsertActivityCacheClassCharacter(bracket, oldPlayer, player, summary, region, flavor);
                        await warcraftRedisProxy.InsertToPlayerPageActivity(bracket, region, player, flavor);
                    };
                    await warcraftRedisProxy.InsertCacheClassCharacter(bracket, player, summary, region, flavor);
                    //files the character under its account's alt key while we are already walking the ladder
                    await warcraftRedisProxy.IndexAltList(player.Character.Realm.Slug, player.Character.Name, region, flavor);
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
        await warcraftRedisProxy.BracketPlayerExpiration(bracket, region, flavor);
        warcraftRedisProxy.overrideClient = null;
    }
    public async Task CacheLadder(string region, string bracket, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        try
        {
            var oldleaderboard = await warcraftRedisProxy.GetLeaderboard(region, bracket, flavor);
            await warcraftRedisProxy.ClearLeaderboard(bracket, region, flavor);
            var newleaderboard = await warcraftRedisProxy.GetLeaderboard(region, bracket, flavor);
            await BatchCacheCharSummary(bracket, region, oldleaderboard.Entries.ToArray(), newleaderboard.Entries.ToArray(), 5, flavor);
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
    public async Task CacheAllLadders(string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        var pvpLeaderboardIndex = await warcraftRedisProxy.GetLeaderboardIndex(region, flavor);
        List<string> ladders = pvpLeaderboardIndex.Leaderboards.Select(l => l.Name).ToList();
        MoveSoloBracketsToEnd(ladders, "shuffle-overall");
        MoveSoloBracketsToEnd(ladders, "blitz-overall");

        foreach (var ladder in ladders)
        {
            await CacheLadder(region, ladder, flavor);
        }


    }

}
