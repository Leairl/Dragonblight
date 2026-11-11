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

//Blizzard recipe IDs are not spell IDs. Link the actual output item, or search by
//name for enchants and recipes without an item, rather than inventing a spell URL.
export function recipeWowheadTarget(recipe: Dragonblight.Recipe | undefined, name: string): string {
  const output = recipeOutputs(recipe)[0]?.item;
  return output ? `item=${output.id}` : `search?q=${encodeURIComponent(name)}`;
}

export function filterKnownRecipes(recipes: Dragonblight.RecipeReference[], query: string): Dragonblight.RecipeReference[] {
  const search = query.trim().toLocaleLowerCase();
  return [...new Map(recipes.map((recipe) => [recipe.id, recipe])).values()]
    .filter((recipe) => (recipe.name ?? `Recipe ${recipe.id}`).toLocaleLowerCase().includes(search))
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "") || a.id - b.id);
}
