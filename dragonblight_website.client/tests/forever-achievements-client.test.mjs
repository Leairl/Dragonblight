import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

async function loadModule(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  });
  const resolved = outputText.replace(/from (["'])(react|react\/jsx-runtime|@radix-ui\/themes)\1/g, (_, quote, name) => `from ${quote}${import.meta.resolve(name)}${quote}`);
  return import(`data:text/javascript;base64,${Buffer.from(resolved).toString("base64")}`);
}
const { Dragonblight } = await loadModule("../src/clients/Dragonblight.ts");
const { achievementStatus, reportedAchievements, filterAchievements, achievementCriteria, achievementDate } = await loadModule("../src/components/forever/forever-achievements/achievement-helpers.ts");
const { default: AchievementIcon } = await loadModule("../src/components/forever/forever-achievements/achievement-icon.tsx");

const completed = { id: 61997, achievement: { id: 61997, name: "Novice Paladin" }, criteria: { id: 221473, is_completed: true }, completed_timestamp: 1794171240000 };
const inProgress = { id: 62015, achievement: { id: 62015, name: "Journeyman Blacksmith" }, criteria: { id: 221509, is_completed: false, child_criteria: [{ id: 221510, amount: 132, is_completed: false }] } };
const definition = { id: 62015, name: "Journeyman Blacksmith", description: "Reach 150 skill in Blacksmithing for the first time.", category: { id: 15588, name: "Blacksmithing" }, is_account_wide: true, reward_description: "Earn 1 Legacy Point.", criteria: { id: 221509, amount: 0, child_criteria: [{ id: 221510, description: "150 Blacksmithing Skill", amount: 150, show_progress_bar: true }] } };

test("Forever achievements client encodes realmless names and preserves numeric timestamps, progress and zero points", async () => {
  const data = { total_quantity: 4, total_points: 0, achievements: [completed, inProgress], recent_events: [{ achievement: completed.achievement, timestamp: completed.completed_timestamp }] };
  let request;
  const client = new Dragonblight.ForeverCharacterClient("", { fetch: async (url) => {
    request = new URL(url, "http://localhost");
    return Response.json(data);
  } });
  assert.deepEqual(await client.getAchievements("eu", "élise-example"), data);
  assert.equal(request.pathname, "/api/ForeverCharacter/GetAchievements");
  assert.equal(request.searchParams.get("characterSlug"), "élise-example");
  assert.equal(request.searchParams.get("region"), "eu");
  assert.equal(request.searchParams.has("server"), false);
  assert.equal(Dragonblight.ProfileClient.prototype.getAchievements, undefined);
});

test("Achievement detail batches preserve nested targets and Legacy rewards separately from points", async () => {
  const data = [{ id: 62015, achievement: definition, icon: "https://example.com/icon.jpg" }, { id: 9999, achievement: null, icon: null }];
  let request;
  const client = new Dragonblight.ForeverCharacterClient("", { fetch: async (url) => {
    request = new URL(url, "http://localhost");
    return Response.json(data);
  } });
  assert.deepEqual(await client.getAchievementDetails("eu", [62015, 9999]), data);
  assert.equal(request.pathname, "/api/ForeverCharacter/GetAchievementDetails");
  assert.deepEqual(request.searchParams.getAll("achievementIds"), ["62015", "9999"]);
  assert.equal(request.searchParams.get("region"), "eu");
});

test("Achievement client accepts omitted arrays and distinguishes missing data from failures", async () => {
  const client = new Dragonblight.ForeverCharacterClient("", { fetch: async () => Response.json({}) });
  assert.deepEqual(await client.getAchievements("us", "example-player"), {});
  for (const status of [404, 500]) {
    const failed = new Dragonblight.ForeverCharacterClient("", { fetch: async () => Response.json({ status }, { status }) });
    await assert.rejects(failed.getAchievements("us", "example-player"), (error) => error.status === status);
  }
});

test("Achievement completion does not confuse reported progress with completed achievements", () => {
  assert.equal(achievementStatus(completed), "completed");
  assert.equal(achievementStatus(inProgress), "in-progress");
  assert.equal(achievementStatus({ id: 1, completed_timestamp: 1000 }), "completed");
  assert.equal(achievementStatus({ id: 1, criteria: { is_completed: true } }), "completed");
  assert.equal(achievementStatus({ id: 1, completed_timestamp: 0 }), "unknown");
  assert.equal(achievementStatus({ id: 1 }), "unknown");
  assert.deepEqual(reportedAchievements([completed, { ...completed, completed_timestamp: undefined, criteria: { is_completed: false } }, inProgress, { id: 0 }]), [completed, inProgress]);
});

test("Achievement filters support names, descriptions, completion and API categories without mutating inputs", () => {
  const entries = [inProgress, completed, { id: 9999, achievement: { name: "Unknown" } }];
  const details = new Map([[62015, { id: 62015, achievement: definition }], [61997, { id: 61997, achievement: { category: { id: 15580, name: "Paladin" } } }]]);
  assert.deepEqual(filterAchievements(entries, details, "  BLACKSMITH  ", "all", "all"), [inProgress]);
  assert.deepEqual(filterAchievements(entries, details, "150 skill", "all", "15588"), [inProgress]);
  assert.deepEqual(filterAchievements(entries, details, "", "completed", "all"), [completed]);
  assert.deepEqual(filterAchievements(entries, details, "", "in-progress", "all"), [inProgress]);
  assert.equal(filterAchievements(entries, details, "", "unknown", "unknown")[0].id, 9999);
  assert.equal(filterAchievements(entries, details, "missing", "all", "all").length, 0);
  assert.equal(entries[0], inProgress);
});

test("Criterion progress joins recursive IDs rather than array positions or parent amounts", () => {
  assert.deepEqual(achievementCriteria(definition, inProgress), [{ id: 221510, label: "150 Blacksmithing Skill", completed: false, amount: 132, target: 150 }]);
  const nested = { criteria: { id: 1, child_criteria: [{ id: 2, child_criteria: [{ id: 3, description: "Goal", amount: 10, show_progress_bar: true }] }, { id: 4, description: "Other", amount: 0 }] } };
  const progress = { id: 1, criteria: { id: 1, child_criteria: [{ id: 4, is_completed: true }, { id: 2, child_criteria: [{ id: 3, amount: 0, is_completed: false }] }] } };
  const rows = achievementCriteria(nested, progress);
  assert.equal(rows[0].amount, 0);
  assert.equal(rows[0].target, 10);
  assert.equal(rows[1].completed, true);
  assert.equal(rows[1].target, undefined);
  assert.equal(achievementCriteria(definition, { id: 1 })[0].amount, undefined);
  assert.deepEqual(achievementCriteria(undefined, inProgress), []);
});

test("Achievement dates interpret epoch milliseconds and reject absent or invalid timestamps", () => {
  assert.equal(achievementDate(completed.completed_timestamp), new Date(completed.completed_timestamp).toLocaleDateString());
  for (const timestamp of [undefined, 0, -1, NaN, Infinity, 1e20]) assert.equal(achievementDate(timestamp), undefined);
});

test("Achievement icons show skeletons while pending, reserving the fallback for missing icons", () => {
  const pending = renderToStaticMarkup(createElement(AchievementIcon, { pending: true }));
  assert.match(pending, /rt-Skeleton/);
  assert.doesNotMatch(pending, /<img|unknown.png/);
  const downloading = renderToStaticMarkup(createElement(AchievementIcon, { pending: false, src: "https://example.com/blizzard-icon.jpg" }));
  assert.match(downloading, /rt-Skeleton/);
  assert.match(downloading, /blizzard-icon.jpg/);
  assert.doesNotMatch(downloading, /unknown.png/);
  const missing = renderToStaticMarkup(createElement(AchievementIcon, { pending: false }));
  assert.match(missing, /unknown.png/);
});
