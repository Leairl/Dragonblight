import { Dragonblight } from "../clients/Dragonblight";

//only Gladiator and Rank 1 have custom icons, in this order
const customTiers = ["Gladiator", "RankOne", "LegendRankOne", "BlitzRankOne"];

const iconColor: Record<string, string> = { Gladiator: "blue", RankOne: "red", LegendRankOne: "purple", BlitzRankOne: "green" };

//what each tier counts, read after the number: "7 Rank 1 titles in 3v3"
const tierLabel: Record<string, [string, string]> = {
  Gladiator: ["Gladiator title", "Gladiator titles"],
  RankOne: ["Rank 1 title in 3v3", "Rank 1 titles in 3v3"],
  LegendRankOne: ["Rank 1 title in Solo Shuffle", "Rank 1 titles in Solo Shuffle"],
  BlitzRankOne: ["Rank 1 title in Blitz", "Rank 1 titles in Blitz"],
};

export function customAchievementTiers(tiers: Dragonblight.TierAchievements[]): Dragonblight.TierAchievements[] {
  return tiers.filter((a) => customTiers.includes(a.tier ?? ""));
}

//best first: rank 1 in 3v3, then Solo Shuffle, then Blitz, then Gladiator
const rankOrder = ["RankOne", "LegendRankOne", "BlitzRankOne", "Gladiator"];

export function sortByTitleRank(tiers: Dragonblight.TierAchievements[]): Dragonblight.TierAchievements[] {
  return [...tiers].sort((a, b) => rankOrder.indexOf(a.tier ?? "") - rankOrder.indexOf(b.tier ?? ""));
}

//the icon with the tier's count drawn on it
export function numberedIcon(a: Dragonblight.TierAchievements): string {
  const prefix = iconColor[a.tier ?? ""];
  const number = a.achievements?.length;
  return `/numberedAchievementIcons/${prefix}_${number}.png`;
}

export function tierCountText(a: Dragonblight.TierAchievements): string {
  const count = a.achievements?.length ?? 0;
  const label = tierLabel[a.tier ?? ""];
  if (label == undefined) {
    return "";
  }
  if (count === 1) {
    return `${count} ${label[0]}`;
  }
  return `${count} ${label[1]}`;
}
