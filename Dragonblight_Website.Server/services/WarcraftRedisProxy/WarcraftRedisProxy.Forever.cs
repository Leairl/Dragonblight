using System.Collections.Concurrent;
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

    public async Task<ForeverPvpSummary?> GetForeverPvpSummary(string characterSlug, string region)
    {
        var ns = GetProfileRegion(region, GameFlavor.Forever);
        return await GetBlizzardDataCached<ForeverPvpSummary?>("GetForeverPvpSummary" + characterSlug + ns, async () =>
        {
            var result = await warcraftClient.GetForeverCharacterPvpSummaryAsync(characterSlug, ns, GetRegion(region), GetLocale(region));
            if (result?.Success == true)
            {
                return result.Value;
            }
            if (result?.Error?.Code == 404)
            {
                return null;
            }
            throw new HttpRequestException("Blizzard Forever character PvP summary request failed.");
        }, TimeSpan.FromHours(2));
    }

    public async Task<ForeverCharacterStatistics?> GetForeverCharacterStats(string characterSlug, string region)
    {
        var ns = GetProfileRegion(region, GameFlavor.Forever);
        return await GetBlizzardDataCached<ForeverCharacterStatistics?>("GetForeverCharacterStats" + characterSlug + ns, async () =>
        {
            var result = await warcraftClient.GetForeverCharacterStatisticsAsync(characterSlug, ns, GetRegion(region), GetLocale(region));
            if (result?.Success == true)
            {
                return result.Value;
            }
            if (result?.Error?.Code == 404)
            {
                return null;
            }
            throw new HttpRequestException("Blizzard Forever character statistics request failed.");
        }, TimeSpan.FromHours(2));
    }

    public async Task<ForeverReputationsSummary?> GetForeverReputations(string characterSlug, string region)
    {
        var ns = GetProfileRegion(region, GameFlavor.Forever);
        return await GetBlizzardDataCached<ForeverReputationsSummary?>("GetForeverReputations" + characterSlug + ns, async () =>
        {
            var result = await warcraftClient.GetForeverCharacterReputationsAsync(characterSlug, ns, GetRegion(region), GetLocale(region));
            if (result?.Success == true)
            {
                return result.Value;
            }
            if (result?.Error?.Code == 404)
            {
                return null;
            }
            throw new HttpRequestException("Blizzard Forever character reputations request failed.");
        }, TimeSpan.FromHours(2));
    }

    public async Task<ForeverAchievementsSummary?> GetForeverAchievements(string characterSlug, string region)
    {
        var ns = GetProfileRegion(region, GameFlavor.Forever);
        return await GetBlizzardDataCached<ForeverAchievementsSummary?>("GetForeverAchievements" + characterSlug + ns, async () =>
        {
            var result = await warcraftClient.GetForeverCharacterAchievementsAsync(characterSlug, ns, GetRegion(region), GetLocale(region));
            if (result?.Success == true) return result.Value;
            if (result?.Error?.Code == 404) return null;
            throw new HttpRequestException("Blizzard Forever character achievements request failed.");
        }, TimeSpan.FromHours(2));
    }

    //One of a character's collections: null when Blizzard has none for the character (404), an
    //exception for any other failure so it isn't cached as an empty collection.
    private Task<T?> GetForeverCollection<T>(string name, string characterSlug, string region,
        Func<string, string, Region, Locale, Task<RequestResult<T>>> call) where T : class
    {
        var ns = GetProfileRegion(region, GameFlavor.Forever);
        return GetBlizzardDataCached<T?>("GetForever" + name + characterSlug + ns, async () =>
        {
            var result = await call(characterSlug, ns, GetRegion(region), GetLocale(region));
            if (result?.Success == true) return result.Value;
            if (result?.Error?.Code == 404) return null;
            throw new HttpRequestException($"Blizzard Forever character {name.ToLowerInvariant()} request failed.");
        }, TimeSpan.FromHours(2));
    }

    public Task<ForeverMountsCollection?> GetForeverMounts(string characterSlug, string region)
        => GetForeverCollection("Mounts", characterSlug, region, warcraftClient.GetForeverCharacterMountsAsync);

    public Task<ForeverPetsCollection?> GetForeverPets(string characterSlug, string region)
        => GetForeverCollection("Pets", characterSlug, region, warcraftClient.GetForeverCharacterPetsAsync);

    public Task<ForeverToysCollection?> GetForeverToys(string characterSlug, string region)
        => GetForeverCollection("Toys", characterSlug, region, warcraftClient.GetForeverCharacterToysAsync);

    public Task<ForeverTransmogsCollection?> GetForeverTransmogs(string characterSlug, string region)
        => GetForeverCollection("Transmogs", characterSlug, region, warcraftClient.GetForeverCharacterTransmogsAsync);

    //How many mounts, pets and toys Forever's game data has, for "collected of total". Null when any
    //index failed; a cached null counts as a miss, so the next request asks again.
    public async Task<ForeverCollectionTotals?> GetForeverCollectionTotals(string region)
    {
        var ns = GetStaticRegion(region, GameFlavor.Forever);
        return await GetBlizzardDataCached<ForeverCollectionTotals?>("GetForeverCollectionTotals" + ns, async () =>
        {
            var mounts = warcraftClient.GetForeverMountsIndexAsync(ns, GetRegion(region), GetLocale(region));
            var pets = warcraftClient.GetForeverPetsIndexAsync(ns, GetRegion(region), GetLocale(region));
            var toys = warcraftClient.GetForeverToysIndexAsync(ns, GetRegion(region), GetLocale(region));
            await Task.WhenAll(mounts, pets, toys);
            if (mounts.Result?.Success != true || pets.Result?.Success != true || toys.Result?.Success != true)
            {
                return null;
            }
            return new ForeverCollectionTotals
            {
                mounts = mounts.Result.Value.Mounts?.Length ?? 0,
                pets = pets.Result.Value.Pets?.Length ?? 0,
                toys = toys.Result.Value.Toys?.Length ?? 0,
            };
        }, TimeSpan.FromDays(7));
    }

    //Static achievement and recipe data is shared by every character, so one cold page can ask for
    //dozens of definitions and icons at once. Only the Blizzard calls are throttled, and the limit is
    //process-wide: cached lookups never wait, and several visitors at once can't multiply the load.
    private static readonly SemaphoreSlim ForeverStaticFetches = new(8);

    //A definition or icon Blizzard reports missing (404) is remembered for a day, so a recipe with no icon
    //doesn't call Blizzard on every view. Other failures are not cached and the next request retries.
    private record StaticLookup<T>(T? Value);

    private async Task<TValue?> GetForeverStaticCached<TResult, TValue>(string key, Func<Task<RequestResult<TResult>>> call, Func<TResult, TValue?> select)
    {
        var versionedKey = VersionedKey(key);
        var cached = await GetRedisData<StaticLookup<TValue>>(versionedKey);
        if (cached != null)
        {
            return cached.Value;
        }
        var lookup = await FetchOnce(key, async () =>
        {
            RequestResult<TResult>? result;
            await ForeverStaticFetches.WaitAsync();
            try
            {
                result = await call();
            }
            finally
            {
                ForeverStaticFetches.Release();
            }
            if (result?.Success == true)
            {
                var found = new StaticLookup<TValue>(select(result.Value));
                await SaveToRedis(versionedKey, found, TimeSpan.FromDays(7));
                return found;
            }
            if (result?.Error?.Code == 404)
            {
                var missing = new StaticLookup<TValue>(default);
                await SaveToRedis(versionedKey, missing, TimeSpan.FromDays(1));
                return missing;
            }
            return new StaticLookup<TValue>(default);
        });
        return lookup.Value;
    }

    private static string? IconAsset(IEnumerable<Asset>? assets)
        => assets?.FirstOrDefault(asset => asset.Key == "icon")?.Value?.ToString();

    public Task<ForeverAchievement?> GetForeverAchievement(int achievementId, string region)
    {
        var ns = GetStaticRegion(region, GameFlavor.Forever);
        return GetForeverStaticCached<ForeverAchievement, ForeverAchievement>("ForeverAchievementLookup" + achievementId + ns,
            () => warcraftClient.GetForeverAchievementAsync(achievementId, ns, GetRegion(region), GetLocale(region)), value => value);
    }

    public Task<string?> GetForeverAchievementIcon(int achievementId, string region)
    {
        var ns = GetStaticRegion(region, GameFlavor.Forever);
        return GetForeverStaticCached<AchievementMedia, string>("ForeverAchievementIconLookup" + achievementId + ns,
            () => warcraftClient.GetAchievementMediaAsync(achievementId, ns, GetRegion(region), GetLocale(region)), media => IconAsset(media.Assets));
    }

    //Legacy Points have no endpoint of their own: Forever awards them through achievements whose
    //reward reads "Earn 1 Legacy Point." This maps each such achievement to the points it gives,
    //from every achievement definition (about 176, each cached and throttled like the tab's own
    //lookups). Null when any definition couldn't be read, so a partial list is never kept.
    private static readonly System.Text.RegularExpressions.Regex LegacyReward = new(@"(\d+)\s+Legacy Points?", System.Text.RegularExpressions.RegexOptions.IgnoreCase);

    public async Task<Dictionary<int, int>?> GetForeverLegacyRewards(string region)
    {
        var ns = GetStaticRegion(region, GameFlavor.Forever);
        return await GetBlizzardDataCached<Dictionary<int, int>?>("GetForeverLegacyRewards" + ns, async () =>
        {
            var index = await warcraftClient.GetAchievementsIndexAsync(ns, GetRegion(region), GetLocale(region));
            if (index?.Success != true)
            {
                return null;
            }
            var definitions = await Task.WhenAll(index.Value.Achievements.Select(a => GetForeverAchievement(a.Id, region)));
            if (definitions.Any(d => d == null))
            {
                return null;
            }
            var rewards = new Dictionary<int, int>();
            foreach (var definition in definitions)
            {
                var match = LegacyReward.Match(definition!.RewardDescription ?? "");
                if (match.Success)
                {
                    rewards[definition.Id] = int.Parse(match.Groups[1].Value);
                }
            }
            return rewards;
        }, TimeSpan.FromDays(7));
    }

    public Task<Recipe?> GetForeverRecipe(int recipeId, string region)
    {
        var ns = GetStaticRegion(region, GameFlavor.Forever);
        return GetForeverStaticCached<Recipe, Recipe>("ForeverRecipeLookup" + recipeId + ns,
            () => warcraftClient.GetRecipeAsync(recipeId, ns, GetRegion(region), GetLocale(region)), value => value);
    }

    //Every recipe in a profession's skill tier (Tailoring has about 470), with the category the
    //game files it under. The profile only lists what a character knows; this is what they could.
    //Kept for a week like the other static lookups; a tier Blizzard doesn't have is cached as missing.
    //Forever's game data also carries Season of Discovery's recipes, filed under a category of their
    //own in every profession; they aren't in Forever, so they are left out.
    public Task<ForeverSkillTierRecipe[]?> GetForeverSkillTierRecipes(int professionId, int skillTierId, string region)
    {
        var ns = GetStaticRegion(region, GameFlavor.Forever);
        return GetForeverStaticCached<SkillTier, ForeverSkillTierRecipe[]>("ForeverSkillTierRecipes" + professionId + "-" + skillTierId + ns,
            () => warcraftClient.GetSkillTierAsync(professionId, skillTierId, ns, GetRegion(region), GetLocale(region)),
            tier => (tier.Categories ?? [])
                .Where(category => !string.Equals(category.Name, "Season of Discovery", StringComparison.OrdinalIgnoreCase))
                .SelectMany(category => (category.Recipes ?? []).Select(recipe => new ForeverSkillTierRecipe
                {
                    id = recipe.Id,
                    name = recipe.Name ?? "",
                    category = category.Name ?? "",
                }))
                .ToArray());
    }

    public Task<string?> GetForeverRecipeIcon(int recipeId, string region)
    {
        var ns = GetStaticRegion(region, GameFlavor.Forever);
        return GetForeverStaticCached<RecipeMedia, string>("ForeverRecipeIconLookup" + recipeId + ns,
            () => warcraftClient.GetRecipeMediaAsync(recipeId, ns, GetRegion(region), GetLocale(region)), media => IconAsset(media.Assets));
    }

    //A mount's picture is the render of its first creature display; mounts have no icon of their own.
    public async Task<string?> GetForeverMountImage(int mountId, string region)
    {
        var ns = GetStaticRegion(region, GameFlavor.Forever);
        var displayId = await GetForeverStaticCached<ForeverMount, int>("ForeverMountDisplayLookup" + mountId + ns,
            () => warcraftClient.GetForeverMountAsync(mountId, ns, GetRegion(region), GetLocale(region)),
            mount => mount.CreatureDisplays?.FirstOrDefault()?.Id ?? 0);
        if (displayId <= 0)
        {
            return null;
        }
        return await GetForeverStaticCached<CreatureDisplayMedia, string>("ForeverCreatureDisplayLookup" + displayId + ns,
            () => warcraftClient.GetCreatureDisplayMediaAsync(displayId, ns, GetRegion(region), GetLocale(region)),
            media => media.Assets?.FirstOrDefault(asset => asset.Key == "zoom")?.Value?.ToString());
    }

    public Task<string?> GetForeverPetIcon(int petId, string region)
    {
        var ns = GetStaticRegion(region, GameFlavor.Forever);
        return GetForeverStaticCached<ForeverPet, string>("ForeverPetIconLookup" + petId + ns,
            () => warcraftClient.GetForeverPetAsync(petId, ns, GetRegion(region), GetLocale(region)), pet => pet.Icon);
    }

    public async Task<string?> GetForeverToyIcon(int toyId, string region)
    {
        var ns = GetStaticRegion(region, GameFlavor.Forever);
        var mediaId = await GetForeverStaticCached<ForeverToy, int>("ForeverToyMediaLookup" + toyId + ns,
            () => warcraftClient.GetForeverToyAsync(toyId, ns, GetRegion(region), GetLocale(region)), toy => toy.Media?.Id ?? 0);
        if (mediaId <= 0)
        {
            return null;
        }
        return await GetForeverItemMediaIcon(mediaId, ns, region);
    }

    //Icons are shared by many items and appearances, so they are cached by item media id.
    private Task<string?> GetForeverItemMediaIcon(int mediaId, string ns, string region)
        => GetForeverStaticCached<ItemMedia, string>("ForeverItemIconLookup" + mediaId + ns,
            () => warcraftClient.GetItemMediaAsync(mediaId, ns, GetRegion(region), GetLocale(region)), media => IconAsset(media.Assets));

    //---- appearances: which item each collected appearance belongs to ----

    //Every equippable item's appearances, as one hash per region: field = appearance id, value = the
    //item's name, quality and icon media. A character collects hundreds of appearances and Blizzard
    //has no bulk lookup by appearance, but the whole catalog is about 8 item searches, so it is built
    //once a week and each character page reads only its own fields.
    private static string AppearanceCatalogKey(string ns) => GameFlavor.Forever.KeyPrefix() + "AppearanceCatalog_" + ns;
    private static string AppearanceCatalogBuiltKey(string ns) => AppearanceCatalogKey(ns) + "_built";
    private static readonly string[] QualityOrder = ["POOR", "COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "ARTIFACT", "HEIRLOOM"];

    public async Task<Dictionary<int, ForeverAppearanceName>> GetForeverAppearanceNames(IReadOnlyCollection<int> appearanceIds, string region)
    {
        var found = new Dictionary<int, ForeverAppearanceName>();
        if (appearanceIds.Count == 0)
        {
            return found;
        }
        var ns = GetStaticRegion(region, GameFlavor.Forever);
        await EnsureAppearanceCatalog(ns, region);
        var ids = appearanceIds.Distinct().ToArray();
        var values = await redis.GetDatabase().HashGetAsync(AppearanceCatalogKey(ns), ids.Select(id => (RedisValue)id).ToArray());
        for (var i = 0; i < ids.Length; i++)
        {
            if (!values[i].IsNullOrEmpty && JsonSerializer.Deserialize<ForeverAppearanceName>(values[i].ToString()) is { } name)
            {
                found[ids[i]] = name;
            }
        }
        return found;
    }

    private async Task EnsureAppearanceCatalog(string ns, string region)
    {
        if (await redis.GetDatabase().KeyExistsAsync(AppearanceCatalogBuiltKey(ns)))
        {
            return;
        }
        await FetchOnce("AppearanceCatalog" + ns, () => BuildAppearanceCatalog(ns, region));
    }

    //Built under a temporary key and renamed into place, so readers never see half a catalog. When
    //Blizzard fails part way the old catalog, if any, stays and the next request tries again.
    private async Task<bool> BuildAppearanceCatalog(string ns, string region)
    {
        var locale = GetLocale(region).ToString();
        var best = new Dictionary<int, (ForeverAppearanceName name, int rank, int itemId)>();
        var fromId = 0;
        for (var page = 0; page < 100; page++)
        {
            var result = await warcraftClient.SearchForeverEquippableItemsAsync(fromId, ns, GetRegion(region));
            if (result?.Success != true)
            {
                throw new HttpRequestException("Blizzard Forever item search failed while building the appearance catalog.");
            }
            var items = result.Value.Results?.Select(r => r.Data).OfType<ForeverSearchItem>().ToArray() ?? [];
            foreach (var item in items)
            {
                var quality = item.Quality?.Type;
                var rank = Array.IndexOf(QualityOrder, quality);
                var name = item.Name?.GetValueOrDefault(locale) ?? item.Name?.GetValueOrDefault("en_US");
                foreach (var appearance in item.Appearances ?? [])
                {
                    //several items can share a look; name it after the best of them, then the oldest
                    if (best.TryGetValue(appearance.Id, out var current) && (current.rank > rank || (current.rank == rank && current.itemId < item.Id)))
                    {
                        continue;
                    }
                    best[appearance.Id] = (new ForeverAppearanceName { name = name, quality = quality, mediaId = item.Media?.Id }, rank, item.Id);
                }
            }
            if (items.Length < 1000)
            {
                break;
            }
            fromId = items[^1].Id + 1;
        }
        var db = redis.GetDatabase();
        var building = AppearanceCatalogKey(ns) + "_building";
        await db.KeyDeleteAsync(building);
        var entries = best.Select(pair => new HashEntry(pair.Key, JsonSerializer.Serialize(pair.Value.name))).ToArray();
        if (entries.Length > 0)
        {
            await db.HashSetAsync(building, entries);
            await db.KeyRenameAsync(building, AppearanceCatalogKey(ns));
        }
        await db.StringSetAsync(AppearanceCatalogBuiltKey(ns), DateTime.UtcNow.ToString("O"), TimeSpan.FromDays(7));
        return true;
    }

    //An appearance's icon: its item's (catalogMediaId, from GetForeverAppearanceNames). An appearance
    //with no item links to an item media id that 404s, but that id is the icon's file id, which is
    //all the render URL needs.
    public async Task<string?> GetForeverAppearanceIcon(int appearanceId, int? catalogMediaId, string region)
    {
        var ns = GetStaticRegion(region, GameFlavor.Forever);
        if (catalogMediaId > 0)
        {
            return await GetForeverItemMediaIcon(catalogMediaId.Value, ns, region);
        }
        var fileId = await GetForeverStaticCached<ForeverItemAppearance, int>("ForeverAppearanceMediaLookup" + appearanceId + ns,
            () => warcraftClient.GetForeverItemAppearanceAsync(appearanceId, ns, GetRegion(region), GetLocale(region)), a => a.Media?.Id ?? 0);
        return fileId > 0 ? $"https://render.worldofwarcraft.com/forever-{region}/icons/56/{fileId}.jpg" : null;
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

    //---- the talents tab ----

    //A character's talent groups with every talent and rank. Kept apart from GetForeverSpecName,
    //which keeps only the spec name for three days; this is the full answer, for two hours.
    public async Task<ForeverSpecializations?> GetForeverSpecializations(string characterSlug, string region)
    {
        var ns = GetProfileRegion(region, GameFlavor.Forever);
        return await GetBlizzardDataCached<ForeverSpecializations?>("GetForeverSpecializations" + characterSlug + ns, async () =>
        {
            var result = await warcraftClient.GetForeverCharacterSpecializationsAsync(characterSlug, ns, GetRegion(region), GetLocale(region));
            if (result == null || !result.Success)
            {
                return null;
            }
            return result.Value;
        }, TimeSpan.FromHours(2));
    }

    //The part of a tree the talents tab draws: four columns from the tree's leftmost talent, rows
    //1 to 11 (shownNodes in forever-talents.tsx). Blizzard's data has a few talents outside it that
    //the game never shows; they are kept, but without an icon, which saves a call each.
    private const int ShownTreeColumns = 4;
    private const int LastShownTreeRow = 11;
    //icon calls at a time for each tree; the three trees are built together, so up to 24 at once,
    //well inside Blizzard's limit of 100 a second
    private const int ParallelIconCalls = 8;

    //A class's three talent trees as the game lays them out, with each talent's icon. Built from
    //the class (its specs, in the game's order), each spec (its tree's id), each tree (the talents
    //and their grid slots) and each talent's spell (its icon), so it is a few dozen calls the first
    //time. The three trees are built at once, so a cold build costs about as long as one tree.
    //Talent trees only change with a patch, so they're kept for a week; ForeverStatsService warms them
    //for every class each run, so a visitor rarely meets a cold build. When an icon lookup failed
    //(Blizzard answers some calls with an error under load), the trees are kept for 10 minutes instead,
    //so the missing icons are filled in by the next build rather than left out for the week.
    //Raise to rebuild every class's trees under a new key, e.g. after trees were cached with icons
    //missing: version 2 came with the icon retry, replacing trees cached a week before it.
    private const int ClassTalentsVersion = 2;

    public async Task<ForeverClassTalents?> GetForeverClassTalents(int classId, string region)
    {
        var ns = GetStaticRegion(region, GameFlavor.Forever);
        var key = VersionedKey("GetForeverClassTalents" + ClassTalentsVersion + "-" + classId + ns);
        var cached = await GetRedisData<ForeverClassTalents>(key);
        if (cached != null)
        {
            return cached;
        }
        return await FetchOnce(key, async () =>
        {
            var playableClass = await warcraftClient.GetPlayableClassAsync(classId, ns, GetRegion(region), GetLocale(region));
            if (playableClass == null || !playableClass.Success)
            {
                return null;
            }
            var specs = playableClass.Value.Specializations ?? [];
            //Task.WhenAll keeps the specs in the game's order
            var built = await Task.WhenAll(specs.Select(spec => GetForeverTalentTreeLayout(spec.Id, ns, region)));
            if (built.Any(tree => tree.layout == null))
            {
                //nothing is cached then, so the next visit builds it again; the icons fetched so far
                //are cached on their own, so that rebuild is cheaper
                logger.LogWarning("Forever talents: Blizzard returned no tree for a spec of class {ClassId} in {Region}.", classId, region);
                return null;
            }
            var talents = new ForeverClassTalents { ClassId = classId, Trees = built.Select(tree => tree.layout!).ToList() };
            var missingIcons = built.Sum(tree => tree.missingIcons);
            var keepFor = TimeSpan.FromDays(7);
            if (missingIcons > 0)
            {
                logger.LogWarning("Forever talents: {Count} icons for class {ClassId} in {Region} couldn't be fetched; kept briefly so they're tried again.", missingIcons, classId, region);
                keepFor = TimeSpan.FromMinutes(10);
            }
            await SaveToRedis(key, talents, keepFor);
            return talents;
        });
    }

    //A spell's icon image, or "" when it has none; null when the lookup failed, and isn't cached then.
    //Kept for a month on its own, so a class's trees rebuilt after their week, or after a failed
    //build, don't fetch every icon again. A failed lookup is tried once more before giving up.
    private async Task<string?> GetForeverSpellIcon(int spellId, string ns, string region)
    {
        return await GetBlizzardDataCached<string?>("GetForeverSpellIcon" + spellId + ns, async () =>
        {
            for (var attempt = 0; attempt < 2; attempt++)
            {
                if (attempt > 0)
                {
                    await Task.Delay(500);
                }
                var media = await warcraftClient.GetSpellMediaAsync(spellId, ns, GetRegion(region), GetLocale(region));
                if (media != null && media.Success)
                {
                    return media.Value.Assets?.FirstOrDefault(a => a.Key == "icon")?.Value?.ToString() ?? "";
                }
            }
            return null;
        }, TimeSpan.FromDays(30));
    }

    //A spec's tree, and how many of its shown talents' icons couldn't be fetched; the layout is null
    //when Blizzard returned no tree.
    private async Task<(ForeverTalentTreeLayout? layout, int missingIcons)> GetForeverTalentTreeLayout(int specId, string ns, string region)
    {
        var spec = await warcraftClient.GetPlayableSpecializationAsync(specId, ns, GetRegion(region), GetLocale(region));
        if (spec == null || !spec.Success)
        {
            return (null, 0);
        }
        //the spec only links its tree: .../data/wow/talent-tree/1089/playable-specialization/134
        var treeId = TalentTreeIdOf(spec.Value.SpecTalentTree?.Key?.Href);
        if (treeId == null)
        {
            return (null, 0);
        }
        var tree = await warcraftClient.GetTalentTreeAsync(treeId.Value, specId, ns, GetRegion(region), GetLocale(region));
        if (tree == null || !tree.Success)
        {
            return (null, 0);
        }

        var layout = new ForeverTalentTreeLayout { SpecId = specId, SpecName = spec.Value.Name ?? "" };
        var talentNodes = (tree.Value.SpecializationTalentNodes ?? [])
            .Where(node => node.Ranks?.FirstOrDefault()?.Tooltip?.Talent != null)
            .ToList();
        var onGrid = talentNodes.Where(node => node.DisplayRow >= 1 && node.DisplayRow <= LastShownTreeRow).ToList();
        var firstColumn = onGrid.Count > 0 ? onGrid.Min(node => node.DisplayColumn) : 0;
        bool IsShown(TalentNode node) =>
            node.DisplayRow >= 1 && node.DisplayRow <= LastShownTreeRow
            && node.DisplayColumn >= firstColumn && node.DisplayColumn < firstColumn + ShownTreeColumns;

        var nodes = new ConcurrentBag<ForeverTalentNode>();
        var missingIcons = 0;
        var options = new ParallelOptions { MaxDegreeOfParallelism = ParallelIconCalls };
        await Parallel.ForEachAsync(talentNodes, options, async (node, _) =>
        {
            var firstRank = node.Ranks!.First().Tooltip!;
            var spellId = firstRank.SpellTooltip?.Spell?.Id ?? 0;
            var icon = "";
            if (spellId != 0 && IsShown(node))
            {
                var fetched = await GetForeverSpellIcon(spellId, ns, region);
                if (fetched == null)
                {
                    Interlocked.Increment(ref missingIcons);
                }
                icon = fetched ?? "";
            }
            nodes.Add(new ForeverTalentNode
            {
                NodeId = node.Id,
                Row = (int)node.DisplayRow,
                Column = (int)node.DisplayColumn,
                MaxRank = node.Ranks?.Length ?? 0,
                TalentId = firstRank.Talent!.Id,
                SpellId = spellId,
                Name = firstRank.Talent.Name ?? "",
                Icon = icon,
                RankDescriptions = (node.Ranks ?? []).Select(r => r.Tooltip?.SpellTooltip?.Description ?? "").ToList(),
                LockedBy = (node.LockedBy ?? []).ToList(),
            });
        });
        layout.Nodes = nodes.OrderBy(n => n.Row).ThenBy(n => n.Column).ToList();
        return (layout, missingIcons);
    }

    private static int? TalentTreeIdOf(Uri? href)
    {
        if (href == null)
        {
            return null;
        }
        var segments = href.AbsolutePath.Trim('/').Split('/');
        var at = Array.IndexOf(segments, "talent-tree");
        if (at >= 0 && at + 1 < segments.Length && int.TryParse(segments[at + 1], out var id))
        {
            return id;
        }
        return null;
    }
}
