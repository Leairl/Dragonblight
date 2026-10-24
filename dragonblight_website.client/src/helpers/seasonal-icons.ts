import { Dragonblight } from "../clients/Dragonblight";

//the custom season icon for a Gladiator or Rank 1 title, e.g.
//"Prized Gladiator: The War Within Season 2" -> /ArenaAchievementIcons/r1-the-war-within-season-2.png
//undefined for any other tier, which has no custom icon

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