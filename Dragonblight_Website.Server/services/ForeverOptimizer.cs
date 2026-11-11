using System.Globalization;
using ArgentPonyWarcraftClient;
using System.Text.Json;

//Reads the stats out of an enchant's or consumable's effect text, the way the game words it:
//"Increases Agility by 25", "grant +7 Agility", "add 6 to intellect and 5 to spirit",
//"increase spell damage and healing by up to 6", "Restores 455 to 585 health".
//Percentages (critical hit, hit, dodge) are kept as percentage points.
public static class ForeverEffectParser
{
    //Longest phrases first, so "ranged attack power" is never read as "attack power".
    private static readonly (string[] words, string stat)[] Phrases = BuildPhrases();

    private static (string[] words, string stat)[] BuildPhrases()
    {
        var phrases = new List<(string phrase, string stat)>
        {
            ("healing done by spells and effects", "heal"),
            ("damage done by magical spells and effects", "spdmg"),
            ("points of damage to damage spells", "spdmg"),
            ("chance to critically hit", "crit"),
            ("fire spell damage", "fire"),
            ("frost spell damage", "frost"),
            ("shadow spell damage", "shadow"),
            ("nature spell damage", "nature"),
            ("arcane spell damage", "arcane"),
            ("holy spell damage", "holy"),
            ("maximum health", "health"),
            ("maximum mana", "mana"),
            ("attack and casting speed", "haste"),
            ("spell damage and healing", "sp"),
            ("damage and healing done by magical spells", "sp"),
            ("damage and healing", "sp"),
            ("spell power", "sp"),
            ("spellpower", "sp"),
            ("points of healing", "heal"),
            ("healing power", "heal"),
            ("healing done", "heal"),
            ("healing spells", "heal"),
            ("healing", "heal"),
            ("ranged attack power", "rap"),
            ("attack power", "ap"),
            ("spell damage", "spdmg"),
            ("fire damage", "fire"),
            ("frost damage", "frost"),
            ("shadow damage", "shadow"),
            ("nature damage", "nature"),
            ("arcane damage", "arcane"),
            ("holy damage", "holy"),
            ("points of damage", "wdmg"),
            ("chance to dodge", "dodge"),
            ("chance to block", "block"),
            ("resistance", "resistance"),
            ("critical strike", "crit"),
            ("critical hit", "crit"),
            ("chance to hit", "hit"),
            ("hit chance", "hit"),
            ("mana every 5", "mp5"),
            ("mana per 5", "mp5"),
            ("health every 5", "hp5"),
            ("health per 5", "hp5"),
            ("all stats", "all"),
            ("all attributes", "all"),
            ("stats", "all"),
            ("strength", "str"),
            ("agility", "agi"),
            ("stamina", "sta"),
            ("intellect", "int"),
            ("spirit", "spi"),
            ("armor", "armor"),
            ("defense", "def"),
            ("dodge", "dodge"),
            ("haste", "haste"),
            ("parry", "parry"),
            ("damage", "wdmg"),
        };
        return phrases
            .Select(p => (p.phrase.Split(' '), p.stat))
            .OrderByDescending(p => p.Item1.Length)
            .ToArray();
    }

    //Effects that only apply sometimes or somewhere: a proc, a creature type, a zone. Their stats
    //would overstate the item, so the sentence is left out; the weights file can value procs by hand.
    private static readonly string[] Conditional =
    [
        "often when", "chance on hit", "when struck", "while in ", "against ", " to beasts", " to elementals",
        " to demons", " to undead", " to dragonkin", " to giants",
        //protection potions absorb a school's damage rather than add to it
        "absorbs ",
        //damage dealt to enemies (Dragonfire, Caustic Smog), not a stat the drinker gains
        "deals ", "dealing ", "suffer ",
    ];

    //Stats a percentage makes sense for. "Intellect by 2%" is a multiplier, which can't be compared
    //with flat stats, so it is left out.
    private static readonly HashSet<string> PercentStats = ["crit", "hit", "dodge", "parry", "block", "haste"];

