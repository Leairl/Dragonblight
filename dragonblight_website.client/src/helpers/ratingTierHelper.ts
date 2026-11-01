// The retail rating tiers, shared by the rating cards and the alt list so the thresholds and the
// colors only ever have to be corrected in one place. Rank 1 is not here: it comes from the

import { Dragonblight } from "../clients/Dragonblight";
import { getFlavor } from "./game-flavor";

// season's reward cutoffs, which move with the ladder, and profile-rating checks it first.
interface RatingTier {
  title: string;
  // Tiers follow the current rating (Blizzard doesn't return the season high);
  // rank 1 titles are only decided when the season ends, so those are a prediction.
  label: "Current Title:" | "Predicted Title:";
}
const RankOneColor = "text-orange-500";
// The best season reward a rating has reached in its bracket: the one with the highest cutoff.
// Retail's list only has rank 1 titles; Classic's has every title, so this also finds Duelist etc.
function bestReward(
  rewards: Dragonblight.PvpSeasonRewardWithRank[] | undefined,
  bracketType: string | undefined,
  rating: number | undefined,
  specId?: number,
  faction?: string
): Dragonblight.PvpSeasonRewardWithRank | undefined {
  if (!bracketType) {
    return undefined;
  }
  let best: Dragonblight.PvpSeasonRewardWithRank | undefined;
  for (const r of rewards ?? []) {
    const reached = r.bracket?.type?.includes(bracketType) &&
    // undefined because some brackets don't have a spec or faction
      (specId === undefined || r.specialization?.id === specId) &&
      (faction === undefined || r.faction?.type === undefined || r.faction.type === faction) &&
      r.rating_cutoff > 0 &&
      (rating ?? 0) >= r.rating_cutoff;
    if (reached && r.rating_cutoff > (best?.rating_cutoff ?? -1)) {
      best = r;
    }
  }
  return best;
}

// highest first, so the first threshold a rating meets is the tier it earned
const RetailTiers: [number, RatingTier][] = [

  [2300, { title: "Elite", label: "Current Title:"}],
  [2100, { title: "Duelist", label: "Current Title:"}],
  [1800, { title: "Rival", label: "Current Title:"}],
  [1400, { title: "Challenger", label: "Current Title:"}],
  [1000, { title: "Combatant", label: "Current Title:"}],
];

// undefined below Combatant, which leaves the rating in the page's own color
function retailTier(rating: number | undefined): RatingTier | undefined {
  const currentRating = rating ?? 0;
  for (const [minimumRating, tier] of RetailTiers) {
    if (currentRating >= minimumRating) {
      return tier;
    }
  }
}
function TitleColors(title: string | undefined): string {
  if (title?.includes(" Gladiator")) return "text-orange-500";   // rank 1, e.g. "Grievous Gladiator"
  if (title?.includes(" Legend")) return "text-purple-500";
  if (title?.includes(" Marshal") || (title?.includes(" Warlord"))) return "text-green-500";
  if (title?.startsWith("Gladiator") || title?.includes("Hero of the ")) return "text-purple-500";
  if (title?.startsWith("Legend")) return "text-purple-500";
  if (title?.startsWith("Elite")) return "text-purple-500";
  if (title?.startsWith("Duelist")) return "text-blue-500";
  if (title?.startsWith("Rival")) return "text-green-500";
  if (title?.startsWith("Challenger")) return "text-neutral-500";
  return "text-stone-100";
}
function cleanTitle(name: string | undefined): string {
  return (name ?? "").replace(/\s*[-:]\s*(\w+ )*Season \d+/, "").replace("[DNT] ", "").trim();
}
function ratingColor(
  rewards: Dragonblight.PvpSeasonRewardWithRank[] | undefined,
  bracketType: string | undefined,
  rating: number | undefined,
  specId?: number
): string {
  const reward = bestReward(rewards, bracketType, rating, specId);
  if (getFlavor() == "retail") {
    return reward ? RankOneColor : (TitleColors(retailTier(rating)?.title) ?? "text-stone-100");
  }
  return TitleColors(reward?.achievement?.name)
}
export {
  RetailTiers, retailTier, bestReward, RankOneColor, ratingColor // Tiers follow the current rating (Blizzard doesn't return the season high);
  , TitleColors, cleanTitle
};
export type { RatingTier };
