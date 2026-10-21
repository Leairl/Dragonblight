// The retail rating tiers, shared by the rating cards and the alt list so the thresholds and the
// colors only ever have to be corrected in one place. Rank 1 is not here: it comes from the
// season's reward cutoffs, which move with the ladder, and profile-rating checks it first.
interface RatingTier {
  title: string;
  // Tiers follow the current rating (Blizzard doesn't return the season high);
  // rank 1 titles are only decided when the season ends, so those are a prediction.
  label: "Current Title:" | "Predicted Title:";
  text: string;
}

// highest first, so the first threshold a rating meets is the tier it earned
const RetailTiers: [number, RatingTier][] = [
  [2300, { title: "Elite", label: "Current Title:", text: "text-purple-500"}],
  [2100, { title: "Duelist", label: "Current Title:", text: "text-blue-500"}],
  [1800, { title: "Rival", label: "Current Title:", text: "text-green-500"}],
  [1400, { title: "Challenger", label: "Current Title:", text: "text-white"}],
  [1000, { title: "Combatant", label: "Current Title:", text: "text-neutral-500" }],
];

// undefined below Combatant, which leaves the rating in the page's own color
function retailTier(rating: number | undefined): RatingTier | undefined {
  return RetailTiers.find(([minimum]) => (rating ?? 0) >= minimum)?.[1];
}

export { RetailTiers, retailTier };
export type { RatingTier };