    //Words allowed between a stat and its number: "Agility by 3", "by up to 6", "armor value by 40",
    //"the defense skill of the wearer is increased by 3", and an armor kit's "defense value of an item
    //worn on the chest, legs, hands or feet by 3".
    private static readonly HashSet<string> Bridge =
    [
        "by", "up", "to", "value", "of", "rating", "skill", "the", "wearer", "is", "increased", "your",
        "an", "item", "worn", "on", "chest", "legs", "hands", "or", "feet", "goes",
    ];

    //What an enchant goes on, from its name ("Enchant Boots - Minor Agility"), or "kit" for an armor
    //kit, which goes on the chest, legs, hands or feet. Empty for anything else (spikes, chains).
    private static readonly (string prefix, string target)[] EnchantTargets =
    [
        ("Enchant Boots - ", "feet"), ("Enchant Bracer - ", "wrist"), ("Enchant Chest - ", "chest"),
        ("Enchant Cloak - ", "back"), ("Enchant Gloves - ", "hands"), ("Enchant Shield - ", "shield"),
        ("Enchant Off-Hand - ", "offhand"), ("Enchant Weapon - ", "weapon"), ("Enchant 2H Weapon - ", "2h"),
        ("Enchant Necklace - ", "neck"),
    ];

    public static string Target(string name, string effect)
    {
        foreach (var (prefix, target) in EnchantTargets)
        {
            if (name.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                return target;
            }
        }
        if (name.EndsWith("Armor Kit", StringComparison.OrdinalIgnoreCase) && effect.Contains("legs", StringComparison.OrdinalIgnoreCase))
        {
            return "kit";
        }
        return "";
    }

    public static ForeverEffect Parse(string text)
    {
        var effect = new ForeverEffect();
        var lower = WithoutThousands(text.ToLowerInvariant().Replace("\r", " ").Replace("\n", " ").Replace("use:", " "));
        //battleground-only draughts are no use anywhere else
        if (lower.Contains("only be used in pvp"))
        {
            return effect;
        }
        foreach (var sentence in Sentences(lower))
        {
            var tokens = sentence
                .Replace(",", " ").Replace(";", " ").Replace("(", " ").Replace(")", " ")
                .Split(' ', StringSplitOptions.RemoveEmptyEntries);
            //A one-time restore, not "restores 4 mana every 5 seconds", which is regeneration. Read before
            //the conditional check: Forever's Discolored healing potions heal and then "you also suffer"
            //part of it back, and they're still the healing potions alchemists make.
            if (tokens.Length > 0 && tokens[0] == "restores" && !tokens.Contains("every") && !tokens.Contains("per"))
            {
                ReadRestore(tokens, effect);
                continue;
            }
            if (Conditional.Any(marker => sentence.Contains(marker)))
            {
                continue;
            }
            ReadStats(tokens, effect);
            ReadItemLevel(tokens, effect);
        }
        return effect;
    }

    //"2,000" -> "2000", so the comma doesn't split the number; other commas stay
    private static string WithoutThousands(string text)
    {
        var kept = new System.Text.StringBuilder(text.Length);
        for (var i = 0; i < text.Length; i++)
        {
            var between = text[i] == ',' && i > 0 && i + 1 < text.Length && char.IsDigit(text[i - 1]) && char.IsDigit(text[i + 1]);
            if (!between)
            {
                kept.Append(text[i]);
            }
        }
        return kept.ToString();
    }

    //Splits on sentence ends but not on decimals like "1.5".
    private static IEnumerable<string> Sentences(string text)
    {
        var start = 0;
        for (var i = 0; i < text.Length; i++)
        {
            var end = text[i] == '.' && (i + 1 == text.Length || text[i + 1] == ' ');
            if (end)
            {
                yield return " " + text.Substring(start, i - start) + " ";
                start = i + 1;
            }
        }
        if (start < text.Length)
        {
            yield return " " + text.Substring(start) + " ";
        }
    }

