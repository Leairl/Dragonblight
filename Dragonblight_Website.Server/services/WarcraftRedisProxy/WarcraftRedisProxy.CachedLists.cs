using System.Text.Json;
using ArgentPonyWarcraftClient;
using Dragonblight_Website.Server.Helpers;
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
        var wowClasses = (await GetPlayableClasses(region, flavor)).Select(c => c.Name).Prepend("All Classes");
        var db = redis.GetDatabase(); //var to redis database
        //clears all cached class characters
        foreach (var wowClass in wowClasses)
        {
            await db.KeyDeleteAsync(flavor.KeyPrefix() + bracket + "_" + wowClass + "_" + region);
            await BracketClassPlayerExpiration(bracket, region, wowClass, flavor);
        }
    }
    public async Task SavePvpCharacterSummary(PvpCharacterSummary newPvpCharacterSummary, string bracket, string region, GameFlavor flavor)
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
                // connects to snapshotted ladder to fetch all spec ladder data at once
                PvpLeaderboard ladder = await GetLeaderboard(region, soloBracket.Name, flavor);
                PvpLeaderboardEntry? specEntry = ladder.Entries.FirstOrDefault(e => e?.Character.Id == soloOverallEntry.Character.Id);
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
        var serializedPvPCharSummary = JsonSerializer.Serialize(newPvpCharacterSummary);
        await db.ListRightPushAsync(key, serializedPvPCharSummary);

    }
    public async Task ClearPvpCharacterSummary(string bracket, string region, GameFlavor flavor)
    {
        var db = redis.GetDatabase();
        await db.KeyDeleteAsync(flavor.KeyPrefix() + bracket + "_" + region + "_LADDER_COMBINED");

    }
    public async Task<List<PvpCharacterSummary?>> GetPvpLeaderSummaries(string bracket, string region, GameFlavor flavor)
    {
        var db = redis.GetDatabase(); //var to redis database
        var characterList = await db.ListRangeAsync(flavor.KeyPrefix() + bracket + "_" + region + "_LADDER_COMBINED");
        return characterList.Where(p => p.HasValue).Select(player =>
        {
            //deserialized out of json to become an object.
            return JsonSerializer.Deserialize<PvpCharacterSummary>(player!.ToString());
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
        await db.ListSetByIndexAsync(key, index, JsonSerializer.Serialize(summary));
    }
}
