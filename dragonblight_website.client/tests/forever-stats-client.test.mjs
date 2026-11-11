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
const { statGroups, statNumber } = await loadModule("../src/components/forever/forever-character-stats/stat-groups.ts");

test("Forever stats client uses the realmless endpoint and encodes character names", async () => {
  const data = { health: 919, spirit: { base: 41, effective: 75 }, defense: { effective: 136 }, fire_resistance: { effective: 0 }, melee_hit: { value: 0 }, spell_healing: 11 };
  let request;
  const client = new Dragonblight.ForeverCharacterClient("", { fetch: async (url) => {
    request = new URL(url, "http://localhost");
    return Response.json(data);
  } });
  assert.deepEqual(await client.getStats("eu", "élise-example"), data);
  assert.equal(request.pathname, "/api/ForeverCharacter/GetStats");
  assert.equal(request.searchParams.get("characterSlug"), "élise-example");
  assert.equal(request.searchParams.get("region"), "eu");
  assert.equal(request.searchParams.has("server"), false);
});

test("Forever stats preserve omitted fields and distinguish unavailable from failed requests", async () => {
  const empty = new Dragonblight.ForeverCharacterClient("", { fetch: async () => Response.json({}) });
  assert.deepEqual(await empty.getStats("us", "example-player"), {});
  for (const status of [404, 500]) {
    const client = new Dragonblight.ForeverCharacterClient("", { fetch: async () => Response.json({ status }, { status }) });
    await assert.rejects(client.getStats("us", "example-player"), (error) => error.status === status);
  }
});

test("Stat formatting preserves zeros, missing values and fractional percentages", () => {
  assert.equal(statNumber(0), "0");
  assert.equal(statNumber(undefined), "—");
  assert.equal(statNumber(null), "—");
  assert.equal(statNumber(NaN), "—");
  assert.equal(statNumber(Infinity), "—");
  assert.equal(statNumber(6.3200006, 2, "%"), (6.32).toLocaleString(undefined, { minimumFractionDigits: 2 }) + "%");
});

test("Forever groups use reported Classic stats, without Retail/MoP conversions", () => {
  const groups = statGroups({
    health: 919, power: 1028, power_type: { name: "Mana" },
    strength: { base: 52, effective: 113 }, spirit: { base: 41, effective: 75 },
    melee_hit: { value: 2 }, ranged_attack_power: 290, ranged_damage_min: 12, ranged_damage_max: 24,
    spell_healing: 11, fire_resistance: { base: 0, effective: 0 },
  });
  const find = (group, label) => groups.find((g) => g.title === group).rows.find((r) => r.label === label);
  assert.equal(find("General", "Health").value, "919");
  assert.equal(find("General", "Mana").value, (1028).toLocaleString());
  assert.equal(find("Attributes", "Strength").boosted, true);
  assert.equal(find("Attributes", "Spirit").value, "75");
  assert.equal(find("Melee", "Hit bonus").value, statNumber(2, 2, "%"));
  assert.equal(find("Ranged", "Attack power").value, "290");
  assert.equal(find("Ranged", "Damage").value, "12 – 24");
  assert.equal(find("Spell", "Healing").value, "11");
  assert.equal(find("Resistances", "Fire").value, "0");
  assert.equal(groups.some((g) => g.rows.some((r) => /Mastery|Versatility|Resilience|Expertise/.test(r.label))), false);
});

test("Missing stat objects render dashes, not fabricated zeros or damage ranges", () => {
  assert.equal(statGroups({}).every((group) => group.rows.every((row) => row.value === "—")), true);
  const melee = statGroups({ main_hand_damage_min: 10 }).find((g) => g.title === "Melee");
  assert.equal(melee.rows[0].value, "—");
});
