import { Dragonblight } from "../clients/Dragonblight";

export interface BlitzSpec {
  //Blizzard's ladder name, which is also the bracket the server syncs and the rankings URL uses
  slug: string;
  className: string;
  specName: string;
  //Blizzard's playable-specialization id, which is how a Blitz reward says which ladder it is for
  specId: number;
  //the server has one Blitz endpoint per spec
  fetch: (
    client: Dragonblight.PvpLeaderboardClient,
    skip: number,
    take: number,
    region: string
  ) => Promise<Dragonblight.PvpCharacterSummary[]>;
}

//Every retail Blitz ladder, grouped by class. Used by the spec dropdown and by the rankings
//page to pick which endpoint to call.
export const blitzSpecs: BlitzSpec[] = [
  { slug: "blitz", className: "", specName: "All", specId: 0, fetch: (c, skip, take, region) => c.getBlitzLadder(skip, take, region) },
  { slug: "blitz-deathknight-blood", className: "Death Knight", specName: "Blood", specId: 250, fetch: (c, skip, take, region) => c.getBlitzDeathKnightBloodLadder(skip, take, region) },
  { slug: "blitz-deathknight-frost", className: "Death Knight", specName: "Frost", specId: 251, fetch: (c, skip, take, region) => c.getBlitzDeathKnightFrostLadder(skip, take, region) },
  { slug: "blitz-deathknight-unholy", className: "Death Knight", specName: "Unholy", specId: 252, fetch: (c, skip, take, region) => c.getBlitzDeathKnightUnholyLadder(skip, take, region) },
  { slug: "blitz-demonhunter-devourer", className: "Demon Hunter", specName: "Devourer", specId: 1480, fetch: (c, skip, take, region) => c.getBlitzDemonHunterDevourerLadder(skip, take, region) },
  { slug: "blitz-demonhunter-havoc", className: "Demon Hunter", specName: "Havoc", specId: 577, fetch: (c, skip, take, region) => c.getBlitzDemonHunterHavocLadder(skip, take, region) },
  { slug: "blitz-demonhunter-vengeance", className: "Demon Hunter", specName: "Vengeance", specId: 581, fetch: (c, skip, take, region) => c.getBlitzDemonHunterVengeanceLadder(skip, take, region) },
  { slug: "blitz-druid-balance", className: "Druid", specName: "Balance", specId: 102, fetch: (c, skip, take, region) => c.getBlitzDruidBalanceLadder(skip, take, region) },
  { slug: "blitz-druid-feral", className: "Druid", specName: "Feral", specId: 103, fetch: (c, skip, take, region) => c.getBlitzDruidFeralLadder(skip, take, region) },
  { slug: "blitz-druid-guardian", className: "Druid", specName: "Guardian", specId: 104, fetch: (c, skip, take, region) => c.getBlitzDruidGuardianLadder(skip, take, region) },
  { slug: "blitz-druid-restoration", className: "Druid", specName: "Restoration", specId: 105, fetch: (c, skip, take, region) => c.getBlitzDruidRestorationLadder(skip, take, region) },
  { slug: "blitz-evoker-augmentation", className: "Evoker", specName: "Augmentation", specId: 1473, fetch: (c, skip, take, region) => c.getBlitzEvokerAugmentationLadder(skip, take, region) },
  { slug: "blitz-evoker-devastation", className: "Evoker", specName: "Devastation", specId: 1467, fetch: (c, skip, take, region) => c.getBlitzEvokerDevastationLadder(skip, take, region) },
  { slug: "blitz-evoker-preservation", className: "Evoker", specName: "Preservation", specId: 1468, fetch: (c, skip, take, region) => c.getBlitzEvokerPreservationLadder(skip, take, region) },
  { slug: "blitz-hunter-beastmastery", className: "Hunter", specName: "Beast Mastery", specId: 253, fetch: (c, skip, take, region) => c.getBlitzHunterBeastMasteryLadder(skip, take, region) },
  { slug: "blitz-hunter-marksmanship", className: "Hunter", specName: "Marksmanship", specId: 254, fetch: (c, skip, take, region) => c.getBlitzHunterMarksmanshipLadder(skip, take, region) },
  { slug: "blitz-hunter-survival", className: "Hunter", specName: "Survival", specId: 255, fetch: (c, skip, take, region) => c.getBlitzHunterSurvivalLadder(skip, take, region) },
  { slug: "blitz-mage-arcane", className: "Mage", specName: "Arcane", specId: 62, fetch: (c, skip, take, region) => c.getBlitzMageArcaneLadder(skip, take, region) },
  { slug: "blitz-mage-fire", className: "Mage", specName: "Fire", specId: 63, fetch: (c, skip, take, region) => c.getBlitzMageFireLadder(skip, take, region) },
  { slug: "blitz-mage-frost", className: "Mage", specName: "Frost", specId: 64, fetch: (c, skip, take, region) => c.getBlitzMageFrostLadder(skip, take, region) },
  { slug: "blitz-monk-brewmaster", className: "Monk", specName: "Brewmaster", specId: 268, fetch: (c, skip, take, region) => c.getBlitzMonkBrewmasterLadder(skip, take, region) },
  { slug: "blitz-monk-mistweaver", className: "Monk", specName: "Mistweaver", specId: 270, fetch: (c, skip, take, region) => c.getBlitzMonkMistweaverLadder(skip, take, region) },
  { slug: "blitz-monk-windwalker", className: "Monk", specName: "Windwalker", specId: 269, fetch: (c, skip, take, region) => c.getBlitzMonkWindwalkerLadder(skip, take, region) },
  { slug: "blitz-paladin-holy", className: "Paladin", specName: "Holy", specId: 65, fetch: (c, skip, take, region) => c.getBlitzPaladinHolyLadder(skip, take, region) },
  { slug: "blitz-paladin-protection", className: "Paladin", specName: "Protection", specId: 66, fetch: (c, skip, take, region) => c.getBlitzPaladinProtectionLadder(skip, take, region) },
  { slug: "blitz-paladin-retribution", className: "Paladin", specName: "Retribution", specId: 70, fetch: (c, skip, take, region) => c.getBlitzPaladinRetributionLadder(skip, take, region) },
  { slug: "blitz-priest-discipline", className: "Priest", specName: "Discipline", specId: 256, fetch: (c, skip, take, region) => c.getBlitzPriestDisciplineLadder(skip, take, region) },
  { slug: "blitz-priest-holy", className: "Priest", specName: "Holy", specId: 257, fetch: (c, skip, take, region) => c.getBlitzPriestHolyLadder(skip, take, region) },
  { slug: "blitz-priest-shadow", className: "Priest", specName: "Shadow", specId: 258, fetch: (c, skip, take, region) => c.getBlitzPriestShadowLadder(skip, take, region) },
  { slug: "blitz-rogue-assassination", className: "Rogue", specName: "Assassination", specId: 259, fetch: (c, skip, take, region) => c.getBlitzRogueAssassinationLadder(skip, take, region) },
  { slug: "blitz-rogue-outlaw", className: "Rogue", specName: "Outlaw", specId: 260, fetch: (c, skip, take, region) => c.getBlitzRogueOutlawLadder(skip, take, region) },
  { slug: "blitz-rogue-subtlety", className: "Rogue", specName: "Subtlety", specId: 261, fetch: (c, skip, take, region) => c.getBlitzRogueSubtletyLadder(skip, take, region) },
  { slug: "blitz-shaman-elemental", className: "Shaman", specName: "Elemental", specId: 262, fetch: (c, skip, take, region) => c.getBlitzShamanElementalLadder(skip, take, region) },
  { slug: "blitz-shaman-enhancement", className: "Shaman", specName: "Enhancement", specId: 263, fetch: (c, skip, take, region) => c.getBlitzShamanEnhancementLadder(skip, take, region) },
  { slug: "blitz-shaman-restoration", className: "Shaman", specName: "Restoration", specId: 264, fetch: (c, skip, take, region) => c.getBlitzShamanRestorationLadder(skip, take, region) },
  { slug: "blitz-warlock-affliction", className: "Warlock", specName: "Affliction", specId: 265, fetch: (c, skip, take, region) => c.getBlitzWarlockAfflictionLadder(skip, take, region) },
  { slug: "blitz-warlock-demonology", className: "Warlock", specName: "Demonology", specId: 266, fetch: (c, skip, take, region) => c.getBlitzWarlockDemonologyLadder(skip, take, region) },
  { slug: "blitz-warlock-destruction", className: "Warlock", specName: "Destruction", specId: 267, fetch: (c, skip, take, region) => c.getBlitzWarlockDestructionLadder(skip, take, region) },
  { slug: "blitz-warrior-arms", className: "Warrior", specName: "Arms", specId: 71, fetch: (c, skip, take, region) => c.getBlitzWarriorArmsLadder(skip, take, region) },
  { slug: "blitz-warrior-fury", className: "Warrior", specName: "Fury", specId: 72, fetch: (c, skip, take, region) => c.getBlitzWarriorFuryLadder(skip, take, region) },
  { slug: "blitz-warrior-protection", className: "Warrior", specName: "Protection", specId: 73, fetch: (c, skip, take, region) => c.getBlitzWarriorProtectionLadder(skip, take, region) },
];

export const defaultBlitzSpec = "blitz";

export function isBlitzBracket(bracket: string | undefined): boolean {
  return bracket?.startsWith("blitz") ?? false;
}

//the spec's icon in /public/Specs, named the way the profile page already names them
export function blitzSpecIcon(spec: BlitzSpec): string {
  if (spec.specName === "All") {
    return 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
  }
  return `/Specs/${spec.specName.toLowerCase()}_${spec.className.toLowerCase()}.png`;
}
