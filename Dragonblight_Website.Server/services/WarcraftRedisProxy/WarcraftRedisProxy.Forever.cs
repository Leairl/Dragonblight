using System.Text.Json;
using ArgentPonyWarcraftClient;
using StackExchange.Redis;

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

    public async Task<CharacterProfessionsSummary?> GetForeverProfessions(string characterSlug, string region)
    {
        var ns = GetProfileRegion(region, GameFlavor.Forever);
        return await GetBlizzardDataCached<CharacterProfessionsSummary?>("GetForeverProfessions" + characterSlug + ns, async () =>
        {
            var result = await warcraftClient.GetForeverCharacterProfessionsAsync(characterSlug, ns, GetRegion(region), GetLocale(region));
            if (result?.Success == true)
            {
                return result.Value;
            }
            if (result?.Error?.Code == 404)
            {
                return null;
            }
            //Do not cache an upstream failure as an empty list of professions.
            throw new HttpRequestException("Blizzard Forever character professions request failed.");
        }, TimeSpan.FromHours(2));
    }

    public async Task<Recipe?> GetForeverRecipe(int recipeId, string region)
    {
        var ns = GetStaticRegion(region, GameFlavor.Forever);
        return await GetBlizzardDataCached<Recipe?>("ForeverRecipe" + recipeId + ns, async () =>
        {
            var result = await warcraftClient.GetRecipeAsync(recipeId, ns, GetRegion(region), GetLocale(region));
            return result?.Success == true ? result.Value : null;
        }, TimeSpan.FromDays(7));
    }

    public async Task<string?> GetForeverRecipeIcon(int recipeId, string region)
    {
        var ns = GetStaticRegion(region, GameFlavor.Forever);
        return await GetBlizzardDataCached<string?>("ForeverRecipeIcon" + recipeId + ns, async () =>
        {
            var result = await warcraftClient.GetRecipeMediaAsync(recipeId, ns, GetRegion(region), GetLocale(region));
            return result?.Success == true ? result.Value.Assets?.FirstOrDefault(asset => asset.Key == "icon")?.Value?.ToString() : null;
        }, TimeSpan.FromDays(7));
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

    //---- the stats page's sample: guilds, their rosters, and each member's spec ----

    public async Task<ForeverGuild?> GetForeverGuild(string guildSlug, string region)
    {
        var ns = GetProfileRegion(region, GameFlavor.Forever);
        return await GetBlizzardDataCached<ForeverGuild?>("GetForeverGuild" + guildSlug + ns, async () =>
        {
            var result = await warcraftClient.GetForeverGuildAsync(guildSlug, ns, GetRegion(region), GetLocale(region));
            if (result.Success)
            {
                return result.Value;
            }
            return null;
        }, TimeSpan.FromHours(12));
    }

    public async Task<ForeverGuildRoster?> GetForeverGuildRoster(string guildSlug, string region)
    {
        var ns = GetProfileRegion(region, GameFlavor.Forever);
        return await GetBlizzardDataCached<ForeverGuildRoster?>("GetForeverGuildRoster" + guildSlug + ns, async () =>
        {
            var result = await warcraftClient.GetForeverGuildRosterAsync(guildSlug, ns, GetRegion(region), GetLocale(region));
            if (result.Success)
            {
                return result.Value;
            }
            return null;
        }, TimeSpan.FromHours(12));
    }

    //The talent tree with the most points in the character's active group, e.g. "Marksmanship".
    //Empty when no points are spent, and also when Blizzard's API has no profile for the
    //character (a 404, which it gives for some characters its own guild rosters list): retrying
    //those every hour would never succeed. Null only when the call failed some other way, which
    //isn't cached and is tried again next run. Specs change rarely and this is one call per
    //character, so the answer is kept for three days.
    public async Task<string?> GetForeverSpecName(string characterSlug, string region)
    {
        var ns = GetProfileRegion(region, GameFlavor.Forever);
        return await GetBlizzardDataCached<string?>("GetForeverSpecName" + characterSlug + ns, async () =>
        {
            var result = await warcraftClient.GetForeverCharacterSpecializationsAsync(characterSlug, ns, GetRegion(region), GetLocale(region));
            //the client returns no result at all when an error response has no body
            if (result == null)
            {
                return null;
            }
            if (!result.Success)
            {
                if (result.Error?.Code == 404)
                {
                    return "";
                }
                return null;
            }
            var active = result.Value.SpecializationGroups?.FirstOrDefault(g => g.IsActive);
            var bestName = "";
            var bestPoints = 0;
            foreach (var tree in active?.Specializations ?? [])
            {
                var points = (tree.Talents ?? []).Sum(t => t.TalentRank);
                if (points > bestPoints)
                {
                    bestPoints = points;
                    bestName = tree.Specialization?.Name ?? "";
                }
            }
            return bestName;
        }, TimeSpan.FromDays(3));
    }

    //Forever's class and race names by id. Forever has races of its own (the Skyborne), so
    //these come from Forever's game data rather than a list in code.
    public async Task<ForeverNameLists?> GetForeverNameLists(string region)
    {
        var ns = GetStaticRegion(region, GameFlavor.Forever);
        return await GetBlizzardDataCached<ForeverNameLists?>("GetForeverNameLists" + ns, async () =>
        {
            var classes = await warcraftClient.GetPlayableClassesIndexAsync(ns, GetRegion(region), GetLocale(region));
            var races = await warcraftClient.GetPlayableRacesIndexAsync(ns, GetRegion(region), GetLocale(region));
            if (!classes.Success || !races.Success)
            {
                return null;
            }
            return new ForeverNameLists
            {
                Classes = classes.Value.Classes.ToDictionary(c => c.Id, c => c.Name),
                Races = races.Value.Races.ToDictionary(r => r.Id, r => r.Name),
            };
        }, TimeSpan.FromDays(7));
    }

    //Every character in the sample, one hash field each ("region:slug"), so a run can update
    //the characters it saw without rewriting the rest.
    private static readonly string ForeverStatsCharactersKey = GameFlavor.Forever.KeyPrefix() + "StatsCharacters";
    private static readonly string ForeverStatsSummaryKey = GameFlavor.Forever.KeyPrefix() + "StatsSummary";

    public async Task SaveForeverStatsCharacters(IEnumerable<ForeverStatsCharacter> characters)
    {
        var entries = characters
            .Select(c => new HashEntry(c.Region + ":" + c.Slug, JsonSerializer.Serialize(c)))
            .ToArray();
        if (entries.Length == 0)
        {
            return;
        }
        await redis.GetDatabase().HashSetAsync(ForeverStatsCharactersKey, entries);
    }

    public async Task<List<ForeverStatsCharacter>> GetForeverStatsCharacters()
    {
        var entries = await redis.GetDatabase().HashGetAllAsync(ForeverStatsCharactersKey);
        var characters = new List<ForeverStatsCharacter>();
        foreach (var entry in entries)
        {
            var character = JsonSerializer.Deserialize<ForeverStatsCharacter>(entry.Value.ToString());
            if (character != null)
            {
                characters.Add(character);
            }
        }
        return characters;
    }

    //the sample's records for these characters, by slug; characters the crawl hasn't seen are left out
    public async Task<Dictionary<string, ForeverStatsCharacter>> GetForeverStatsCharacters(IEnumerable<string> characterSlugs, string region)
    {
        var slugs = characterSlugs.Select(s => s.ToLowerInvariant()).Distinct().ToArray();
        var found = new Dictionary<string, ForeverStatsCharacter>();
        if (slugs.Length == 0)
        {
            return found;
        }
        var fields = slugs.Select(s => (RedisValue)(region + ":" + s)).ToArray();
        var values = await redis.GetDatabase().HashGetAsync(ForeverStatsCharactersKey, fields);
        for (var i = 0; i < slugs.Length; i++)
        {
            if (values[i].IsNullOrEmpty)
            {
                continue;
            }
            var character = JsonSerializer.Deserialize<ForeverStatsCharacter>(values[i].ToString());
            if (character != null)
            {
                found[slugs[i]] = character;
            }
        }
        return found;
    }

    //one character from the sample, or null when the crawl hasn't seen them in a roster
    public async Task<ForeverStatsCharacter?> GetForeverStatsCharacter(string characterSlug, string region)
    {
        var value = await redis.GetDatabase().HashGetAsync(ForeverStatsCharactersKey, region + ":" + characterSlug.ToLowerInvariant());
        if (value.IsNullOrEmpty)
        {
            return null;
        }
        return JsonSerializer.Deserialize<ForeverStatsCharacter>(value.ToString());
    }

    public async Task RemoveForeverStatsCharacters(IEnumerable<ForeverStatsCharacter> characters)
    {
        var fields = characters.Select(c => (RedisValue)(c.Region + ":" + c.Slug)).ToArray();
        if (fields.Length == 0)
        {
            return;
        }
        await redis.GetDatabase().HashDeleteAsync(ForeverStatsCharactersKey, fields);
    }

    public async Task SaveForeverStatsSummary(ForeverStatsSummary summary)
    {
        await SaveToRedis(ForeverStatsSummaryKey, summary, null);
    }

    public async Task<ForeverStatsSummary?> GetForeverStatsSummary()
    {
        return await GetRedisData<ForeverStatsSummary>(ForeverStatsSummaryKey);
    }
}
