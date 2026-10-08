import { Dragonblight } from "../clients/Dragonblight";

export interface ShuffleSpec {
  //Blizzard's ladder name, which is also the bracket the server syncs and the rankings URL uses
  slug: string;
  className: string;
  specName: string;
  //Blizzard's playable-specialization id, which is how a Shuffle reward says which ladder it is for
  specId: number;
  //the server has one Solo Shuffle endpoint per spec
  fetch: (
    client: Dragonblight.PvpLeaderboardClient,
    skip: number,
    take: number,
    region: string
  ) => Promise<Dragonblight.PvpCharacterSummary[]>;
}

//Every retail Solo Shuffle ladder, grouped by class. Used by the spec dropdown and by the rankings
//page to pick which endpoint to call.
export const shuffleSpecs: ShuffleSpec[] = [
  { slug: "shuffle", className: "", specName: "All", specId: 0, fetch: (c, skip, take, region) => c.getShuffleLadder(skip, take, region) },
  { slug: "shuffle-deathknight-blood", className: "Death Knight", specName: "Blood", specId: 250, fetch: (c, skip, take, region) => c.getShuffleDeathKnightBloodLadder(skip, take, region) },
  { slug: "shuffle-deathknight-frost", className: "Death Knight", specName: "Frost", specId: 251, fetch: (c, skip, take, region) => c.getShuffleDeathKnightFrostLadder(skip, take, region) },
  { slug: "shuffle-deathknight-unholy", className: "Death Knight", specName: "Unholy", specId: 252, fetch: (c, skip, take, region) => c.getShuffleDeathKnightUnholyLadder(skip, take, region) },
  { slug: "shuffle-demonhunter-devourer", className: "Demon Hunter", specName: "Devourer", specId: 1480, fetch: (c, skip, take, region) => c.getShuffleDemonHunterDevourerLadder(skip, take, region) },
  { slug: "shuffle-demonhunter-havoc", className: "Demon Hunter", specName: "Havoc", specId: 577, fetch: (c, skip, take, region) => c.getShuffleDemonHunterHavocLadder(skip, take, region) },
  { slug: "shuffle-demonhunter-vengeance", className: "Demon Hunter", specName: "Vengeance", specId: 581, fetch: (c, skip, take, region) => c.getShuffleDemonHunterVengeanceLadder(skip, take, region) },
  { slug: "shuffle-druid-balance", className: "Druid", specName: "Balance", specId: 102, fetch: (c, skip, take, region) => c.getShuffleDruidBalanceLadder(skip, take, region) },
  { slug: "shuffle-druid-feral", className: "Druid", specName: "Feral", specId: 103, fetch: (c, skip, take, region) => c.getShuffleDruidFeralLadder(skip, take, region) },
  { slug: "shuffle-druid-guardian", className: "Druid", specName: "Guardian", specId: 104, fetch: (c, skip, take, region) => c.getShuffleDruidGuardianLadder(skip, take, region) },
  { slug: "shuffle-druid-restoration", className: "Druid", specName: "Restoration", specId: 105, fetch: (c, skip, take, region) => c.getShuffleDruidRestorationLadder(skip, take, region) },
  { slug: "shuffle-evoker-augmentation", className: "Evoker", specName: "Augmentation", specId: 1473, fetch: (c, skip, take, region) => c.getShuffleEvokerAugmentationLadder(skip, take, region) },
  { slug: "shuffle-evoker-devastation", className: "Evoker", specName: "Devastation", specId: 1467, fetch: (c, skip, take, region) => c.getShuffleEvokerDevastationLadder(skip, take, region) },
  { slug: "shuffle-evoker-preservation", className: "Evoker", specName: "Preservation", specId: 1468, fetch: (c, skip, take, region) => c.getShuffleEvokerPreservationLadder(skip, take, region) },
  { slug: "shuffle-hunter-beastmastery", className: "Hunter", specName: "Beast Mastery", specId: 253, fetch: (c, skip, take, region) => c.getShuffleHunterBeastMasteryLadder(skip, take, region) },
  { slug: "shuffle-hunter-marksmanship", className: "Hunter", specName: "Marksmanship", specId: 254, fetch: (c, skip, take, region) => c.getShuffleHunterMarksmanshipLadder(skip, take, region) },
  { slug: "shuffle-hunter-survival", className: "Hunter", specName: "Survival", specId: 255, fetch: (c, skip, take, region) => c.getShuffleHunterSurvivalLadder(skip, take, region) },
  { slug: "shuffle-mage-arcane", className: "Mage", specName: "Arcane", specId: 62, fetch: (c, skip, take, region) => c.getShuffleMageArcaneLadder(skip, take, region) },
  { slug: "shuffle-mage-fire", className: "Mage", specName: "Fire", specId: 63, fetch: (c, skip, take, region) => c.getShuffleMageFireLadder(skip, take, region) },
  { slug: "shuffle-mage-frost", className: "Mage", specName: "Frost", specId: 64, fetch: (c, skip, take, region) => c.getShuffleMageFrostLadder(skip, take, region) },
  { slug: "shuffle-monk-brewmaster", className: "Monk", specName: "Brewmaster", specId: 268, fetch: (c, skip, take, region) => c.getShuffleMonkBrewmasterLadder(skip, take, region) },
  { slug: "shuffle-monk-mistweaver", className: "Monk", specName: "Mistweaver", specId: 270, fetch: (c, skip, take, region) => c.getShuffleMonkMistweaverLadder(skip, take, region) },
  { slug: "shuffle-monk-windwalker", className: "Monk", specName: "Windwalker", specId: 269, fetch: (c, skip, take, region) => c.getShuffleMonkWindwalkerLadder(skip, take, region) },
  { slug: "shuffle-paladin-holy", className: "Paladin", specName: "Holy", specId: 65, fetch: (c, skip, take, region) => c.getShufflePaladinHolyLadder(skip, take, region) },
  { slug: "shuffle-paladin-protection", className: "Paladin", specName: "Protection", specId: 66, fetch: (c, skip, take, region) => c.getShufflePaladinProtectionLadder(skip, take, region) },
  { slug: "shuffle-paladin-retribution", className: "Paladin", specName: "Retribution", specId: 70, fetch: (c, skip, take, region) => c.getShufflePaladinRetributionLadder(skip, take, region) },
  { slug: "shuffle-priest-discipline", className: "Priest", specName: "Discipline", specId: 256, fetch: (c, skip, take, region) => c.getShufflePriestDisciplineLadder(skip, take, region) },
  { slug: "shuffle-priest-holy", className: "Priest", specName: "Holy", specId: 257, fetch: (c, skip, take, region) => c.getShufflePriestHolyLadder(skip, take, region) },
  { slug: "shuffle-priest-shadow", className: "Priest", specName: "Shadow", specId: 258, fetch: (c, skip, take, region) => c.getShufflePriestShadowLadder(skip, take, region) },
  { slug: "shuffle-rogue-assassination", className: "Rogue", specName: "Assassination", specId: 259, fetch: (c, skip, take, region) => c.getShuffleRogueAssassinationLadder(skip, take, region) },
  { slug: "shuffle-rogue-outlaw", className: "Rogue", specName: "Outlaw", specId: 260, fetch: (c, skip, take, region) => c.getShuffleRogueOutlawLadder(skip, take, region) },
  { slug: "shuffle-rogue-subtlety", className: "Rogue", specName: "Subtlety", specId: 261, fetch: (c, skip, take, region) => c.getShuffleRogueSubtletyLadder(skip, take, region) },
  { slug: "shuffle-shaman-elemental", className: "Shaman", specName: "Elemental", specId: 262, fetch: (c, skip, take, region) => c.getShuffleShamanElementalLadder(skip, take, region) },
  { slug: "shuffle-shaman-enhancement", className: "Shaman", specName: "Enhancement", specId: 263, fetch: (c, skip, take, region) => c.getShuffleShamanEnhancementLadder(skip, take, region) },
  { slug: "shuffle-shaman-restoration", className: "Shaman", specName: "Restoration", specId: 264, fetch: (c, skip, take, region) => c.getShuffleShamanRestorationLadder(skip, take, region) },
  { slug: "shuffle-warlock-affliction", className: "Warlock", specName: "Affliction", specId: 265, fetch: (c, skip, take, region) => c.getShuffleWarlockAfflictionLadder(skip, take, region) },
  { slug: "shuffle-warlock-demonology", className: "Warlock", specName: "Demonology", specId: 266, fetch: (c, skip, take, region) => c.getShuffleWarlockDemonologyLadder(skip, take, region) },
  { slug: "shuffle-warlock-destruction", className: "Warlock", specName: "Destruction", specId: 267, fetch: (c, skip, take, region) => c.getShuffleWarlockDestructionLadder(skip, take, region) },
  { slug: "shuffle-warrior-arms", className: "Warrior", specName: "Arms", specId: 71, fetch: (c, skip, take, region) => c.getShuffleWarriorArmsLadder(skip, take, region) },
  { slug: "shuffle-warrior-fury", className: "Warrior", specName: "Fury", specId: 72, fetch: (c, skip, take, region) => c.getShuffleWarriorFuryLadder(skip, take, region) },
  { slug: "shuffle-warrior-protection", className: "Warrior", specName: "Protection", specId: 73, fetch: (c, skip, take, region) => c.getShuffleWarriorProtectionLadder(skip, take, region) },
];

export const defaultShuffleSpec = "shuffle";

export function isShuffleBracket(bracket: string | undefined): boolean {
  return bracket?.startsWith("shuffle") ?? false;
}

//the spec's icon in /public/Specs, named the way the profile page already names them
export function shuffleSpecIcon(spec: ShuffleSpec): string {
  if (spec.specName === "All") {
    return 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
  }
  return `/Specs/${spec.specName.toLowerCase()}_${spec.className.toLowerCase()}.png`;
}
