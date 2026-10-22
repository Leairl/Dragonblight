import { Dragonblight } from "../clients/Dragonblight";

//the custom season icon for a Gladiator or Rank 1 title, e.g.
//"Prized Gladiator: The War Within Season 2" -> /ArenaAchievementIcons/r1-the-war-within-season-2.png
//undefined for any other tier, which has no custom icon
export const tierColor: Record<string, string> = {
  RankOne: "text-yellow-600",
  LegendRankOne: "text-purple-600",
  BlitzRankOne: "text-green-600",
  Gladiator: "text-purple-500",
  Legend: "text-purple-400",
  Duelist: "text-blue-500",
  Rival: "text-green-500",
  Challenger: "text-neutral-500",
};
export function seasonalIcon(a: Dragonblight.SeasonalAchievement): string | undefined {
  const iconPrefix: Record<string, string> = {
  Gladiator: "glad",
  RankOne: "r1",
  LegendRankOne: "shuffle",
  BlitzRankOne: "blitz",
};
const prefix = iconPrefix[a.tier ?? ""];
if (!prefix) {
    return undefined;
  }
  const seasonSlug = (a.season ?? "").toLowerCase().split(" ").join("-");
  return `/ArenaAchievementIcons/${prefix}-${seasonSlug}.png`;
}