using System.Text.Json;
using ArgentPonyWarcraftClient;

//Rating changes seen between ladder syncs, per player and per bracket. Redis only - nothing here
//calls Blizzard; the background sync feeds it.
partial class WarcraftRedisProxy
{
    public async Task InsertToPlayerPageActivity(string bracket, string region, PvpLeaderboardEntry player, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        var PvpLeaderboardEntryandTime = new PvpLeaderboardEntryandTime
        {
            Character = player.Character,
            Faction = player.Faction,
            Rank = player.Rank,
            Rating = player.Rating,
            SeasonMatchStatistics = player.SeasonMatchStatistics,
            Tier = player.Tier,
            Time = DateTime.Now
        };
        var db = redis.GetDatabase();
        await db.ListRightPushAsync(flavor.KeyPrefix() + "actvity" + bracket + region + player.Character.Id, JsonSerializer.Serialize(PvpLeaderboardEntryandTime));
    }
    public async Task<IEnumerable<PvpLeaderboardEntryandTime?>> GetPlayerPageActivity(string bracket, string region, string characterId, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        var db = redis.GetDatabase(); //var to redis database
        string keyAndRegion = flavor.KeyPrefix() + "actvity" + bracket + region + characterId;
        var ladder = await db.ListRangeAsync(keyAndRegion);
        //convert player to pvpleaderboardentry (for our filtered list of strings)
        return ladder.Where(p => p.HasValue).Select(player =>
        {
            //deserialized out of json to become an object.
            return JsonSerializer.Deserialize<PvpLeaderboardEntryandTime>(player!.ToString());
        }).ToList();
    }
    public async Task InsertToBracketActivityPage(string bracket, string region, PvpLeaderboardEntry oldPlayer, PvpLeaderboardEntry newPlayer, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        var OldPvpLeaderboardEntryandTime = new PvpLeaderboardEntryandTime
        {
            Character = oldPlayer.Character,
            Faction = oldPlayer.Faction,
            Rank = oldPlayer.Rank,
            Rating = oldPlayer.Rating,
            SeasonMatchStatistics = oldPlayer.SeasonMatchStatistics,
            Tier = oldPlayer.Tier,
            Time = DateTime.Now.Subtract(TimeSpan.FromHours(3))
        };
        var NewPvpLeaderboardEntryandTime = new PvpLeaderboardEntryandTime
        {
            Character = newPlayer.Character,
            Faction = newPlayer.Faction,
            Rank = newPlayer.Rank,
            Rating = newPlayer.Rating,
            SeasonMatchStatistics = newPlayer.SeasonMatchStatistics,
            Tier = newPlayer.Tier,
            Time = DateTime.Now
        };
        var newPlayerActivity = new PlayerActivity
        {
            OldPlayer = OldPvpLeaderboardEntryandTime,
            NewPlayer = NewPvpLeaderboardEntryandTime
        };
        var db = redis.GetDatabase();
        await db.ListRightPushAsync(flavor.KeyPrefix() + "actvity" + bracket + region, JsonSerializer.Serialize(newPlayerActivity));
    }
    public async Task BracketPlayerExpiration(string bracket, string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        var db = redis.GetDatabase(); //var to redis database
        string keyAndRegion = flavor.KeyPrefix() + "actvity" + bracket + region;
        var expiredPlayers = await GetBracketActivityPage(bracket, region);
        int c = 0;
        foreach (var expiredPlayer in expiredPlayers)
        {
            if (expiredPlayer == null || (DateTime.Now - expiredPlayer!.NewPlayer.Time) > TimeSpan.FromHours(12))
            {
                c++;
            }
        }
        if (c > 0)
        {
            await db.ListTrimAsync(keyAndRegion, c, -1);
        }
    }
    public async Task<IEnumerable<PlayerActivity?>> GetBracketActivityPage(string bracket, string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        var db = redis.GetDatabase(); //var to redis database
        string keyAndRegion = flavor.KeyPrefix() + "actvity" + bracket + region;
        var ladder = await db.ListRangeAsync(keyAndRegion);
        //convert player to pvpleaderboardentry (for our filtered list of strings)
        return ladder.Where(p => p.HasValue).Select(player =>
        {
            //deserialized out of json to become an object.
            return JsonSerializer.Deserialize<PlayerActivity>(player!.ToString());
        }).Where(p => p != null && p.NewPlayer != null && p.OldPlayer != null).ToList();
    }
    public async Task<IEnumerable<PlayerActivity?>> GetBracketClassFilteredActivityPage(string bracket, string region, string characterClass, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        var db = redis.GetDatabase(); //var to redis database
        string keyAndRegion = flavor.KeyPrefix() + "activity" + bracket + "_" + characterClass + "_" + region;
        var ladder = await db.ListRangeAsync(keyAndRegion);
        //convert player to pvpleaderboardentry (for our filtered list of strings)
        return ladder.Where(p => p.HasValue).Select(player =>
        {
            //deserialized out of json to become an object.
            return JsonSerializer.Deserialize<PlayerActivity>(player!.ToString());
        }).Where(p => p != null && p.NewPlayer != null && p.OldPlayer != null).ToList();
    }

