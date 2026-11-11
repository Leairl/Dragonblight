//The WoW: Forever character page's Optimize tab.

//An enchant, armor kit, potion, elixir or flask, read from Forever's item data.
public class ForeverEnhancement
{
    public int id { get; set; }
    public string name { get; set; } = "";
    //"enchant", "potion", "elixir" or "flask"
    public string kind { get; set; } = "";
    //for an enchant, what it goes on: feet, wrist, chest, back, hands, neck, shield, offhand, weapon,
    //2h, or kit (an armor kit: chest, legs, hands or feet)
    public string target { get; set; } = "";
    public int requiredLevel { get; set; }
    //the recipes that make it, and their profession; their required skill and where they come from are
    //read from ForeverRecipes.tsv when the tab is built, so a new file takes effect without a rebuild
    public List<int> recipeIds { get; set; } = new();
    public string profession { get; set; } = "";
    //For an enchant: the enchanting spell its scroll casts. Forever's enchant scrolls are PTR only, so
    //the page links the spell an enchanter casts on live servers instead of the scroll.
    public int spellId { get; set; }
    //the item's own effect text, as Blizzard words it
    public string effect { get; set; } = "";
    public Dictionary<string, double> stats { get; set; } = new();
    public double healthRestored { get; set; }
    public double manaRestored { get; set; }
    //armor kits only go on items of at least this level
    public int minItemLevel { get; set; }
    //an armor kit's icon, from Blizzard; kits don't use Wowhead's tooltip, which shows 0 for their values
    public string? icon { get; set; }
    //Wowhead's name for the kit's icon (e.g. "inv_misc_armorkit_15"), so it's drawn with Wowhead's own
    //icon like the items beside it; empty when Wowhead didn't answer, and the Blizzard icon is used
    public string wowheadIcon { get; set; } = "";
    //Blizzard's quality type ("COMMON", "UNCOMMON") and item level, for the kit's tooltip
    public string quality { get; set; } = "";
    public int itemLevel { get; set; }
}

//Every enchant and consumable the Optimize tab can suggest. Game data, the same for every
//character, so it is built once and cached for a week.
public class ForeverOptimizerCatalog
{
    public List<ForeverEnhancement> items { get; set; } = new();
}

public class ForeverSuggestion
{
    //the item; for an enchant, its PTR-only scroll, kept to match the enchant already on the gear
    public int id { get; init; }
    //for an enchant, the live enchanting spell to show and link instead of the scroll; null otherwise
    public int? spellId { get; init; }
    //An armor kit. Wowhead's Forever data has 0 for every armor kit's values ("Attack Power value by 0"),
    //so the page shows its own tooltip from Blizzard's text instead of Wowhead's, with this icon.
    public bool armorKit { get; init; }
    public string? icon { get; init; }
    //Wowhead's icon name for an armor kit; empty when unknown, and icon is used instead
    public string wowheadIcon { get; init; } = "";
    //for the armor kit tooltip, drawn like Wowhead's: the name's quality colour and the item level
    public string quality { get; init; } = "";
    public int itemLevel { get; init; }
    public string name { get; init; } = "";
    public string effect { get; init; } = "";
    public int requiredLevel { get; init; }
    //the crafting skill it takes to make, e.g. Enchanting 300; null when unknown
    public int? requiredSkill { get; init; }
    public string profession { get; init; } = "";
    //how much the character's spec gains, by its stat weights; 0 for healing and mana potions
    public double score { get; init; }
}

public class ForeverOptimizedSlot
{
    //Blizzard's slot type, e.g. "FEET"
    public string slot { get; init; } = "";
    public string slotName { get; init; } = "";
    public int itemId { get; init; }
    public string itemName { get; init; } = "";
    //what the item is enchanted with now, as the game shows it; null when it has no enchant
    public string? currentEnchant { get; init; }
    //the item the current enchant came from (an enchant scroll or armor kit), to mark a suggestion
    //that's already on; null when the game doesn't say
    public int? currentEnchantItemId { get; init; }
    //best first; empty when nothing for the slot helps the spec
    public List<ForeverSuggestion> best { get; init; } = new();
}

public class ForeverOptimizePage
{
    public int level { get; init; }
    public string className { get; init; } = "";
    //the spec the suggestions are for, e.g. "Feral Combat"; when the character has no talent points
    //yet it's the class's default from the weights file, and specIsDefault is true
    public string specName { get; init; } = "";
    public bool specIsDefault { get; init; }
    //false when the weights file has nothing for the class, so nothing could be ranked
    public bool hasWeights { get; init; }
    //the crafting skill a crafter of the character's level would have (5 a level); suggestions needing
    //more are left out unless showingAll
    public int skillCap { get; init; }
    public bool showingAll { get; init; }
    public List<ForeverOptimizedSlot> slots { get; init; } = new();
    public List<ForeverSuggestion> elixirs { get; init; } = new();
    public List<ForeverSuggestion> flasks { get; init; } = new();
    //potions that raise stats for a short time
    public List<ForeverSuggestion> potions { get; init; } = new();
    public ForeverSuggestion? healingPotion { get; init; }
    //null for classes that don't use mana
    public ForeverSuggestion? manaPotion { get; init; }
}
