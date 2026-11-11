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

    public async Task<ForeverOptimizerCatalog?> GetForeverOptimizerCatalog(string region)
    {
        var ns = GetStaticRegion(region, GameFlavor.Forever);
        var key = VersionedKey("ForeverOptimizerCatalog" + ns);
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
            effect = shown,
            stats = parsed.stats,
            healthRestored = parsed.healthRestored,
            manaRestored = parsed.manaRestored,
            minItemLevel = parsed.minItemLevel,
        };
    }
}
