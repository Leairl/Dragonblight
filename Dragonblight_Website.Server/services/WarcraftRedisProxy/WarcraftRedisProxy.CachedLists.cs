using System.Text.Json;
using ArgentPonyWarcraftClient;

//The lists the site builds for itself: characters that have been looked up, ladder players by
//class, and the combined ladder summaries. Redis only - nothing here calls Blizzard.
partial class WarcraftRedisProxy
{
    //for this method, we are retrieving a list of characters for CachedCharacters
    public async Task<List<string>> CachedCharacters(GameFlavor flavor = GameFlavor.MistsClassic)
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
    public async Task InsertCacheCharacter(string characterName, string server, string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        var db = redis.GetDatabase(); //var to redis database
        await db.ListRemoveAsync(flavor.KeyPrefix() + "CachedCharacters", characterName.ToLowerInvariant() + "," + server + "," + region);
        //CachedCharacters is the KEY for CachedCharacters method, and pushes character into already made list, string with commas seperated by it (JAX SAYS THIS IS BAD DONT REPLICATE)
        await db.ListRightPushAsync(flavor.KeyPrefix() + "CachedCharacters", characterName.ToLowerInvariant() + "," + server + "," + region);
    }
    public async Task<List<PvpLeaderboardEntry?>> CachedClassCharacters(string region, string characterClass, string bracket, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        var db = redis.GetDatabase(); //var to redis database
        //connect strings from InsertCacheClassCharacter to key in CachedClassCharacters
        string key = flavor.KeyPrefix() + bracket + "_" + characterClass + "_" + region;

        //views filtered list from the key (changes from bracket or characterClass from InsertCacheClassCharacter)
        var characterList = await db.ListRangeAsync(key);
        //convert player to pvpleaderboardentry (for our filtered list of strings)
        return characterList.Where(p => p.HasValue).Select(player =>
        {
            //deserialized out of json to become an object.
            return JsonSerializer.Deserialize<PvpLeaderboardEntry>(player!.ToString());
        }).ToList();
    }
    public async Task ClearAllCachedClassCharacters(string bracket, string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        List<string> wowClasses = ["All Classes", "Warrior", "Paladin", "Hunter", "Rogue", "Priest", "Death Knight", "Shaman", "Mage", "Warlock", "Druid", "Monk"];
        var db = redis.GetDatabase(); //var to redis database
        //clears all cached class characters
        foreach (var wowClass in wowClasses)
        {
            await db.KeyDeleteAsync(flavor.KeyPrefix() + bracket + "_" + wowClass + "_" + region);
            await BracketClassPlayerExpiration(bracket, region, wowClass, flavor);
        }
    }
    public async Task SavePvpCharacterSummary(PvpCharacterSummary newPvpCharacterSummary, string bracket, string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        //add spec and class of character from pvpleaderboardentries to dbleaderboardentries 
        var db = redis.GetDatabase();
        string key = flavor.KeyPrefix() + bracket + "_" + region + "_LADDER_COMBINED";
        if (bracket.Contains("shuffle") || bracket.Contains("blitz"))
        {
            newPvpCharacterSummary.spec = bracket.Split('-')[2] ?? "";
        }
        var serializedPvPCharSummary = JsonSerializer.Serialize(newPvpCharacterSummary);
        if (bracket.Contains("shuffle"))
        {
            string shuffleKey = flavor.KeyPrefix() + "shuffle" + "_" + region + "_LADDER_COMBINED";
            await db.ListRemoveAsync(shuffleKey, serializedPvPCharSummary);
            await db.ListRightPushAsync(shuffleKey, serializedPvPCharSummary);
        }
        if (bracket.Contains("blitz"))
        {
            string blitzKey = flavor.KeyPrefix() + "blitz" + "_" + region + "_LADDER_COMBINED";
            await db.ListRemoveAsync(blitzKey, serializedPvPCharSummary);
            await db.ListRightPushAsync(blitzKey, serializedPvPCharSummary);
        }
        await db.ListRemoveAsync(key, serializedPvPCharSummary);
        await db.ListRightPushAsync(key, serializedPvPCharSummary);

    }
        public async Task ClearPvpCharacterSummary(string bracket, string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        var db = redis.GetDatabase();
        await db.KeyDeleteAsync(flavor.KeyPrefix() + bracket + "_" + region + "_LADDER_COMBINED");

    }
    public async Task<List<PvpCharacterSummary?>> GetPvpLeaderSummaries(string bracket, string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        var db = redis.GetDatabase(); //var to redis database
        var characterList = await db.ListRangeAsync(flavor.KeyPrefix() + bracket + "_" + region + "_LADDER_COMBINED");
        return characterList.Where(p => p.HasValue).Select(player =>
        {
            //deserialized out of json to become an object.
            return JsonSerializer.Deserialize<PvpCharacterSummary>(player!.ToString());
        }).ToList();
    }
    public async Task InsertCacheClassCharacter(string bracket, PvpLeaderboardEntry player, CharacterProfileSummary characterClass, string region, GameFlavor flavor = GameFlavor.MistsClassic)
    //these all return a string, allowing us to connected to cachedclasscharacters function
    {
        if (region == null) { return; }
        if (bracket == null) { return; }
        if (characterClass == null) { return; }
        if (characterClass.CharacterClass == null) { return; }
        string key = flavor.KeyPrefix() + bracket + "_" + characterClass.CharacterClass.Name + "_" + region;
        var db = redis.GetDatabase(); //var to redis database
        //looks at a player, finds the correct data and puts it inside the key values, then goes inside of sectioned list of data
        var serializedPlayer = JsonSerializer.Serialize(player);
        await db.ListRemoveAsync(key, serializedPlayer);
        await db.ListRightPushAsync(key, serializedPlayer);
    }
}
