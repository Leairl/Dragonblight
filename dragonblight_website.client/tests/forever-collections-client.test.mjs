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
const { collectionProgress, filterEntries, mountEntries, petEntries, qualityColor, toyEntries } =
  await loadModule("../src/components/forever/forever-collections/collection-helpers.ts");

test("Collections client uses the realmless Forever route", async () => {
  const data = { mounts: [], pets: [], toys: [], appearanceSlots: [{ type: "HEAD", name: "Head", count: 2 }], totals: { mounts: 141, pets: 110, toys: 13 } };
  let request;
  const client = new Dragonblight.ForeverCharacterClient("", { fetch: async (url) => {
    request = new URL(url, "http://localhost");
    return Response.json(data);
  } });
  assert.deepEqual(await client.getCollections("eu", "élise-example"), data);
  assert.equal(request.pathname, "/api/ForeverCharacter/GetCollections");
  assert.equal(request.searchParams.get("characterSlug"), "élise-example");
  assert.equal(request.searchParams.get("region"), "eu");
});

test("Collection icons are requested by kind and repeated ids", async () => {
  let request;
  const client = new Dragonblight.ForeverCharacterClient("", { fetch: async (url) => {
    request = new URL(url, "http://localhost");
    return Response.json([{ id: 50, icon: "https://example.com/pet.jpg" }]);
  } });
  await client.getCollectionIcons("us", "pet", [50, 51]);
  assert.equal(request.pathname, "/api/ForeverCharacter/GetCollectionIcons");
  assert.equal(request.searchParams.get("kind"), "pet");
  assert.deepEqual(request.searchParams.getAll("ids"), ["50", "51"]);
});

test("Missing collections and server failures remain distinguishable", async () => {
  for (const status of [404, 500]) {
    const client = new Dragonblight.ForeverCharacterClient("", { fetch: async () => Response.json({ status }, { status }) });
    await assert.rejects(client.getCollections("us", "example-player"), (error) => error.status === status);
  }
});

test("Entries keep every pet, mark unusable mounts and skip rows without a reference", () => {
  const mounts = mountEntries([{ mount: { id: 2995, name: "Striped Dawnsaber" }, is_useable: false }, { is_useable: true }]);
  assert.equal(mounts.length, 1);
  assert.equal(mounts[0].muted, true);
  assert.equal(mounts[0].detail, "Not usable");
  const pets = petEntries([
    { id: 1, species: { id: 50, name: "Green Wing Macaw" }, level: 1, quality: { type: "UNCOMMON", name: "Uncommon" } },
    { id: 2, species: { id: 50, name: "Green Wing Macaw" } },
  ]);
  assert.deepEqual(pets.map((pet) => [pet.key, pet.id]), [["pet/1", 50], ["pet/2", 50]]);
  assert.equal(pets[0].detail, "Level 1 · Uncommon");
  assert.equal(pets[1].detail, undefined);
  assert.deepEqual(toyEntries(undefined), []);
});

test("Filtering matches names and details without case", () => {
  const pets = petEntries([{ id: 1, species: { id: 50, name: "Green Wing Macaw" }, quality: { type: "RARE", name: "Rare" } }]);
  assert.equal(filterEntries(pets, "  MACAW ").length, 1);
  assert.equal(filterEntries(pets, "rare").length, 1);
  assert.equal(filterEntries(pets, "raptor").length, 0);
  assert.equal(filterEntries(pets, "").length, 1);
});

test("Progress needs a usable total, and pet quality maps to game colors", () => {
  assert.deepEqual(collectionProgress(2, 141), { value: 2, max: 141, percent: 1 });
  assert.equal(collectionProgress(2, undefined), undefined);
  assert.equal(collectionProgress(2, 0), undefined);
  assert.equal(collectionProgress(5, 3), undefined);
  assert.equal(qualityColor("EPIC"), "purple");
  assert.equal(qualityColor("UNCOMMON"), "green");
  assert.equal(qualityColor(undefined), undefined);
});
