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
