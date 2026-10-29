using System.Collections;
using ArgentPonyWarcraftClient;
using StackExchange.Redis;

//A character's profile endpoints: summary, appearance, achievements, equipment, stats and bracket
//ratings. Each comes from Blizzard and is cached, and an empty result is fetched once more in
//case the first call caught Blizzard mid-failure.
partial class WarcraftRedisProxy
{

    private static string IdentityKey(int id, string region, GameFlavor flavor)
    {
        return flavor.KeyPrefix() + "identity-" + region.ToLowerInvariant() + "-" + id;
    }

    public async Task<CharacterIdentity?> GetCharacterIdentity(int id, string region, GameFlavor flavor)
    {
        return await GetRedisData<CharacterIdentity>(IdentityKey(id, region, flavor));
    }
    //Saves the character identity into an instance of a class 
    // if either its new or we already had one. If we had one it'll do checks to make sure 
    // that we aren't including the same names in the previous_names list. Also we are removing
    // old characters from the search bar
    public async Task RecordCharacter(int id, string name, string realm, string region, GameFlavor flavor)
    {
        var identity = await GetCharacterIdentity(id, region, flavor);
        if (identity == null)
        {
            identity = new CharacterIdentity();
            identity.Id = id;
            identity.Name = name;
            identity.Realm = realm;
            identity.PreviousNames = new List<PreviousCharacterName>();
        }
        //found an old name saved
        else
        {
            var oldName = identity.Name;
            var oldRealm = identity.Realm;
            if (oldName.ToLowerInvariant() != name.ToLowerInvariant()
            || oldRealm.ToLowerInvariant() != realm.ToLowerInvariant())
            {
                var PreviousName = new PreviousCharacterName();
                PreviousName.Name = oldName;
                PreviousName.Realm = oldRealm;
                // searches if current name is in the list of old names,
                // removes from the list if it is, and moves previousname up in the list
                identity.PreviousNames.RemoveAll(p =>
                p.Name.Equals(oldName, StringComparison.OrdinalIgnoreCase) ||
                p.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
                identity.PreviousNames.Insert(0, PreviousName);
                var db = redis.GetDatabase(); //var to redis database
                await db.ListRemoveAsync(flavor.KeyPrefix() + "CachedCharacters", oldName.ToLower() + "," + oldRealm + "," + GetProfileRegion(region, flavor));
                identity.Name = name;
                identity.Realm = realm;
            }
        }
        await SaveToRedis(IdentityKey(id, region, flavor), identity, null);
    }
}