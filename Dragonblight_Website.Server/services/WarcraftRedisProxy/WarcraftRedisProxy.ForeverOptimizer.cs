using System.Text.Json;
using ArgentPonyWarcraftClient;

//The Optimize tab's catalog: Forever's potions, elixirs, flasks and permanent enhancements (enchants
//and armor kits), each with the stats its effect text gives. Forever's game data still carries Season
//of Discovery's items, which aren't in Forever, so only items a Forever profession makes are kept:
//their names match a recipe outside the professions' Season of Discovery category.
partial class WarcraftRedisProxy
{
    //item subclasses of the Consumable class (0) the tab suggests from
    private static readonly (int subclass, string kind)[] OptimizerSubclasses =
    [
        (1, "potion"), (2, "elixir"), (3, "flask"), (6, "enchant"),
    ];

    //Alchemy, Enchanting, Leatherworking, Blacksmithing, Engineering
    private static readonly int[] OptimizerProfessions = [171, 333, 165, 164, 202];

    //Raise when ForeverEnhancement gains a field, so a list cached by an older server (kept a week, and
    //across restarts) is rebuilt instead of serving the new field empty.
    private const int OptimizerCatalogVersion = 2;

    public async Task<ForeverOptimizerCatalog?> GetForeverOptimizerCatalog(string region)
    {
        var ns = GetStaticRegion(region, GameFlavor.Forever);
        var key = VersionedKey("ForeverOptimizerCatalog" + OptimizerCatalogVersion + ns);
        var cached = await GetRedisData<ForeverOptimizerCatalog>(key);
        if (cached != null)
        {
            return cached;
        }
        return await FetchOnce(key, () => BuildOptimizerCatalog(ns, region, key));
    }

    //A few hundred item lookups the first time, through the same throttle as the other static lookups.
    //Kept for a week when every lookup worked, and for an hour when some failed, so they're retried soon.
    private async Task<ForeverOptimizerCatalog?> BuildOptimizerCatalog(string ns, string region, string key)
    {
        //recipe name -> the recipes of that name, and their profession
        var made = new Dictionary<string, (List<int> ids, string profession)>(StringComparer.OrdinalIgnoreCase);
        foreach (var professionId in OptimizerProfessions)
        {
            var profession = await warcraftClient.GetProfessionAsync(professionId, ns, GetRegion(region), GetLocale(region));
            if (profession?.Success != true)
            {
                return null;
            }
            foreach (var tier in profession.Value.SkillTiers ?? [])
            {
                var recipes = await GetForeverSkillTierRecipes(professionId, tier.Id, region);
                foreach (var recipe in recipes ?? [])
                {
                    if (!made.TryGetValue(recipe.name, out var entry))
                    {
                        entry = (new List<int>(), profession.Value.Name ?? "");
                        made[recipe.name] = entry;
                    }
                    entry.ids.Add(recipe.id);
                }
            }
        }

        var locale = GetLocale(region).ToString();
        var found = new List<(int id, string name, string kind, List<int> recipeIds, string profession)>();
        foreach (var (subclass, kind) in OptimizerSubclasses)
        {
            var fromId = 0;
            for (var page = 0; page < 20; page++)
            {
                var result = await warcraftClient.SearchForeverConsumablesAsync(subclass, fromId, ns, GetRegion(region));
                if (result?.Success != true)
                {
                    return null;
                }
                var items = result.Value.Results?.Select(r => r.Data).OfType<ForeverSearchItem>().ToArray() ?? [];
                foreach (var item in items)
                {
                    var name = item.Name?.GetValueOrDefault(locale) ?? item.Name?.GetValueOrDefault("en_US") ?? "";
                    if (made.TryGetValue(name, out var recipe))
                    {
                        found.Add((item.Id, name, kind, recipe.ids, recipe.profession));
                    }
                }
                if (items.Length < 1000)
                {
                    break;
                }
                fromId = items[^1].Id + 1;
            }
        }

        var failed = 0;
        var read = await Task.WhenAll(found.Select(async entry =>
        {
            RequestResult<Item>? result;
            await ForeverStaticFetches.WaitAsync();
            try
            {
                result = await warcraftClient.GetItemAsync(entry.id, ns, GetRegion(region), GetLocale(region));
            }
            finally
            {
                ForeverStaticFetches.Release();
            }
            if (result?.Success != true)
            {
                Interlocked.Increment(ref failed);
                return null;
            }
            var enhancement = ForeverEnhancementFrom(result.Value, entry.name, entry.kind);
            if (enhancement != null)
            {
                enhancement.recipeIds = entry.recipeIds;
                enhancement.profession = entry.profession;
                //armor kits are drawn without Wowhead, so they need their icon from Blizzard
                if (enhancement.target == "kit")
                {
                    enhancement.icon = await ForeverItemIcon(entry.id, ns, region);
                    enhancement.wowheadIcon = await WowheadIconName(entry.id);
                }
            }
            return enhancement;
        }));

        //Some names are listed twice, as the real item and a level 1 copy (a level 1 Superior Mana
        //Potion); the real one is the one with the level requirement.
        var kept = read.OfType<ForeverEnhancement>()
            .GroupBy(item => item.kind + "|" + item.name)
            .Select(group => group.OrderByDescending(item => item.requiredLevel).ThenBy(item => item.id).First())
            .ToList();
        var catalog = new ForeverOptimizerCatalog { items = kept };
        var keepFor = TimeSpan.FromDays(7);
        if (failed > 0)
        {
            keepFor = TimeSpan.FromHours(1);
        }
        await SaveToRedis(key, catalog, keepFor);
        return catalog;
    }

