import type { Dragonblight } from "../../../clients/Dragonblight";

type Entry = Dragonblight.ForeverAchievementProgress;
type Definition = Dragonblight.ForeverAchievement;
export type AchievementStatus = "completed" | "in-progress" | "unknown";

export function achievementStatus(entry: Entry): AchievementStatus {
  if (entry.criteria?.is_completed === true || (entry.completed_timestamp != null && entry.completed_timestamp > 0)) return "completed";
  return entry.criteria?.is_completed === false ? "in-progress" : "unknown";
}

export function reportedAchievements(entries: Entry[] = []): Entry[] {
  const unique = new Map<number, Entry>();
  for (const entry of entries) {
    const id = entry.id > 0 ? entry.id : entry.achievement?.id;
    if (id == null || id <= 0) continue;
    const previous = unique.get(id);
    if (!previous || achievementStatus(previous) !== "completed") unique.set(id, { ...entry, id });
  }
  return [...unique.values()];
}

export function filterAchievements(entries: Entry[], details: Map<number, Dragonblight.ForeverAchievementDetails>, query: string, status: string, category: string) {
  const search = query.trim().toLocaleLowerCase();
  return entries.filter((entry) => {
    const definition = details.get(entry.id)?.achievement;
    const matchesCategory = category === "all" || (category === "unknown" ? !definition?.category : String(definition?.category?.id) === category);
    const name = definition?.name ?? entry.achievement?.name ?? "";
    return matchesCategory && (status === "all" || achievementStatus(entry) === status)
      && (!search || name.toLocaleLowerCase().includes(search) || definition?.description?.toLocaleLowerCase().includes(search));
  }).sort((a, b) => {
    const completed = Number(achievementStatus(b) === "completed") - Number(achievementStatus(a) === "completed");
    return completed || (b.completed_timestamp ?? 0) - (a.completed_timestamp ?? 0)
      || (details.get(a.id)?.achievement?.name ?? a.achievement?.name ?? "").localeCompare(details.get(b.id)?.achievement?.name ?? b.achievement?.name ?? "");
  });
}

export function achievementDate(timestamp: number | undefined): string | undefined {
  if (timestamp == null || timestamp <= 0 || !Number.isFinite(timestamp)) return undefined;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? undefined : date.toLocaleDateString();
}

export interface CriterionRow {
  id: number;
  label: string;
  completed?: boolean;
  amount?: number;
  target?: number;
}

//Join definitions and character progress by ID, not array position. Show only individual
//criterion targets: summing children would invent progress for AND/OR or other operators.
export function achievementCriteria(definition: Definition | undefined, entry: Entry): CriterionRow[] {
  const progress = new Map<number, Dragonblight.ForeverAchievementCriteriaProgress>();
  function collect(node: Dragonblight.ForeverAchievementCriteriaProgress | undefined) {
    if (!node) return;
    progress.set(node.id, node);
    node.child_criteria?.forEach(collect);
  }
  collect(entry.criteria);
  const rows: CriterionRow[] = [];
  function visit(node: Dragonblight.ForeverAchievementCriteria | undefined) {
    if (!node) return;
    if (node.child_criteria?.length) { node.child_criteria.forEach(visit); return; }
    const current = progress.get(node.id);
    rows.push({
      id: node.id, label: node.description ?? `Criterion ${node.id}`, completed: current?.is_completed,
      amount: current?.amount != null && Number.isFinite(current.amount) ? current.amount : undefined,
      target: node.show_progress_bar && node.amount != null && Number.isFinite(node.amount) && node.amount > 0 ? node.amount : undefined,
    });
  }
  visit(definition?.criteria);
  return rows;
}
