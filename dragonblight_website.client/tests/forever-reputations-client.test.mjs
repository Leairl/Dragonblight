import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";

async function loadModule(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}
const { Dragonblight } = await loadModule("../src/clients/Dragonblight.ts");
const { filterReputations, reputationColor, reputationProgress } = await loadModule("../src/components/forever/forever-reputations/reputation-helpers.ts");

test("Reputations client uses the realmless Forever route and preserves negative raw standing", async () => {
  const data = { reputations: [{ faction: { id: 87, name: "Bloodsail Buccaneers" }, standing: { raw: -33900, value: 8100, max: 36000, tier: 0, name: "Hated" } }] };
  let request;
  const client = new Dragonblight.ForeverCharacterClient("", { fetch: async (url) => {
    request = new URL(url, "http://localhost");
    return Response.json(data);
  } });
  assert.deepEqual(await client.getReputations("eu", "élise-example"), data);
  assert.equal(request.pathname, "/api/ForeverCharacter/GetReputations");
  assert.equal(request.searchParams.get("characterSlug"), "élise-example");
  assert.equal(request.searchParams.get("region"), "eu");
  assert.equal(request.searchParams.has("server"), false);
});

test("Reputations accepts empty or omitted arrays without inventing data", async () => {
  for (const data of [{}, { reputations: [] }, { reputations: [{ faction: { name: "Stormwind" }, standing: {} }] }]) {
    const client = new Dragonblight.ForeverCharacterClient("", { fetch: async () => Response.json(data) });
    assert.deepEqual(await client.getReputations("us", "example-player"), data);
  }
});

test("Missing reputations and server failures remain distinguishable", async () => {
  for (const status of [404, 500]) {
    const client = new Dragonblight.ForeverCharacterClient("", { fetch: async () => Response.json({ status }, { status }) });
    await assert.rejects(client.getReputations("us", "example-player"), (error) => error.status === status);
  }
  assert.equal(Dragonblight.ProfileClient.prototype.getReputations, undefined);
});

test("Reputation progress uses within-standing values, not negative raw totals", () => {
  assert.deepEqual(reputationProgress({ raw: -33900, value: 8100, max: 36000, tier: 0 }), { value: 8100, max: 36000 });
  assert.deepEqual(reputationProgress({ value: 0, max: 6000 }), { value: 0, max: 6000 });
  assert.deepEqual(reputationProgress({ value: 999, max: 999, tier: 7, name: "Exalted" }), { value: 999, max: 999 });
  assert.deepEqual(reputationProgress({ value: 7000, max: 6000 }), { value: 6000, max: 6000 });
  assert.deepEqual(reputationProgress({ value: -1, max: 6000 }), { value: 0, max: 6000 });
});

test("Missing or invalid reputation progress is unavailable, never a fabricated bar", () => {
  for (const standing of [undefined, {}, { value: 0 }, { max: 6000 }, { value: 0, max: 0 }, { value: 0, max: -1 }, { value: NaN, max: 6000 }, { value: 0, max: Infinity }]) {
    assert.equal(reputationProgress(standing), undefined);
  }
});

test("Reputations filter by API faction or standing names and sort without mutation", () => {
  const entries = [
    { faction: { id: 72, name: "Stormwind" }, standing: { name: "Honored" } },
    { faction: { id: 47, name: "Ironforge" }, standing: { name: "Friendly" } },
    { faction: { id: 87, name: "Bloodsail Buccaneers" }, standing: { name: "Hated" } },
    {},
  ];
  assert.deepEqual(filterReputations(entries, "  IRON  "), [entries[1]]);
  assert.deepEqual(filterReputations(entries, "hated"), [entries[2]]);
  assert.deepEqual(filterReputations(entries, "missing"), []);
  assert.deepEqual(filterReputations(entries, "").map((entry) => entry.faction?.id), [undefined, 87, 47, 72]);
  assert.equal(entries[0].faction.name, "Stormwind");
});

test("Standing colors use API tiers, including tier zero, with gray for unknown tiers", () => {
  assert.deepEqual(Array.from({ length: 8 }, (_, tier) => reputationColor(tier)), ["red", "red", "orange", "amber", "grass", "green", "teal", "cyan"]);
  for (const tier of [undefined, null, -1, 8, 1.5, NaN]) assert.equal(reputationColor(tier), "gray");
});
