//The WoW: Forever professions tab's recipe lists.

//one recipe of a skill tier, under the category the game's profession window lists it in
public class ForeverSkillTierRecipe
{
    public int id { get; init; }
    public string name { get; init; } = "";
    public string category { get; init; } = "";
    //the skill the recipe needs before it can be learned, from ForeverRecipes.tsv; null when unknown
    public int? requiredSkill { get; init; }
    //true when requiredSkill is an estimate rather than read from the recipe's pattern
    public bool requiredSkillEstimated { get; init; }
    //where the recipe comes from ("Vendor: Qia (Winterspring)", "Drop; Fishing", "Trainer"), from ForeverRecipes.tsv;
    //empty when unknown. The professions tab filters on it.
    public string source { get; init; } = "";
}

//One row of ForeverRecipes.tsv. Blizzard's recipe data has no required skill or source, so the file is
//built offline by tools/forever_recipe_skills.py: the level on the pattern (plans, formula...) of the same
//name and its icon, from Blizzard's item data, and where that pattern comes from, from Wowhead Forever. A recipe no
//item teaches is from a trainer, with its level estimated from where Classic turns it yellow.
public class ForeverRecipeInfo
{
    public int? requiredSkill { get; init; }
    public bool estimated { get; init; }
    //a recipe no one can learn (no pattern or trainer teaches it), left out of the not-learned list
    public bool hidden { get; init; }
    //the pattern that teaches the recipe; null for a trainer recipe
    public int? itemId { get; init; }
    public string itemName { get; init; } = "";
    //the item's icon URL, from Blizzard's item media
    public string itemIcon { get; init; } = "";
    //"Vendor: Qia (Winterspring)", "Drop", "Trainer"; empty when nothing is known
    public string source { get; init; } = "";
    //the same source in parts, with the Wowhead page of each mob, vendor or quest; empty when nothing is known
    public ForeverRecipeSource[] sources { get; init; } = [];
}

//One part of where a recipe comes from: "Drop" from "Raging Rot Hide" in "Silverpine Forest", on Wowhead at "npc=1943".
public class ForeverRecipeSource
{
    public string kind { get; init; } = "";
    public string? name { get; init; }
    public string? zone { get; init; }
    //the Wowhead page: "npc=1943", "quest=2861", "object=..."; null when Wowhead names no one
    public string? wowhead { get; init; }
}

public static class ForeverRecipes
{
    public static Dictionary<int, ForeverRecipeInfo> data = new();
}
