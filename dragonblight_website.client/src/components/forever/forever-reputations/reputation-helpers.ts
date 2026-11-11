import type { Dragonblight } from "../../../clients/Dragonblight";

const standingColors = ["red", "red", "orange", "amber", "grass", "green", "teal", "cyan"] as const;

export function reputationColor(tier: number | undefined) {
  return tier != null && Number.isInteger(tier) ? standingColors[tier] ?? "gray" : "gray";
}

export function filterReputations(entries: Dragonblight.ForeverReputation[], query: string) {
  const search = query.trim().toLocaleLowerCase();
  return entries.filter((entry) => !search || [entry.faction?.name, entry.standing?.name]
    .some((name) => name?.toLocaleLowerCase().includes(search)))
    .sort((a, b) => (a.faction?.name ?? "").localeCompare(b.faction?.name ?? ""));
}

export function reputationProgress(standing: Dragonblight.ForeverReputationStanding | undefined) {
  const value = standing?.value;
  const max = standing?.max;
  if (value == null || max == null || !Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return undefined;
  //The API's value is progress within this standing, even when raw reputation is negative.
  return { value: Math.max(0, Math.min(value, max)), max };
}