    private static void ReadStats(string[] tokens, ForeverEffect effect)
    {
        var spellSentence = tokens.Any(t => t.StartsWith("spell"));
        var found = new List<(string stat, int start, int end, double? value, bool percent)>();
        var i = 0;
        while (i < tokens.Length)
        {
            var match = Phrases.FirstOrDefault(p => Matches(tokens, i, p.words));
            if (match.words == null)
            {
                i++;
                continue;
            }
            var end = i + match.words.Length;
            var (value, percent) = NumberAfter(tokens, end);
            if (value == null)
            {
                (value, percent) = NumberBefore(tokens, i);
            }
            found.Add((match.stat, i, end, value, percent));
            i = end;
        }
        //"25 Agility and Intellect": a stat with no number of its own shares its neighbour's
        for (var n = 0; n < found.Count; n++)
        {
            if (found[n].value != null)
            {
                continue;
            }
            if (n > 0 && found[n].start - found[n - 1].end == 1 && tokens[found[n].start - 1] == "and")
            {
                found[n] = found[n] with { value = found[n - 1].value, percent = found[n - 1].percent };
            }
            else if (n + 1 < found.Count && found[n + 1].start - found[n].end == 1 && tokens[found[n].end] == "and")
            {
                found[n] = found[n] with { value = found[n + 1].value, percent = found[n + 1].percent };
            }
        }
        foreach (var (stat, _, _, value, percent) in found)
        {
            if (value == null)
            {
                continue;
            }
            var key = stat;
            if (spellSentence && (stat == "crit" || stat == "hit"))
            {
                key = "spell" + stat;
            }
            if (percent && !PercentStats.Contains(stat))
            {
                continue;
            }
            if (key == "all")
            {
                foreach (var each in new[] { "str", "agi", "sta", "int", "spi" })
                {
                    Add(effect, each, value.Value);
                }
                continue;
            }
            Add(effect, key, value.Value);
        }
    }

    private static void Add(ForeverEffect effect, string stat, double value)
    {
        effect.stats.TryGetValue(stat, out var current);
        effect.stats[stat] = current + value;
    }

    private static bool Matches(string[] tokens, int at, string[] words)
    {
        if (at + words.Length > tokens.Length)
        {
            return false;
        }
        for (var w = 0; w < words.Length; w++)
        {
            if (tokens[at + w] != words[w])
            {
                return false;
            }
        }
        return true;
    }

    private static (double? value, bool percent) NumberAfter(string[] tokens, int from)
    {
        for (var i = from; i < tokens.Length && i < from + 15; i++)
        {
            var number = Number(tokens[i]);
            if (number.value != null)
            {
                return number;
            }
            if (!Bridge.Contains(tokens[i]))
            {
                break;
            }
        }
        return (null, false);
    }

    //"+7 Agility", "6 to intellect", or "30 additional armor"
    private static (double? value, bool percent) NumberBefore(string[] tokens, int at)
    {
        if (at >= 1 && tokens[at - 1] == "additional")
        {
            at--;
        }
        if (at >= 1)
        {
            var number = Number(tokens[at - 1]);
            if (number.value != null)
            {
                return number;
            }
        }
        if (at >= 2 && tokens[at - 1] == "to")
        {
            return Number(tokens[at - 2]);
        }
        return (null, false);
    }

    private static (double? value, bool percent) Number(string token)
    {
        var text = token.TrimStart('+');
        var percent = text.EndsWith('%');
        text = text.TrimEnd('%');
        if (text.Length > 0 && char.IsDigit(text[0]) && double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out var value))
        {
            return (value, percent);
        }
        return (null, false);
    }

    //"Restores 455 to 585 health." or "Restores 455 to 585 mana." The middle of the range.
    private static void ReadRestore(string[] tokens, ForeverEffect effect)
    {
        var numbers = tokens.Select(t => Number(t).value).Where(v => v != null).Select(v => v!.Value).ToArray();
        if (numbers.Length == 0)
        {
            return;
        }
        var amount = numbers.Take(2).Average();
        if (tokens.Contains("health"))
        {
            effect.healthRestored = amount;
        }
        else if (tokens.Contains("mana"))
        {
            effect.manaRestored = amount;
        }
    }

    //armor kits: "Only usable on items level 35 and above."
    private static void ReadItemLevel(string[] tokens, ForeverEffect effect)
    {
        for (var i = 0; i + 2 < tokens.Length; i++)
        {
            if (tokens[i] == "items" && tokens[i + 1] == "level")
            {
                var number = Number(tokens[i + 2]).value;
                if (number != null)
                {
                    effect.minItemLevel = (int)number.Value;
                }
            }
        }
    }
}

