using System.Security.Cryptography;
using System.Text;
using ArgentPonyWarcraftClient;

partial class WarcraftRedisProxy
{
    //Alt tracking: these achievements are account wide, so every character on a battle.net account
    //reports the same completion timestamp for them. Joining those timestamps into one key gives a
    //ready made list of the account's characters.
    private static int[] AltAchievements(GameFlavor flavor) => flavor switch
    {
        GameFlavor.Retail => [40142, 9911, 7380, 7433],
        GameFlavor.MistsClassic => [15, 7382],
        _ => [],
    };

    //a missing achievement counts as timestamp 0 rather than dropping the character: an account that
    //never earned one never earned it on any of its characters, so its characters still agree and
    //still meet on the same key. Null only when every timestamp is 0 - that key says nothing about
    //an account and would gather every character that has none of these achievements, which is what
    //a classic character looks like, since these ids are retail.
    private static string? AltListKey(CharacterAchievementsSummary achievements, string region, GameFlavor flavor)
    {
        var stamps = new List<string>();
        var found = 0;
        foreach (var id in AltAchievements(flavor))
        {
            var achievement = achievements?.Achievements?.FirstOrDefault(a => a.Id == id && a.CompletedTimestamp != null);
            if (achievement == null)
            {
                stamps.Add("0");
                continue;
            }
            found++;
            stamps.Add(achievement.CompletedTimestamp!.Value.ToUnixTimeMilliseconds().ToString());
        }
        if (found == 0)
        {
            return null;
        }
        //the timestamps joined are the real key; hashing only keeps it short
        var digest = SHA256.HashData(Encoding.UTF8.GetBytes(string.Join("+", stamps)));
        return flavor.KeyPrefix() + "AltList-" + region.ToLowerInvariant() + "-" + Convert.ToHexString(digest)[..16];
    }

    //a set, so a character that is looked up twice is stored once
    public async Task InsertAltList(string server, string characterName, string region, CharacterAchievementsSummary achievements, GameFlavor flavor)
    {
        var key = AltListKey(achievements, region, flavor);
        var character = achievements?.Character;
        if (key == null || character == null || character.Id == 0)
        {
            return;
        }
        await RecordCharacter(character.Id, character.Name, character.Realm.Slug, region, flavor);
        var db = redis.GetDatabase();
        await db.SetAddAsync(key, character.Id.ToString());
        await db.StringSetAsync(VersionedKey("AltKey" + server + characterName + region + flavor.KeyPrefix()), key, TimeSpan.FromDays(2));
    }

    //the ladder sync route in: the achievements payload is over a megabyte per character, far too
    //much to hold for every character on every ladder, so this one fetches it, files the character
    //under its alt key and throws the payload away. The marker it leaves behind is a few bytes and
    //keeps the same character from being fetched again for a day.
    public async Task IndexAltList(string server, string characterName, string region, GameFlavor flavor)
    {
        //the ladder hands over "Awakenx"; blizzard's profile route and every alt list member are lowercase
        server = server.ToLowerInvariant();
        characterName = characterName.ToLowerInvariant();
        var db = redis.GetDatabase();
        var marker = VersionedKey("AltIndexed" + server + characterName + region + flavor.KeyPrefix());
        if (await db.KeyExistsAsync(marker))
        {
            return;
        }
        var profileRegion = GetProfileRegion(region, flavor);
        var achievements = await warcraftClient.GetCharacterAchievementsSummaryAsync(server, characterName, profileRegion, GetRegion(profileRegion), GetLocale(profileRegion));
        if (achievements == null || !achievements.Success)
        {
            return;
        }
        await InsertAltList(server, characterName, region, achievements.Value, flavor);
        //only marked once the character is actually filed, so a failed fetch is retried next sync
        await db.StringSetAsync(marker, "1", TimeSpan.FromDays(1));
    }

//the account's other characters - the alt key comes from the copy InsertAltList saved, and only
//falls back to the achievements payload when that has expired; it can be up to a day behind
    public async Task<List<CharacterIdentity>> GetAlts(string server, string characterName, string region, GameFlavor flavor)
    {
        var db = redis.GetDatabase();
        var altKey = await db.StringGetAsync(VersionedKey("AltKey" + server + characterName + region + flavor.KeyPrefix()));
        string? key = "";
        if (altKey.HasValue)
        {
            key = altKey.ToString();
        }
        else
        {
            key = null;
        }

        if (key == null)
        {
            var achievements = await GetCharacterAchievements(server, characterName, region, flavor);
            key = AltListKey(achievements, region, flavor);
            return new List<CharacterIdentity>();
        }
        var self = (await GetCharSummary(server, characterName, region, flavor))?.Id ?? 0;
        var entries = await db.SetMembersAsync(key);
        var alts = new List<CharacterIdentity>();

        //remove older entries with char,server in redis
        foreach (var entry in entries.Where(m => m.ToString().Contains(',')))
        {
            var oldEntrySave = entry.ToString().Split(',');
            await GetCharacterAchievements(oldEntrySave[1], oldEntrySave[0], region, flavor); //re-files whoever has that name now, by id
            await db.SetRemoveAsync(key, entry);
        }
        //reads db set after cleaning up old entries
        var altIds = await db.SetMembersAsync(key);
        //prevents character youre currently looking at from displaying as its own alt
        //and connects alts to the right identity key
        foreach (var altId in altIds)
        {
            var id = (int)altId;
            if (id == self)
            {
                continue;
            }
            var identity = await GetCharacterIdentity(id, region, flavor);
            if (identity != null)
            {
                alts.Add(identity);
            }
        }
        return alts;
    }
}