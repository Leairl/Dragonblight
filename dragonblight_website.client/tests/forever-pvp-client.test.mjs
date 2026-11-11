import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/clients/Dragonblight.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
});
const { Dragonblight } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

test("Forever PvP client uses a realmless route and preserves rank zero", async () => {
  const data = { honorable_kills: 0, pvp_rank: 0 };
  let request;
  const client = new Dragonblight.ForeverCharacterClient("", { fetch: async (url) => {
    request = new URL(url, "http://localhost");
    return Response.json(data);
  } });
  assert.deepEqual(await client.getPvpSummary("eu", "élise-example"), data);
  assert.equal(request.pathname, "/api/ForeverCharacter/GetPvpSummary");
  assert.equal(request.searchParams.get("region"), "eu");
  assert.equal(request.searchParams.get("characterSlug"), "élise-example");
  assert.equal(request.searchParams.has("server"), false);
});

test("Forever PvP preserves battleground results including zero wins", async () => {
  const data = { honorable_kills: 94, pvp_rank: 0, pvp_map_statistics: [
    { world_map: { id: 529, name: "Arathi Basin" }, match_statistics: { played: 3, won: 0, lost: 3 } },
  ] };
  const client = new Dragonblight.ForeverCharacterClient("", { fetch: async () => Response.json(data) });
  assert.deepEqual(await client.getPvpSummary("eu", "luna-amariyo"), data);
});

test("Forever PvP accepts omitted statistics without inventing zeros", async () => {
  const client = new Dragonblight.ForeverCharacterClient("", { fetch: async () => Response.json({}) });
  assert.deepEqual(await client.getPvpSummary("us", "example-player"), {});
});

test("Forever PvP distinguishes unavailable data from upstream failure", async () => {
  for (const status of [404, 500]) {
    const client = new Dragonblight.ForeverCharacterClient("", { fetch: async () => Response.json({ status }, { status }) });
    await assert.rejects(client.getPvpSummary("us", "example-player"), (error) => error.status === status);
  }
});

test("Retail and MoP do not expose the Forever PvP endpoint", () => {
  assert.equal(Dragonblight.ProfileClient.prototype.getPvpSummary, undefined);
});