public class ForeverEffect
{
    public Dictionary<string, double> stats { get; set; } = new();
    public double healthRestored { get; set; }
    public double manaRestored { get; set; }
    public int minItemLevel { get; set; }
}

//ForeverStatWeights.json: how much each stat is worth to each spec, and stat values for effects the
//text can't express (procs like Crusader). Edit the file to tune suggestions; the server reads it at startup.
public class ForeverStatWeights
{
    //"Class/Spec" -> stat -> weight, e.g. "Rogue/Combat" -> { "agi": 1.9 }
    public Dictionary<string, Dictionary<string, double>> specs { get; set; } = new();
    //the spec to use when a character has no talent points yet, by class
    public Dictionary<string, string> defaultSpec { get; set; } = new();
    //item name -> the stats it's treated as having, in place of what its text says
    public Dictionary<string, Dictionary<string, double>> overrides { get; set; } = new();
    //classes that use mana, so they get a mana potion suggestion
    public List<string> manaUsers { get; set; } = new();
    //the phase Forever is in, and what each later phase adds, by the phase's number
    public int currentPhase { get; set; } = 1;
    public Dictionary<string, ForeverPhaseContent> laterPhases { get; set; } = new();

    //Whether an item belongs to a phase that isn't out yet: it's named in one, or a recipe for it comes
    //from one of its zones ("Drop: Ancient Guardian (Mount Hyjal)").
    public bool IsLaterPhase(ForeverEnhancement item, IReadOnlyDictionary<int, ForeverRecipeInfo> recipes)
    {
        foreach (var (phaseText, content) in laterPhases)
        {
            if (!int.TryParse(phaseText, out var phase) || phase <= currentPhase)
            {
                continue;
            }
            if (content.items.Contains(item.name, StringComparer.OrdinalIgnoreCase))
            {
                return true;
            }
            foreach (var recipeId in item.recipeIds)
            {
                if (!recipes.TryGetValue(recipeId, out var recipe))
                {
                    continue;
                }
                if (content.zones.Any(zone => recipe.source.Contains("(" + zone + ")", StringComparison.OrdinalIgnoreCase)))
                {
                    return true;
                }
            }
        }
        return false;
    }

    public static ForeverStatWeights Current { get; private set; } = new();

    public static void Load(string path)
    {
        if (!File.Exists(path))
        {
            Current = new ForeverStatWeights();
            return;
        }
        var loaded = JsonSerializer.Deserialize<ForeverStatWeights>(File.ReadAllText(path), new JsonSerializerOptions { ReadCommentHandling = JsonCommentHandling.Skip });
        if (loaded == null)
        {
            Current = new ForeverStatWeights();
            return;
        }
        Current = loaded;
    }

    //The weights for a character, and the "Class/Spec" they came from; null when there are none.
    public (Dictionary<string, double>? weights, string key) For(string className, string specName)
    {
        var key = className + "/" + specName;
        if (specName != "" && specs.TryGetValue(key, out var weights))
        {
            return (weights, key);
        }
        if (defaultSpec.TryGetValue(className, out var fallback))
        {
            key = className + "/" + fallback;
            if (specs.TryGetValue(key, out weights))
            {
                return (weights, key);
            }
        }
        return (null, "");
    }

    public double Score(Dictionary<string, double> weights, ForeverEnhancement item)
    {
        var stats = item.stats;
        if (overrides.TryGetValue(item.name, out var replaced))
        {
            stats = replaced;
        }
        double score = 0;
        foreach (var (stat, value) in stats)
        {
            if (weights.TryGetValue(stat, out var weight))
            {
                score += weight * value;
            }
            //unless weighted on their own, maximum health is worth Stamina at 10 health a point,
            //and maximum mana Intellect at 15 mana a point
            else if (stat == "health" && weights.TryGetValue("sta", out var stamina))
            {
                score += stamina * value / 10;
            }
            else if (stat == "mana" && weights.TryGetValue("int", out var intellect))
            {
                score += intellect * value / 15;
            }
        }
        return Math.Round(score, 1);
    }
}

//Picks the Optimize tab's suggestions for one character from the catalog.
public static class ForeverOptimizerPlanner
{
    private const int PerSlot = 3;
    private const int PerGroup = 3;

