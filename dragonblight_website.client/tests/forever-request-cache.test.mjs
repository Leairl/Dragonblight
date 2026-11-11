import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/components/forever/request-cache.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { RequestCache, DetailCache } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

test("Concurrent requests for one key share a single call, and answers can be read synchronously", async () => {
  const cache = new RequestCache(10, 60_000);
  let calls = 0;
  const load = async () => { calls++; return { honorable_kills: 0 }; };
  const [a, b] = await Promise.all([cache.get("pvp/us/a", load), cache.get("pvp/us/a", load)]);
  assert.equal(calls, 1);
  assert.equal(a, b);
  assert.deepEqual(cache.peek("pvp/us/a"), { value: { honorable_kills: 0 } });
  assert.equal(cache.peek("pvp/us/other"), undefined);
});

test("Failed requests are forgotten so a retry reaches the server", async () => {
  const cache = new RequestCache(10, 60_000);
  let calls = 0;
  await assert.rejects(cache.get("k", async () => { calls++; throw new Error("down"); }));
  assert.equal(cache.peek("k"), undefined);
  assert.equal(await cache.get("k", async () => { calls++; return 1; }), 1);
  assert.equal(calls, 2);
});

test("Answers expire, and the cache is bounded by least recent use", async () => {
  let now = 0;
  const cache = new RequestCache(2, 1000, () => now);
  await cache.get("a", async () => "a1");
  await cache.get("b", async () => "b1");
  await cache.get("a", async () => "unused"); // touch a, so b is the oldest
  await cache.get("c", async () => "c1");
  assert.equal(cache.peek("b"), undefined);
  assert.deepEqual(cache.peek("a"), { value: "a1" });
  now = 1001;
  assert.equal(cache.peek("a"), undefined);
  assert.equal(await cache.get("a", async () => "a2"), "a2");
});

test("Detail rows are fetched once per region and ID, in bounded batches", async () => {
  const cache = new DetailCache(100, (row) => row.achievement != null);
  const batches = [];
  const fetchBatch = async (ids) => { batches.push(ids); return ids.map((id) => ({ id, achievement: { id } })); };
  const first = await cache.load("us", [3, 1, 2, 1], fetchBatch, 2);
  assert.deepEqual(batches, [[3, 1], [2]]);
  assert.deepEqual(first.rows.map((row) => row.id), [3, 1, 2]);
  assert.equal(first.failed, false);
  await cache.load("us", [1, 2, 3, 4], fetchBatch, 50);
  assert.deepEqual(batches.at(-1), [4], "Only uncached IDs are requested");
  await cache.load("eu", [1], fetchBatch, 50);
  assert.deepEqual(batches.at(-1), [1], "Regions are cached separately");
  assert.equal(cache.get("us", 4)?.id, 4);
});

test("Overlapping detail loads share in-flight requests", async () => {
  const cache = new DetailCache(100, () => true);
  const batches = [];
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const fetchBatch = async (ids) => { batches.push(ids); await gate; return ids.map((id) => ({ id })); };
  const visible = cache.load("us", [1, 2], fetchBatch, 50);
  const all = cache.load("us", [1, 2, 3], fetchBatch, 50);
  release();
  await Promise.all([visible, all]);
  assert.deepEqual(batches, [[1, 2], [3]]);
  assert.equal((await all).rows.length, 3);
});

test("Incomplete or failed detail rows are not cached, so they are asked for again", async () => {
  const cache = new DetailCache(100, (row) => row.recipe != null);
  let fail = true;
  const batches = [];
  const fetchBatch = async (ids) => {
    batches.push(ids);
    if (fail) throw new Error("down");
    return ids.map((id) => ({ id, recipe: id === 2 ? undefined : { id } }));
  };
  const failed = await cache.load("us", [1, 2], fetchBatch, 10);
  assert.equal(failed.failed, true);
  assert.deepEqual(failed.rows, []);
  fail = false;
  const partial = await cache.load("us", [1, 2], fetchBatch, 10);
  assert.equal(partial.failed, false);
  assert.equal(partial.rows.length, 2, "Rows without details are still returned to show names");
  assert.equal(cache.get("us", 2), undefined, "but they are not cached");
  await cache.load("us", [1, 2], fetchBatch, 10);
  assert.deepEqual(batches.at(-1), [2]);
});

test("Detail rows are bounded by least recent use", async () => {
  const cache = new DetailCache(2, () => true);
  const fetchBatch = async (ids) => ids.map((id) => ({ id }));
  await cache.load("us", [1, 2, 3], fetchBatch, 10);
  assert.equal(cache.get("us", 1), undefined);
  assert.ok(cache.get("us", 2) && cache.get("us", 3));
});
