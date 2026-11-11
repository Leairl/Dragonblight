const allianceRanks = [
  "Private", "Corporal", "Sergeant", "Master Sergeant", "Sergeant Major",
  "Knight", "Knight-Lieutenant", "Knight-Captain", "Knight-Champion",
  "Lieutenant Commander", "Commander", "Marshal", "Field Marshal", "Grand Marshal",
];

const hordeRanks = [
  "Scout", "Grunt", "Sergeant", "Senior Sergeant", "First Sergeant",
  "Stone Guard", "Blood Guard", "Legionnaire", "Centurion",
  "Champion", "Lieutenant General", "General", "Warlord", "High Warlord",
];

export function pvpRankName(rank: number | null | undefined, faction: string | undefined): string {
  if (rank == null) return "—";
  if (rank === 0) return "Civilian";
  const ranks = faction?.toUpperCase() === "ALLIANCE" ? allianceRanks
    : faction?.toUpperCase() === "HORDE" ? hordeRanks : undefined;
  //Keep unknown ranks or factions readable without assigning the wrong title.
  return (Number.isInteger(rank) ? ranks?.[rank - 1] : undefined) ?? `Rank ${rank}`;
}
