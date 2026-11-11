import { useEffect, useState } from "react";
import { Dragonblight } from "../../clients/Dragonblight";
import { DetailCache, RequestCache } from "./request-cache";
import type { CollectionKind } from "./forever-collections/collection-helpers";

const client = new Dragonblight.ForeverCharacterClient();

// The server keeps a character's tabs for two hours; five minutes here makes switching tabs instant
// without holding on to a character for a whole session.
const characterRequests = new RequestCache(40, 5 * 60 * 1000);

const tabLoaders = {
  professions: (region: string, slug: string) => client.getProfessions(region, slug),
  pvp: (region: string, slug: string) => client.getPvpSummary(region, slug),
  stats: (region: string, slug: string) => client.getStats(region, slug),
  reputations: (region: string, slug: string) => client.getReputations(region, slug),
  achievements: (region: string, slug: string) => client.getAchievements(region, slug),
  collections: (region: string, slug: string) => client.getCollections(region, slug),
  talents: (region: string, slug: string) => client.getTalents(region, slug),
  optimize: (region: string, slug: string) => client.getOptimization(region, slug, false),
  // the Optimize tab with "Show everything" on
  optimizeAll: (region: string, slug: string) => client.getOptimization(region, slug, true),
  // shown on the achievements tab, so it loads alongside it
  legacy: (region: string, slug: string) => client.getLegacyPoints(region, slug),
};

export type ForeverTab = keyof typeof tabLoaders;
type TabData<K extends ForeverTab> = Awaited<ReturnType<(typeof tabLoaders)[K]>>;

function tabKey(tab: ForeverTab, region: string, slug: string) {
  return `${tab}/${region}/${slug}`;
}

export function loadForeverTab<K extends ForeverTab>(tab: K, region: string, slug: string): Promise<TabData<K>> {
  return characterRequests.get(tabKey(tab, region, slug), () => tabLoaders[tab](region, slug) as Promise<TabData<K>>);
}

// Starts a tab's request when the pointer or focus reaches its button, so it is usually answered by the click.
export function prefetchForeverTab(tab: string, region: string | undefined, slug: string | undefined) {
  if (!region || !slug || !(tab in tabLoaders)) return;
  loadForeverTab(tab as ForeverTab, region, slug).catch(() => undefined);
  if (tab === "achievements") loadForeverTab("legacy", region, slug).catch(() => undefined);
}

export type TabState<T> = { status: "loading" } | { status: "loaded"; data: T } | { status: "error"; message: string };

// A tab's data for the character in the URL. A tab seen earlier renders from memory on its first frame
// rather than flashing a skeleton.
export function useForeverTab<K extends ForeverTab>(tab: K, region: string | undefined, slug: string | undefined,
  messages: { missing: string; failed: string }): [TabState<TabData<K>>, () => void] {
  const key = region && slug ? tabKey(tab, region, slug) : "";
  const [result, setResult] = useState<{ key: string; state: TabState<TabData<K>> }>();
  const [attempt, setAttempt] = useState(0);
  const { missing, failed } = messages;

  useEffect(() => {
    if (!region || !slug) return;
    let cancelled = false;
    const requestKey = tabKey(tab, region, slug);
    loadForeverTab(tab, region, slug)
      .then((data) => {
        if (!cancelled) setResult({ key: requestKey, state: data ? { status: "loaded", data } : { status: "error", message: missing } });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        //NSwag throws typed ProblemDetails for a documented 404, and ApiException otherwise.
        const status = typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
        setResult({ key: requestKey, state: { status: "error", message: status === 404 ? missing : failed } });
      });
    return () => { cancelled = true; };
  }, [tab, region, slug, attempt, missing, failed]);

  let state: TabState<TabData<K>> = { status: "loading" };
  if (result?.key === key) {
    state = result.state;
  } else if (key) {
    const cached = characterRequests.peek<TabData<K>>(key);
    if (cached?.value) state = { status: "loaded", data: cached.value };
  }
  const retry = () => {
    characterRequests.forget(key);
    setResult(undefined);
    setAttempt((value) => value + 1);
  };
  return [state, retry];
}

// Every recipe in a profession's skill tier, for the "not learned" list. Game data, the same for
// every character, so it is kept for the session.
const skillTierRequests = new RequestCache(30, 60 * 60 * 1000);

export function loadSkillTierRecipes(region: string, professionId: number, skillTierId: number) {
  return skillTierRequests.get(`${region}/${professionId}/${skillTierId}`, () => client.getSkillTierRecipes(region, professionId, skillTierId));
}

export function peekSkillTierRecipes(region: string, professionId: number, skillTierId: number) {
  return skillTierRequests.peek<Dragonblight.ForeverSkillTierRecipe[]>(`${region}/${professionId}/${skillTierId}`)?.value;
}

// A character reports a few dozen achievements; the server answers up to 50 definitions per request.
export const achievementBatchSize = 50;
export const achievementDetails = new DetailCache<Dragonblight.ForeverAchievementDetails>(1500, (row) => row.achievement != null);

export function loadAchievementDetails(region: string, ids: number[]) {
  return achievementDetails.load(region, ids, (batch) => client.getAchievementDetails(region, batch), achievementBatchSize);
}

export const recipeBatchSize = 10;
export const recipeDetails = new DetailCache<Dragonblight.ForeverRecipeDetails>(1500, (row) => row.recipe != null);

export function loadRecipeDetails(region: string, ids: number[]) {
  return recipeDetails.load(region, ids, (batch) => client.getRecipes(region, batch), recipeBatchSize);
}

// Mount, pet, toy and appearance pictures. Each kind finds its picture differently, so each has its own cache.
export const collectionIconBatchSize = 50;
export const collectionIcons: Record<CollectionKind, DetailCache<Dragonblight.ForeverCollectionIcon>> = {
  mount: new DetailCache(500, (row) => row.icon != null),
  pet: new DetailCache(500, (row) => row.icon != null),
  toy: new DetailCache(200, (row) => row.icon != null),
  appearance: new DetailCache(3000, (row) => row.icon != null),
};

export function loadCollectionIcons(kind: CollectionKind, region: string, ids: number[]) {
  return collectionIcons[kind].load(region, ids, (batch) => client.getCollectionIcons(region, kind, batch), collectionIconBatchSize);
}
