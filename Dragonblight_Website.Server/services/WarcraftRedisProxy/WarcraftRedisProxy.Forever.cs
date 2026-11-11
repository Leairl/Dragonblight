using ArgentPonyWarcraftClient;

//WoW: Forever characters. Forever has no realms, so these are keyed by region and the
//character's "name-surname" slug instead of a realm and name. Each returns null when
//Blizzard has nothing for the character; a cached null counts as a miss, so the next
//visit asks Blizzard again.
partial class WarcraftRedisProxy
{
    //Forever characters that have been looked up, as "slug,region", for the search box.
    //The same idea as CachedCharacters, kept apart because Forever entries have no realm.
    private static readonly string ForeverCachedCharactersKey = GameFlavor.Forever.KeyPrefix() + "CachedCharacters";

    public async Task<List<string>> ForeverCachedCharacters()
    {
        var db = redis.GetDatabase();
        var characterList = await db.ListRangeAsync(ForeverCachedCharactersKey);
        return characterList.Select(character => character.ToString()).ToList();
    }

    //removed first so a character looked up again isn't listed twice
    public async Task InsertForeverCachedCharacter(string characterSlug, string region)
    {
        var db = redis.GetDatabase();
        var entry = characterSlug.ToLowerInvariant() + "," + region;
        await db.ListRemoveAsync(ForeverCachedCharactersKey, entry);
        await db.ListRightPushAsync(ForeverCachedCharactersKey, entry);
    }

    public async Task<ForeverCharacterProfile?> GetForeverCharacter(string characterSlug, string region)
    {
        var ns = GetProfileRegion(region, GameFlavor.Forever);
        return await GetBlizzardDataCached<ForeverCharacterProfile?>("GetForeverCharacter" + characterSlug + ns, async () =>
        {
            var result = await warcraftClient.GetForeverCharacterProfileAsync(characterSlug, ns, GetRegion(region), GetLocale(region));
            if (result.Success)
            {
                return result.Value;
            }
            return null;
        }, TimeSpan.FromHours(2));
    }

    public async Task<CharacterEquipmentSummary?> GetForeverEquipment(string characterSlug, string region)
    {
        var ns = GetProfileRegion(region, GameFlavor.Forever);
        return await GetBlizzardDataCached<CharacterEquipmentSummary?>("GetForeverEquipment" + characterSlug + ns, async () =>
        {
            var result = await warcraftClient.GetForeverCharacterEquipmentAsync(characterSlug, ns, GetRegion(region), GetLocale(region));
            if (result.Success)
            {
                return result.Value;
            }
            return null;
        }, TimeSpan.FromHours(2));
    }

    //Forever's character images can 404 for many hours after the profile works, so a
    //missing image is normal here, not an error
    public async Task<CharacterMediaSummary?> GetForeverMedia(string characterSlug, string region)
    {
        var ns = GetProfileRegion(region, GameFlavor.Forever);
        return await GetBlizzardDataCached<CharacterMediaSummary?>("GetForeverMedia" + characterSlug + ns, async () =>
        {
            var result = await warcraftClient.GetForeverCharacterMediaAsync(characterSlug, ns, GetRegion(region), GetLocale(region));
            if (result.Success)
            {
                return result.Value;
            }
            return null;
        }, TimeSpan.FromDays(1));
    }
}
