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
const RewardBracketTypes: Record<string, string> = {
  "2v2": "ARENA_2v2",
  "3v3": "ARENA_3v3",
  "5v5": "ARENA_5v5",
  rbg: "BATTLEGROUNDS",
  shuffle: "SHUFFLE",
  blitz: "BLITZ",
};
// The color for a ladder row's rating: the bracket's top title color once it reaches that title's cutoff,
// otherwise nothing so it keeps the page's color. Shuffle and Blitz cutoffs are per spec, so an overall
// ladder finds the row's own spec, and a row whose spec isn't known stays uncolored.
function rankOneRatingClass(
  rewards: Dragonblight.PvpSeasonRewardWithRank[],
  ladders: Dragonblight.LadderBracket[],
  bracket: string,
  rating: number,
  className: string | undefined,
  specName: string | undefined,
  faction: string | undefined
): string {
  const ladder = bracket.split("-")[0];
  let specId: number | undefined;
  if (ladder == "shuffle" || ladder == "blitz") {
    //the overall ladders store a spec as its ladder name, like "beastmastery" for "Beast Mastery"
    const specLadderName = (specName ?? "").replace(/ /g, "").toLowerCase();
    const spec = ladders.find((l) => l.slug == bracket && l.specId) ??
      ladders.find((l) => l.ladder == ladder && l.className == className && l.specName?.replace(/ /g, "").toLowerCase() == specLadderName);
    if (!spec) {
      return "";
    }
    specId = spec.specId;
  }
  // no rating is above this, so it finds the bracket's highest title rather than the best one reached
  const topReward = bestReward(rewards, RewardBracketTypes[ladder], Number.MAX_SAFE_INTEGER, specId, faction);
  if (!topReward || rating < topReward.rating_cutoff) {
    return "";
  }
  return TitleColors(topReward.achievement?.name) + " text-shadow-md text-shadow-black";
}
export {
  RetailTiers, retailTier, bestReward, RankOneColor, ratingColor, rankOneRatingClass // Tiers follow the current rating (Blizzard doesn't return the season high);
  , TitleColors, cleanTitle
};
export type { RatingTier };