    public async Task InsertActivityCacheClassCharacter(string bracket, PvpLeaderboardEntry oldPlayer, PvpLeaderboardEntry newPlayer, CharacterProfileSummary characterClass, string region, GameFlavor flavor = GameFlavor.MistsClassic)
    //these all return a string, allowing us to connect ed to cachedclasscharacters function
    {
        var OldPvpLeaderboardEntryandTime = new PvpLeaderboardEntryandTime
        {
            Character = oldPlayer.Character,
            Faction = oldPlayer.Faction,
            Rank = oldPlayer.Rank,
            Rating = oldPlayer.Rating,
            SeasonMatchStatistics = oldPlayer.SeasonMatchStatistics,
            Tier = oldPlayer.Tier,
            Time = DateTime.Now.Subtract(TimeSpan.FromHours(3))
        };
        var NewPvpLeaderboardEntryandTime = new PvpLeaderboardEntryandTime
        {
            Character = newPlayer.Character,
            Faction = newPlayer.Faction,
            Rank = newPlayer.Rank,
            Rating = newPlayer.Rating,
            SeasonMatchStatistics = newPlayer.SeasonMatchStatistics,
            Tier = newPlayer.Tier,
            Time = DateTime.Now
        };
        var newPlayerActivity = new PlayerActivity
        {
            OldPlayer = OldPvpLeaderboardEntryandTime,
            NewPlayer = NewPvpLeaderboardEntryandTime
        };
        if (oldPlayer == null) { return; }
        if (newPlayer == null) { return; }
        if (region == null) { return; }
        if (bracket == null) { return; }
        if (characterClass == null) { return; }
        if (characterClass.CharacterClass == null) { return; }
        string key = flavor.KeyPrefix() + "activity" + bracket + "_" + characterClass.CharacterClass.Name + "_" + region;
        var db = redis.GetDatabase(); //var to redis database
        //looks at a player, finds the correct data and puts it inside the key values, then goes inside of sectioned list of data
        var serializedPlayer = JsonSerializer.Serialize(newPlayerActivity);
        await db.ListRemoveAsync(key, serializedPlayer);
        await db.ListRightPushAsync(key, serializedPlayer);
    }
    public async Task BracketClassPlayerExpiration(string bracket, string region, string characterClass, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        var db = redis.GetDatabase(); //var to redis database
        string keyAndRegion = flavor.KeyPrefix() + "activity" + bracket + "_" + characterClass + "_" + region;
        var expiredPlayers = await GetBracketClassFilteredActivityPage(bracket, region, characterClass);
        int c = 0;
        foreach (var expiredPlayer in expiredPlayers)
        {
            if (expiredPlayer == null || (DateTime.Now - expiredPlayer!.NewPlayer.Time) > TimeSpan.FromHours(12))
            {
                c++;
            }
        }
        if (c > 0)
        {
            await db.ListTrimAsync(keyAndRegion, c, -1);
        }
    }
}