    //Wowhead's tooltip data for a Forever item (dataEnv 16) names its icon. Only armor kits ask, about
    //15 items a week, one at a time. A failure just leaves the Blizzard icon in place.
    private static readonly HttpClient WowheadTooltips = CreateWowheadClient();
    private static readonly SemaphoreSlim WowheadTooltipFetches = new(1);

    private static HttpClient CreateWowheadClient()
    {
        var client = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
        client.DefaultRequestHeaders.UserAgent.ParseAdd("Dragonblight/1.0");
        return client;
    }

    private static async Task<string> WowheadIconName(int itemId)
    {
        await WowheadTooltipFetches.WaitAsync();
        try
        {
            using var response = await WowheadTooltips.GetAsync($"https://nether.wowhead.com/tooltip/item/{itemId}?dataEnv=16&locale=0");
            if (!response.IsSuccessStatusCode)
            {
                return "";
            }
            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            if (json.RootElement.TryGetProperty("icon", out var icon) && icon.ValueKind == JsonValueKind.String)
            {
                return icon.GetString() ?? "";
            }
            return "";
        }
        catch (Exception)
        {
            return "";
        }
        finally
        {
            WowheadTooltipFetches.Release();
        }
    }

    private async Task<string?> ForeverItemIcon(int itemId, string ns, string region)
    {
        await ForeverStaticFetches.WaitAsync();
        try
        {
            var media = await warcraftClient.GetItemMediaAsync(itemId, ns, GetRegion(region), GetLocale(region));
            if (media?.Success != true)
            {
                return null;
            }
            return IconAsset(media.Value.Assets);
        }
        finally
        {
            ForeverStaticFetches.Release();
        }
    }

    //null for an enhancement the tab can't place, like a shield spike or a fishing line
    private static ForeverEnhancement? ForeverEnhancementFrom(Item item, string name, string kind)
    {
        var effect = string.Join(" ", (item.PreviewItem?.Spells ?? []).Select(spell => spell.Description).Where(text => !string.IsNullOrEmpty(text)));
        var target = "";
        var spellId = 0;
        if (kind == "enchant")
        {
            target = ForeverEffectParser.Target(name, effect);
            if (target == "")
            {
                return null;
            }
            //"Enchant ..." scrolls cast the enchanting spell; armor kits are live items of their own
            if (name.StartsWith("Enchant ", StringComparison.OrdinalIgnoreCase))
            {
                spellId = item.PreviewItem?.Spells?.FirstOrDefault()?.Spell?.Id ?? 0;
            }
        }
        var parsed = ForeverEffectParser.Parse(effect);
        var shown = effect;
        if (shown.StartsWith("Use: "))
        {
            shown = shown.Substring("Use: ".Length);
        }
        return new ForeverEnhancement
        {
            id = item.Id,
            name = name,
            kind = kind,
            target = target,
            requiredLevel = item.RequiredLevel,
            spellId = spellId,
            quality = item.Quality?.Type ?? "",
            itemLevel = item.Level,
            effect = shown,
            stats = parsed.stats,
            healthRestored = parsed.healthRestored,
            manaRestored = parsed.manaRestored,
            minItemLevel = parsed.minItemLevel,
        };
    }
}
