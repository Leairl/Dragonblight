import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";

//Exercise the generated client with fake responses, without a browser or Blizzard credentials.
const source = await readFile(new URL("../src/clients/Dragonblight.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
});
const { Dragonblight } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

test("professions client preserves flat skills, zero progress and secondary professions", async () => {
  const data = { primaries: [{ profession: { id: 164, name: "Blacksmithing" }, skill_points: 0, max_skill_points: 75 }], secondaries: [{ profession: { id: 356, name: "Fishing" } }] };
  let request;
  const client = new Dragonblight.ForeverCharacterClient("", { fetch: async (url, options) => {
    request = { url, options };
    return Response.json(data);
  } });
  assert.deepEqual(await client.getProfessions("eu", "élise-example"), data);
  assert.equal(request.options.method, "GET");
  const url = new URL(request.url, "http://localhost");
  assert.equal(url.pathname, "/api/ForeverCharacter/GetProfessions");
  assert.equal(url.searchParams.get("server"), null);
  assert.equal(url.searchParams.get("characterSlug"), "élise-example");
  assert.equal(url.searchParams.get("region"), "eu");
});

test("professions client preserves skill tiers and known recipes", async () => {
  const data = { primaries: [{ profession: { id: 197, name: "Tailoring" }, tiers: [{ tier: { id: 2948, name: "Tailoring" }, skill_points: 42, max_skill_points: 100, known_recipes: [{ id: 2359, name: "Bolt of Linen Cloth" }] }] }] };
  const client = new Dragonblight.ForeverCharacterClient("", { fetch: async () => Response.json(data) });
  assert.deepEqual(await client.getProfessions("us", "example-player"), data);
});

test("professions client accepts omitted arrays as an empty successful response", async () => {
  const client = new Dragonblight.ForeverCharacterClient("", { fetch: async () => Response.json({}) });
  assert.deepEqual(await client.getProfessions("us", "example-player"), {});
});

test("missing professions surface a structured 404 rather than an empty success", async () => {
  const client = new Dragonblight.ForeverCharacterClient("", { fetch: async () => Response.json({ status: 404, title: "Profession data is not available for this character." }, { status: 404 }) });
  await assert.rejects(client.getProfessions("us", "example-player"), (error) => error.status === 404);
});

test("server failures remain distinguishable from missing professions", async () => {
  const client = new Dragonblight.ForeverCharacterClient("", { fetch: async () => new Response("Test failure", { status: 500 }) });
  await assert.rejects(client.getProfessions("us", "example-player"), (error) => error instanceof Dragonblight.ApiException && error.status === 500);
});

test("Retail/MoP client does not expose the Forever professions feature", () => {
  assert.equal(Dragonblight.ProfileClient.prototype.getProfessions, undefined);
});

test("recipe batches encode IDs and preserve missing details without losing known rows", async () => {
  const data = [{ id: 2359, icon: "https://example.com/icon.jpg", recipe: { id: 2359, name: "Bolt of Linen Cloth", crafted_item: { id: 2996, name: "Bolt of Linen Cloth" } } }, { id: 9999, recipe: null, icon: null }];
  let requested;
  const client = new Dragonblight.ForeverCharacterClient("", { fetch: async (url) => {
    requested = new URL(url, "http://localhost");
    return Response.json(data);
  } });
  assert.deepEqual(await client.getRecipes("eu", [2359, 9999]), data);
  assert.equal(requested.pathname, "/api/ForeverCharacter/GetRecipes");
  assert.equal(requested.searchParams.get("region"), "eu");
  assert.deepEqual(requested.searchParams.getAll("recipeIds"), ["2359", "9999"]);
});

const helperSource = await readFile(new URL("../src/components/forever/forever-professions/recipe-helpers.ts", import.meta.url), "utf8");
const helperJs = ts.transpileModule(helperSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const helpers = await import(`data:text/javascript;base64,${Buffer.from(helperJs).toString("base64")}`);

test("recipe output quantities handle fixed, ranged, equal and missing values", () => {
  assert.equal(helpers.craftedQuantityText({ value: 2 }), "2");
  assert.equal(helpers.craftedQuantityText({ minimum: 1, maximum: 3 }), "1–3");
  assert.equal(helpers.craftedQuantityText({ minimum: 2, maximum: 2 }), "2");
  assert.equal(helpers.craftedQuantityText(undefined), "—");
});

test("Wowhead links use output item IDs, never Blizzard recipe IDs as spell IDs", () => {
  assert.equal(helpers.recipeWowheadTarget({ id: 2359, crafted_item: { id: 2996 } }, "Bolt of Linen Cloth"), "item=2996");
  assert.equal(helpers.recipeWowheadTarget(undefined, "Enchant Boots - Minor Speed"), "search?q=Enchant%20Boots%20-%20Minor%20Speed");
  assert.deepEqual(helpers.recipeOutputs({ alliance_crafted_item: { id: 10 }, horde_crafted_item: { id: 11 } }), [
    { item: { id: 10 }, faction: "Alliance" }, { item: { id: 11 }, faction: "Horde" },
  ]);
});

test("known recipe filtering is case-insensitive, sorted, deduplicated and does not mutate inputs", () => {
  const recipes = [{ id: 2, name: "Wool" }, { id: 1, name: "Linen" }, { id: 1, name: "Linen" }];
  assert.deepEqual(helpers.filterKnownRecipes(recipes, "  LIN  "), [{ id: 1, name: "Linen" }]);
  assert.deepEqual(helpers.filterKnownRecipes(recipes, "").map((recipe) => recipe.id), [1, 2]);
  assert.equal(recipes.length, 3);
  assert.equal(recipes[0].name, "Wool");
});

test("skill tier recipes client sends the profession and tier and keeps categories", async () => {
  const data = [{ id: 2359, name: "Bolt of Linen Cloth", category: "Reagents" }];
  let url;
  const client = new Dragonblight.ForeverCharacterClient("", { fetch: async (requested) => {
    url = requested;
    return Response.json(data);
  } });
  assert.deepEqual(await client.getSkillTierRecipes("us", 197, 2948), data);
  assert.equal(url, "/api/ForeverCharacter/GetSkillTierRecipes?region=us&professionId=197&skillTierId=2948");
});

test("not-learned recipes leave out known ids and known names listed under another id", () => {
  const tier = [
    { id: 1, name: "Linen Cloak", category: "Cloaks" },
    { id: 2, name: "Glacial Cloak", category: "Cloaks" },
    { id: 3, name: "Glacial Cloak", category: "Season of Discovery" },
    { id: 4, name: "Runecloth Bag", category: "Bags" },
  ];
  const known = [{ id: 1, name: "Linen Cloak" }, { id: 2, name: "glacial cloak" }];
  assert.deepEqual(helpers.unlearnedRecipes(tier, known).map((recipe) => recipe.id), [4]);
  assert.deepEqual(helpers.unlearnedRecipes(tier, []).length, 4);
});

test("recipe search also matches the category", () => {
  const recipes = [{ id: 4, name: "Runecloth Bag", category: "Bags" }, { id: 5, name: "Runecloth Robe", category: "Robes and Vests" }];
  assert.deepEqual(helpers.filterKnownRecipes(recipes, "bags").map((recipe) => recipe.id), [4]);
});
