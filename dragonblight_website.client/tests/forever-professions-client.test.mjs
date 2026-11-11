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
