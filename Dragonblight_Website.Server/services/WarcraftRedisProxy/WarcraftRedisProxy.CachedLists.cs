using System.Text.Json;
using ArgentPonyWarcraftClient;
using Dragonblight_Website.Server.Helpers;
using Microsoft.Extensions.Caching.Memory;
//The lists the site builds for itself: characters that have been looked up, ladder players by
//class, and the combined ladder summaries. Redis only - nothing here calls Blizzard.
partial class WarcraftRedisProxy
{
    //for this method, we are retrieving a list of characters for CachedCharacters
    public async Task<List<string>> CachedCharacters(GameFlavor flavor)
    {
        var db = redis.GetDatabase(); //var to redis database
        //CachedCharacters is the KEY for CachedCharacters method, ListRange makes CachedCharacters a list
        var characterList = await db.ListRangeAsync(flavor.KeyPrefix() + "CachedCharacters");
        return characterList.Select(character =>
        {
            //convert character to string (for our list of strings)
            return character.ToString();
        }).ToList();
    }

    //for this method, we are putting in a single character for InsertCacheCharacter
    public async Task InsertCacheCharacter(string characterName, string server, string region, GameFlavor flavor)
    {
        var db = redis.GetDatabase(); //var to redis database
        await db.ListRemoveAsync(flavor.KeyPrefix() + "CachedCharacters", characterName.ToLowerInvariant() + "," + server + "," + region);
        //CachedCharacters is the KEY for CachedCharacters method, and pushes character into already made list, string with commas seperated by it (JAX SAYS THIS IS BAD DONT REPLICATE)
        await db.ListRightPushAsync(flavor.KeyPrefix() + "CachedCharacters", characterName.ToLowerInvariant() + "," + server + "," + region);
    }
    public async Task<List<PvpLeaderboardEntry?>> CachedClassCharacters(string region, string characterClass, string bracket, GameFlavor flavor)
    {
        var db = redis.GetDatabase(); //var to redis database
        var parts = characterClass.Split(':');
        var className = parts[0];
        var specName = parts.Length > 1 ? parts[1] : null;
        //connect strings from InsertCacheClassCharacter to key in CachedClassCharacters
        string key = flavor.KeyPrefix() + bracket + "_" + className + "_" + region;
        //views filtered list from the key (changes from bracket or characterClass from InsertCacheClassCharacter)
        var characterList = await db.ListRangeAsync(key);
        //convert player to pvpleaderboardentry (for our filtered list of strings)
        //and for each entry with a specName / no spec asked for we add to our pvpleaderboardentry list
        return characterList
        .Where(p => p.HasValue)
        .Select(player => JsonSerializer.Deserialize<ClassLadderEntry>(player!.ToString()))
        .Where(p => specName == null || p?.Spec == specName)
        .ToList<PvpLeaderboardEntry?>();
    }
    public async Task ClearAllCachedClassCharacters(string bracket, string region, GameFlavor flavor)
    {
        var wowClasses = (await GetPlayableClasses(region, flavor)).Select(c => c.Name);
        var db = redis.GetDatabase(); //var to redis database
        //clears all cached class characters
        foreach (var wowClass in wowClasses)
        {
            await db.KeyDeleteAsync(flavor.KeyPrefix() + bracket + "_" + wowClass + "_" + region);
            await BracketClassPlayerExpiration(bracket, region, wowClass, flavor);
        }
    }
    //specLadderEntries: each Shuffle/Blitz spec ladder of this sync, by character id. The overall ladders look a
    //player's spec up here; reading the spec ladders from Redis for every player was several MB per read.
    public async Task SavePvpCharacterSummary(PvpCharacterSummary newPvpCharacterSummary, string bracket, string region, GameFlavor flavor,
        IReadOnlyDictionary<string, Dictionary<int, PvpLeaderboardEntry>> specLadderEntries)
    {
        //add spec and class of character from pvpleaderboardentries to dbleaderboardentries 
        var db = redis.GetDatabase();
        string key = flavor.KeyPrefix() + bracket + "_" + region + "_LADDER_COMBINED";
        var bracketSplit = bracket.Split('-');
        if (bracketSplit.Length == 3 && (bracketSplit[0] == "shuffle" || bracketSplit[0] == "blitz"))
        {
            newPvpCharacterSummary.spec = bracketSplit[2] ?? "";
        }
        // for overall solo brackets
        if (bracketSplit.Length == 2 && (bracketSplit[0] == "shuffle" || bracketSplit[0] == "blitz"))
        {
            var charClass = LadderNames.BracketName(newPvpCharacterSummary.charSummary.CharacterClass.Name);
            var bracketsIndex = await GetLeaderboardIndex(region, flavor);
            var brackets = bracketsIndex.Leaderboards.Where(soloSpec => soloSpec.Name.StartsWith(bracketSplit[0] + "-" + charClass)).ToList();
            var soloOverallEntry = newPvpCharacterSummary.PvpEntry;
            foreach (var soloBracket in brackets)
            {
                //a spec ladder that failed to snapshot has no entries to match against
                if (!specLadderEntries.TryGetValue(soloBracket.Name, out var ladderEntries)) continue;
                ladderEntries.TryGetValue(soloOverallEntry.Character.Id, out var specEntry);
                if (specEntry?.Rating == soloOverallEntry.Rating &&
                specEntry.SeasonMatchStatistics.Played == soloOverallEntry.SeasonMatchStatistics.Played &&
                specEntry.SeasonMatchStatistics.Won == soloOverallEntry.SeasonMatchStatistics.Won &&
                specEntry.SeasonMatchStatistics.Lost == soloOverallEntry.SeasonMatchStatistics.Lost)
                {
                    newPvpCharacterSummary.spec = soloBracket.Name.Split('-')[2];
                    break;
                }
            }
        }
        //gzipped: each entry carries the character's whole profile, and the list is ~20 MB for a big ladder
        await db.ListRightPushAsync(key, RedisCompression.Pack(newPvpCharacterSummary));

    }
    public async Task ClearPvpCharacterSummary(string bracket, string region, GameFlavor flavor)
    {
        var db = redis.GetDatabase();
        await db.KeyDeleteAsync(flavor.KeyPrefix() + bracket + "_" + region + "_LADDER_COMBINED");
        //a new sync starts from an empty ladder, so the copy in memory goes with it
        memoryCache.Remove(CombinedLadderMemoryKey(bracket, region, flavor));
    }