    //the slots that can take an enchant, in paperdoll order
    private static readonly string[] EnchantableSlots =
    [
        "NECK", "BACK", "CHEST", "WRIST", "HANDS", "LEGS", "FEET", "MAIN_HAND", "OFF_HAND",
    ];

    private static readonly HashSet<string> OneHandWeapons = ["WEAPON", "WEAPONMAINHAND", "WEAPONOFFHAND"];

    //In Classic, profession skill keeps pace with level at about 5 a level: skill caps and the
    //materials each tier uses follow level brackets (skill 150 uses level 30 materials).
    public const int SkillPerLevel = 5;

    public static ForeverOptimizePage Build(int level, string className, string specName, CharacterEquipmentSummary? equipment,
        ForeverOptimizerCatalog catalog, ForeverStatWeights weightsFile, IReadOnlyDictionary<int, ForeverRecipeInfo> recipes, bool showAll)
    {
        var skillCap = level * SkillPerLevel;
        //Content from a later phase is never suggested. Unless asked for everything, neither is what a
        //crafter of the character's level couldn't make yet: enchants have no level requirement, but a
        //level 29 can't get Crusader (Enchanting 300, level 60 materials).
        var available = catalog.items
            .Where(item => !weightsFile.IsLaterPhase(item, recipes))
            .Where(item => showAll || !(RequiredSkill(item, recipes) > skillCap))
            .ToList();
        catalog = new ForeverOptimizerCatalog { items = available };
        var (weights, key) = weightsFile.For(className, specName);
        var shownSpec = specName;
        var specIsDefault = false;
        if (key != "" && !key.EndsWith("/" + specName))
        {
            shownSpec = key.Substring(key.IndexOf('/') + 1);
            specIsDefault = true;
        }

        var slots = new List<ForeverOptimizedSlot>();
        foreach (var slotType in EnchantableSlots)
        {
            var equipped = equipment?.EquippedItems?.FirstOrDefault(item => item.Slot?.Type == slotType);
            if (equipped == null)
            {
                continue;
            }
            var itemLevel = (int)(equipped.Level?.Value ?? 0);
            var inventoryType = equipped.InventoryType?.Type ?? "";
            var candidates = catalog.items.Where(item => item.kind == "enchant" && Fits(item, slotType, inventoryType, itemLevel, level));
            var best = new List<ForeverSuggestion>();
            if (weights != null)
            {
                best = Ranked(candidates, weights, weightsFile, recipes, PerSlot);
            }
            //the game shows a permanent enchant under the item; oils and stones are temporary
            var current = equipped.Enchantments?.FirstOrDefault(e => e.EnchantmentSlot?.Type == "PERMANENT")
                ?? equipped.Enchantments?.FirstOrDefault(e => e.EnchantmentSlot?.Type != "TEMPORARY");
            slots.Add(new ForeverOptimizedSlot
            {
                slot = slotType,
                slotName = equipped.Slot?.Name ?? slotType,
                itemId = equipped.Item?.Id ?? 0,
                itemName = equipped.Name ?? "",
                currentEnchant = current?.DisplayString,
                currentEnchantItemId = current?.SourceItem?.Id,
                best = best,
            });
        }

        var usable = catalog.items.Where(item => item.requiredLevel <= level).ToList();
        var elixirs = new List<ForeverSuggestion>();
        var flasks = new List<ForeverSuggestion>();
        var potions = new List<ForeverSuggestion>();
        if (weights != null)
        {
            elixirs = Ranked(usable.Where(item => item.kind == "elixir"), weights, weightsFile, recipes, PerGroup);
            flasks = Ranked(usable.Where(item => item.kind == "flask"), weights, weightsFile, recipes, PerGroup);
            potions = Ranked(usable.Where(item => item.kind == "potion"), weights, weightsFile, recipes, PerGroup);
        }

        var healing = usable.Where(item => item.kind == "potion" && item.healthRestored > 0)
            .OrderByDescending(item => item.healthRestored).ThenBy(item => item.id).FirstOrDefault();
        ForeverEnhancement? mana = null;
        if (weightsFile.manaUsers.Contains(className))
        {
            mana = usable.Where(item => item.kind == "potion" && item.manaRestored > 0)
                .OrderByDescending(item => item.manaRestored).ThenBy(item => item.id).FirstOrDefault();
        }

        return new ForeverOptimizePage
        {
            level = level,
            className = className,
            specName = shownSpec,
            specIsDefault = specIsDefault,
            hasWeights = weights != null,
            slots = slots,
            elixirs = elixirs,
            flasks = flasks,
            potions = potions,
            healingPotion = Suggestion(healing, 0, recipes),
            manaPotion = Suggestion(mana, 0, recipes),
            skillCap = skillCap,
            showingAll = showAll,
        };
    }

