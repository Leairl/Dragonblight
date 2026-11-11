import type { Dragonblight } from "../../../clients/Dragonblight";

export function craftedQuantityText(quantity: Dragonblight.CraftedQuantity | undefined): string {
  if (quantity?.value != null) return String(quantity.value);
  if (quantity?.minimum != null && quantity.maximum != null) {
    return quantity.minimum === quantity.maximum ? String(quantity.minimum) : `${quantity.minimum}–${quantity.maximum}`;
  }
  return "—";
}

export function recipeOutputs(recipe: Dragonblight.Recipe | undefined): { item: Dragonblight.ItemReference; faction?: string }[] {
  if (!recipe) return [];
  if (recipe.crafted_item) return [{ item: recipe.crafted_item }];
  return [
    ...(recipe.alliance_crafted_item ? [{ item: recipe.alliance_crafted_item, faction: "Alliance" }] : []),
    ...(recipe.horde_crafted_item ? [{ item: recipe.horde_crafted_item, faction: "Horde" }] : []),
  ];
}

//A recipe in a list: its name, and for the not-learned list the category the game files it under,
//which the search also matches ("bags", "leggings").
export interface ListedRecipe {
  id: number;
  name?: string;
  category?: string;
  requiredSkill?: number;
  requiredSkillEstimated?: boolean;
  //"Vendor: Qia (Winterspring)", "Drop; Fishing"; "" when unknown, undefined when not loaded yet
  source?: string;
}

//The filter row's kinds of source, in the order the buttons show them. A kind the file names
//that isn't listed here goes before "Unknown".
const sourceOrder = ["Trainer", "Vendor", "Drop", "Quest", "Fishing", "Pickpocketing", "Crafted"];

//The kinds of source a recipe has: "Drop; Vendor: Qia (Winterspring)" is Drop and Vendor. A recipe
//whose source isn't known is "Unknown"; one whose source hasn't loaded has none.
export function sourceKinds(recipe: ListedRecipe): string[] {
  if (recipe.source === undefined) {
    return [];
  }
  const kinds = recipe.source.split(";")
    .map((part) => part.split(":")[0].trim())
    .filter((kind) => kind !== "");
  if (kinds.length === 0) {
    return ["Unknown"];
  }
  return [...new Set(kinds)];
}

function sourceRank(kind: string): number {
  if (kind === "Unknown") {
    return sourceOrder.length + 1;
  }
  const index = sourceOrder.indexOf(kind);
  if (index < 0) {
    return sourceOrder.length;
  }
  return index;
}

//Each kind of source in the list, with how many recipes have it, in filter-row order.
export function sourceCounts(recipes: ListedRecipe[]): { kind: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const recipe of recipes) {
    for (const kind of sourceKinds(recipe)) {
      counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }
  }
  return [...counts].map(([kind, count]) => ({ kind, count }))
    .sort((a, b) => sourceRank(a.kind) - sourceRank(b.kind) || a.kind.localeCompare(b.kind));
}

//The recipes with any of these kinds of source; all of them when none are picked.
export function filterBySource<T extends ListedRecipe>(recipes: T[], kinds: string[]): T[] {
  if (kinds.length === 0) {
    return recipes;
  }
  return recipes.filter((recipe) => sourceKinds(recipe).some((kind) => kinds.includes(kind)));
}

//"Requires 90", or "Requires about 90" when the level is estimated; empty when it isn't known.
export function requiredSkillText(recipe: ListedRecipe): string {
  if (recipe.requiredSkill == null) {
    return "";
  }
  if (recipe.requiredSkillEstimated) {
    return `Requires about ${recipe.requiredSkill}`;
  }
  return `Requires ${recipe.requiredSkill}`;
}

//The recipes a character with this much skill could learn. A recipe whose level isn't known
//is left out, since it can't be shown to be learnable; everything stays when the character's
//skill isn't known.
export function learnableAt<T extends ListedRecipe>(recipes: T[], skill: number | undefined): T[] {
  if (skill == null) {
    return recipes;
  }
  return recipes.filter((recipe) => recipe.requiredSkill != null && recipe.requiredSkill <= skill);
}

export function filterKnownRecipes<T extends ListedRecipe>(recipes: T[], query: string): T[] {
  const search = query.trim().toLocaleLowerCase();
  return [...new Map(recipes.map((recipe) => [recipe.id, recipe])).values()]
    .filter((recipe) => (recipe.name ?? `Recipe ${recipe.id}`).toLocaleLowerCase().includes(search)
      || (recipe.category ?? "").toLocaleLowerCase().includes(search))
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "") || a.id - b.id);
}

//The tier's recipes the character hasn't learned. Blizzard lists some recipes twice under
//different ids (the same cloak in two categories); one the character knows by name counts as learned.
export function unlearnedRecipes(tier: Dragonblight.ForeverSkillTierRecipe[], known: Dragonblight.RecipeReference[]): Dragonblight.ForeverSkillTierRecipe[] {
  const knownIds = new Set(known.map((recipe) => recipe.id));
  const knownNames = new Set(known.flatMap((recipe) => (recipe.name ? [recipe.name.toLocaleLowerCase()] : [])));
  return tier.filter((recipe) => !knownIds.has(recipe.id) && !knownNames.has(recipe.name.toLocaleLowerCase()));
}