    //A combined ladder is several MB in Redis (about 8 MB for classic 3v3 US, 20 MB for retail), and every
    //command shares one Redis connection, so reading it for every page of 50 made the small reads queue
    //behind it until they timed out. The ladder is read once and kept in memory for every request for
    //this long. A sync pushes players one at a time, so the copy is not kept longer: the rankings page
    //still fills in during a sync, and a profile refresh that rewrites an entry shows up within this time.
    private static readonly TimeSpan CombinedLadderLifetime = TimeSpan.FromSeconds(30);

    private static string CombinedLadderMemoryKey(string bracket, string region, GameFlavor flavor)
    {
        return "CombinedLadder:" + flavor.KeyPrefix() + bracket + "_" + region;
    }

    public async Task<List<PvpCharacterSummary?>> GetPvpLeaderSummaries(string bracket, string region, GameFlavor flavor)
    {
        var memoryKey = CombinedLadderMemoryKey(bracket, region, flavor);
        //Lazy so requests that arrive while the ladder is loading wait on the same read instead of each starting one
        var load = memoryCache.GetOrCreate(memoryKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CombinedLadderLifetime;
            return new Lazy<Task<List<PvpCharacterSummary?>>>(() => ReadPvpLeaderSummaries(bracket, region, flavor));
        })!;
        try
        {
            var ladder = await load.Value;
            //callers get their own list, kept in Redis order: the profile page rewrites an entry by its index
            return new List<PvpCharacterSummary?>(ladder);
        }
        catch
        {
            //a failed read is not kept, so the next request tries Redis again
            memoryCache.Remove(memoryKey);
            throw;
        }
    }

    //One page of a combined ladder, read straight from Redis. The sync writes the ladder in rank order, so
    //the page is a range of the list and the rest of the ladder is never read or held in memory.
    public async Task<List<PvpCharacterSummary?>> GetPvpLeaderSummariesPage(string bracket, string region, GameFlavor flavor, int skip, int take)
    {
        if (take <= 0)
        {
            return [];
        }
        skip = Math.Max(skip, 0);
        var db = redis.GetDatabase();
        //LRANGE's stop index is inclusive
        var page = await db.ListRangeAsync(flavor.KeyPrefix() + bracket + "_" + region + "_LADDER_COMBINED", skip, skip + take - 1);
        return page.Where(p => p.HasValue).Select(player => RedisCompression.Unpack<PvpCharacterSummary>(player)).ToList();
    }

    private async Task<List<PvpCharacterSummary?>> ReadPvpLeaderSummaries(string bracket, string region, GameFlavor flavor)
    {
        var db = redis.GetDatabase(); //var to redis database
        var characterList = await db.ListRangeAsync(flavor.KeyPrefix() + bracket + "_" + region + "_LADDER_COMBINED");
        return characterList.Where(p => p.HasValue).Select(player =>
        {
            //deserialized out of json to become an object.
            return RedisCompression.Unpack<PvpCharacterSummary>(player);
        }).ToList();
    }
    public async Task InsertCacheClassCharacter(string bracket, PvpLeaderboardEntry player, CharacterProfileSummary characterClass, string specName, string region, GameFlavor flavor)
    //these all return a string, allowing us to connected to cachedclasscharacters function
    {
        if (region == null) { return; }
        if (bracket == null) { return; }
        if (characterClass == null) { return; }
        if (characterClass.CharacterClass == null) { return; }
        string key = flavor.KeyPrefix() + bracket + "_" + characterClass.CharacterClass.Name + "_" + region;
        var db = redis.GetDatabase(); //var to redis database
        //looks at a player, finds the correct data and puts it inside the key values, then goes inside of sectioned list of data
        var serializedPlayer = JsonSerializer.Serialize(new ClassLadderEntry(player) { Spec = specName });
        await db.ListRemoveAsync(key, serializedPlayer);
        await db.ListRightPushAsync(key, serializedPlayer);
    }

    // Replaces a Pvp character by looking at the index of a redis list whenever profile is pulled
    public async Task ReplacePvpCharacterSummary(int index, PvpCharacterSummary summary, string bracket, string region, GameFlavor flavor)
    {
        var db = redis.GetDatabase();
        string key = flavor.KeyPrefix() + bracket + "_" + region + "_LADDER_COMBINED";
        await db.ListSetByIndexAsync(key, index, RedisCompression.Pack(summary));
    }
}