    //Whether an enchant can go on the item in a slot. Weapon enchants go on any melee weapon (two-handed
    //too); two-handed ones only on two-handed weapons; armor kits on chest, legs, hands or feet items
    //of a high enough level, and only once the character can use the kit.
    private static bool Fits(ForeverEnhancement item, string slotType, string inventoryType, int itemLevel, int level)
    {
        switch (item.target)
        {
            case "neck": return slotType == "NECK";
            case "back": return slotType == "BACK";
            case "chest": return slotType == "CHEST";
            case "wrist": return slotType == "WRIST";
            case "hands": return slotType == "HANDS";
            case "feet": return slotType == "FEET";
            case "shield": return slotType == "OFF_HAND" && inventoryType == "SHIELD";
            case "offhand": return slotType == "OFF_HAND" && inventoryType == "HOLDABLE";
            case "2h": return slotType == "MAIN_HAND" && inventoryType == "TWOHWEAPON";
            case "weapon":
                if (slotType == "MAIN_HAND")
                {
                    return OneHandWeapons.Contains(inventoryType) || inventoryType == "TWOHWEAPON";
                }
                return slotType == "OFF_HAND" && OneHandWeapons.Contains(inventoryType);
            case "kit":
                var kitSlot = slotType == "CHEST" || slotType == "LEGS" || slotType == "HANDS" || slotType == "FEET";
                return kitSlot && itemLevel >= item.minItemLevel && item.requiredLevel <= level;
            default: return false;
        }
    }

    //The best few by the spec's weights, leaving out anything that doesn't help it.
    private static List<ForeverSuggestion> Ranked(IEnumerable<ForeverEnhancement> items, Dictionary<string, double> weights, ForeverStatWeights weightsFile,
        IReadOnlyDictionary<int, ForeverRecipeInfo> recipes, int take)
    {
        return items
            .Select(item => (item, score: weightsFile.Score(weights, item)))
            .Where(pair => pair.score > 0)
            .OrderByDescending(pair => pair.score)
            .ThenByDescending(pair => pair.item.requiredLevel)
            .ThenBy(pair => pair.item.id)
            .Take(take)
            .Select(pair => Suggestion(pair.item, pair.score, recipes)!)
            .ToList();
    }

    //The lowest skill any of its recipes needs; null when none is known.
    private static int? RequiredSkill(ForeverEnhancement item, IReadOnlyDictionary<int, ForeverRecipeInfo> recipes)
    {
        int? lowest = null;
        foreach (var recipeId in item.recipeIds)
        {
            if (recipes.TryGetValue(recipeId, out var recipe) && recipe.requiredSkill != null)
            {
                if (lowest == null || recipe.requiredSkill < lowest)
                {
                    lowest = recipe.requiredSkill;
                }
            }
        }
        return lowest;
    }

    private static ForeverSuggestion? Suggestion(ForeverEnhancement? item, double score, IReadOnlyDictionary<int, ForeverRecipeInfo> recipes)
    {
        if (item == null)
        {
            return null;
        }
        int? spellId = null;
        if (item.spellId > 0)
        {
            spellId = item.spellId;
        }
        return new ForeverSuggestion
        {
            id = item.id,
            spellId = spellId,
            name = item.name,
            effect = item.effect,
            requiredLevel = item.requiredLevel,
            requiredSkill = RequiredSkill(item, recipes),
            profession = item.profession,
            score = score,
        };
    }
}

//What a later phase adds: the zones it opens and any items to hold back by name.
public class ForeverPhaseContent
{
    public List<string> zones { get; set; } = new();
    public List<string> items { get; set; } = new();
}
