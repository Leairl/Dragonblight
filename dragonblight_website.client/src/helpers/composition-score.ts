import type { GameFlavor } from "./game-flavor";

//Arena Comp Viability Scorer. Every 3v3 composition gets a 0-100 score from four layers, scored per spec:
//  1. Spec Base Score (SBS): each spec's fixed attributes, rated 0-3 and weighted to 100
//  2. Comp synergy: how the three specs fit together, weighted ×1.75 and capped at +75
//  3. Live data: each spec's recent 3v3 win rate, pulled toward 50% when there are few games, capped at ±15
//  4. Checks: a team without exactly one healer, or with a spec that isn't viable in PvP, takes a penalty
//Raw score = 0.35 × average SBS + 1.75 × synergy + live − penalties. Spec ratings mostly add the same
//amount to every team, so synergy is weighted up to decide which teams are better. The score shown is that raw score as a share
//of the best raw score any healer and two damage specs can reach on the flavor, so the best comp is 100.
//All ratings and weights are starting values, meant to be tuned against real ladder results.

export type Role = "Melee DPS" | "Ranged DPS" | "Healer";
export type RangeType = "Melee" | "Caster" | "Ranged physical" | "Healer";
export type DamageProfile = "Sustain" | "Late burst" | "Mixed";
export type Control = "Stun" | "Incapacitate" | "Disorient" | "Silence" | "Root" | "Horror";
type Rating = 0 | 1 | 2 | 3;

export interface SpecProfile {
  className: string;
  specName: string;
  role: Role;
  range: RangeType;
  //damage specs: Mortal Strike, burst, sustain and defensives. Healers leave these at 0
  ms: Rating;
  burst: Rating;
  sustain: Rating;
  defensives: Rating;
  //healers: throughput, externals, mana and instant crowd control. Damage specs leave these at 0
  throughput: Rating;
  externals: Rating;
  mana: Rating;
  instantCc: Rating; //3 is instant at range, 2 needs close range, 1 is a cast or delayed
  instantCcName: string;
  //both
  peel: Rating; //peel and control
  mobility: Rating;
  dampening: Rating;
  purge: boolean; //an offensive dispel, or for Warriors Shattering Throw's immunity removal
  profile: DamageProfile;
  controls: Control[]; //main crowd control diminishing returns categories. Not tagged for healers yet
  extraDispels: string[]; //healers only, the dispel types beyond magic
  //filled per flavor from the spell tables below
  peelSpell: string; //its signature peel
  mobilitySpell: string; //what it brings for a teammate's mobility, or ""
  manaSpell: string; //what it brings for the healer's mana, or ""
  buffNames: string[]; //the party buffs its class brings
  rule: string; //the spec's star features. Healers list defensive cooldowns, and their throughput is added from the rating
}

type DpsRatings = [ms: Rating, burst: Rating, sustain: Rating, peel: Rating, defensives: Rating, mobility: Rating, dampening: Rating];
type HealerRatings = [throughput: Rating, externals: Rating, mana: Rating, mobility: Rating, peel: Rating, dampening: Rating, instantCc: Rating];

function dps(
  className: string,
  specName: string,
  range: Exclude<RangeType, "Healer">,
  ratings: DpsRatings,
  purge: boolean,
  profile: DamageProfile,
  controls: Control[],
  rule: string,
): SpecProfile {
  const [ms, burst, sustain, peel, defensives, mobility, dampening] = ratings;
  let role: Role = "Ranged DPS";
  if (range === "Melee") {
    role = "Melee DPS";
  }
  return {
    className, specName, role, range, ms, burst, sustain, defensives, peel, mobility, dampening, purge, profile, controls, rule,
    throughput: 0, externals: 0, mana: 0, instantCc: 0, instantCcName: "", extraDispels: [], peelSpell: "", mobilitySpell: "", manaSpell: "", buffNames: [],
  };
}

function healer(
  className: string,
  specName: string,
  ratings: HealerRatings,
  instantCcName: string,
  extraDispels: string[],
  purge: boolean,
  rule: string,
): SpecProfile {
  const [throughput, externals, mana, mobility, peel, dampening, instantCc] = ratings;
  return {
    className, specName, role: "Healer", range: "Healer", throughput, externals, mana, mobility, peel, dampening, instantCc, instantCcName,
    purge, extraDispels, rule,
    ms: 0, burst: 0, sustain: 0, defensives: 0, profile: "Mixed", controls: [], peelSpell: "", mobilitySpell: "", manaSpell: "", buffNames: [],
  };
}

//One signature peel per spec, by "Class:Spec". Classic overrides the specs whose peel differs there, like Death
//Knights, since Blinding Sleet doesn't exist in MoP.
const retailPeels: Record<string, string> = {
  "Warrior:Arms": "Disarm",
  "Warrior:Fury": "Disarm",
  "Druid:Feral": "Cyclone",
  "Druid:Balance": "Cyclone",
  "Druid:Restoration": "Cyclone",
  "Rogue:Subtlety": "Dismantle",
  "Rogue:Assassination": "Dismantle",
  "Rogue:Outlaw": "Dismantle",
  "Rogue:Combat": "Dismantle",
  "Hunter:Beast Mastery": "Intimidation",
  "Hunter:Marksmanship": "Binding Shot",
  "Hunter:Survival": "Intimidation",
  "Monk:Windwalker": "Grapple Weapon",
  "Monk:Mistweaver": "Ring of Peace",
  "Death Knight:Unholy": "Blinding Sleet",
  "Death Knight:Frost": "Chains of Ice",
  "Mage:Fire": "Dragon's Breath",
  "Mage:Frost": "Frost Nova",
  "Mage:Arcane": "Ring of Frost",
  "Warlock:Destruction": "Shadowfury",
  "Warlock:Demonology": "Axe Toss",
  "Warlock:Affliction": "Mortal Coil",
  "Demon Hunter:Havoc": "Chaos Nova",
  "Demon Hunter:Devourer": "Sigil of Misery",
  "Shaman:Elemental": "Thunderstorm",
  "Shaman:Enhancement": "Capacitor Totem",
  "Shaman:Restoration": "Capacitor Totem",
  "Evoker:Devastation": "Wing Buffet",
  "Evoker:Augmentation": "Tail Swipe",
  "Evoker:Preservation": "Landslide",
  "Paladin:Retribution": "Blessing of Protection",
  "Paladin:Holy": "Hammer of Justice",
  "Priest:Shadow": "Psychic Horror",
  "Priest:Discipline": "Psychic Scream",
  "Priest:Holy": "Holy Word: Chastise",
};

const classicPeelOverrides: Record<string, string> = {
  "Hunter:Survival": "Wyvern Sting",
  "Death Knight:Unholy": "Strangulate",
  "Paladin:Retribution": "Hand of Protection",
};

//The spell each class brings for a teammate's mobility, by class
const retailMobilitySpells: Record<string, string> = {
  Druid: "Stampeding Roar",
  Paladin: "Blessing of Freedom",
  Evoker: "Rescue",
  Priest: "Leap of Faith",
};

const classicMobilitySpells: Record<string, string> = {
  Druid: "Stampeding Roar",
  Paladin: "Hand of Freedom",
  Priest: "Leap of Faith",
};

//Mana spells, by "Class:Spec". Every Druid brings Innervate.
const retailManaSpells: Record<string, string> = {
  "Druid:Feral": "Innervate",
  "Druid:Balance": "Innervate",
  "Druid:Restoration": "Innervate",
  "Monk:Mistweaver": "Mana Tea",
  "Priest:Holy": "Symbol of Hope",
};

const classicManaSpells: Record<string, string> = {
  "Druid:Feral": "Innervate",
  "Druid:Balance": "Innervate",
  "Druid:Restoration": "Innervate",
  "Monk:Mistweaver": "Mana Tea",
  "Priest:Holy": "Hymn of Hope",
};

//The party buffs each class brings, by flavor. The effects are in the buffs table further down.
const retailClassBuffs: Record<string, string[]> = {
  "Demon Hunter": ["Chaos Brand"],
  Druid: ["Mark of the Wild"],
  Evoker: ["Blessing of the Bronze"],
  Hunter: ["Hunter's Mark"],
  Mage: ["Arcane Intellect"],
  Monk: ["Mystic Touch", "Zen Spheres"],
  Paladin: ["Concentration Aura", "Devotion Aura"],
  Priest: ["Power Word: Fortitude"],
  Shaman: ["Skyfury"],
  Warrior: ["Battle Shout"],
};

const classicClassBuffs: Record<string, string[]> = {
  "Death Knight": ["Horn of Winter"],
  Druid: ["Mark of the Wild"],
  Mage: ["Arcane Brilliance"],
  Monk: ["Legacy of the Emperor"],
  Paladin: ["Blessing of Kings"],
  Priest: ["Power Word: Fortitude"],
  Warrior: ["Battle Shout"],
};

interface FlavorTables {
  peelOverrides: Record<string, string>;
  mobility: Record<string, string>;
  mana: Record<string, string>;
  buffs: Record<string, string[]>;
}

function withSpells(specs: SpecProfile[], tables: FlavorTables): SpecProfile[] {
  return specs.map((spec) => {
    const key = `${spec.className}:${spec.specName}`;
    return {
      ...spec,
      peelSpell: tables.peelOverrides[key] ?? retailPeels[key] ?? "",
      mobilitySpell: tables.mobility[spec.className] ?? "",
      manaSpell: tables.mana[key] ?? "",
      buffNames: tables.buffs[spec.className] ?? [],
    };
  });
}

const retailTables: FlavorTables = { peelOverrides: {}, mobility: retailMobilitySpells, mana: retailManaSpells, buffs: retailClassBuffs };
const classicTables: FlavorTables = { peelOverrides: classicPeelOverrides, mobility: classicMobilitySpells, mana: classicManaSpells, buffs: classicClassBuffs };

//Wowhead spell ids by name, so the page can link every spell it mentions to its tooltip. Each id was checked
//against Wowhead's tooltip service. A few names are short forms used in the text, like "Freedom".
const sharedSpellIds: Record<string, number> = {
  "Mortal Strike": 12294, "Shattering Throw": 64382, "Recklessness": 1719, "Cyclone": 33786, "Maim": 22570, "Innervate": 29166, "Cheap Shot": 1833,
  "Kidney Shot": 408, "Blind": 2094, "Garrote": 703, "Gouge": 1776, "Roar of Sacrifice": 53480, "Aimed Shot": 19434,
  "Leg Sweep": 119381, "Paralysis": 115078, "Ring of Peace": 116844, "Death Grip": 49576, "Chains of Ice": 45524,
  "Pillar of Frost": 51271, "Obliterate": 49020, "Polymorph": 118, "Ring of Frost": 113724, "Dragon's Breath": 31661,
  "Frost Nova": 122, "Ice Block": 45438, "Chaos Bolt": 116858, "Fear": 5782, "Mortal Coil": 6789, "Axe Toss": 89766,
  "Shadowfury": 30283, "Mass Entanglement": 102359, "Entangling Roots": 339, "Typhoon": 132469, "Hex": 51514,
  "Thunderstorm": 51490, "Avenging Wrath": 31884, "Hammer of Justice": 853, "Divine Shield": 642, "Mass Dispel": 32375,
  "Psychic Scream": 8122, "Silence": 15487, "Psychic Horror": 64044, "Power Infusion": 10060, "Ironbark": 102342,
  "Barkskin": 22812, "Life Cocoon": 116849, "Revival": 115310, "Mana Tea": 115294, "Spirit Link Totem": 98008,
  "Tremor Totem": 8143, "Pain Suppression": 33206, "Power Word: Barrier": 62618, "Guardian Spirit": 47788,
  "Holy Word: Chastise": 88625, "Leap of Faith": 73325, "Stampeding Roar": 106898, "Binding Shot": 109248,
  "Intimidation": 19577, "Intimidating Shout": 5246, "Mark of the Wild": 1126, "Power Word: Fortitude": 21562,
  "Battle Shout": 6673,
};

const retailSpellIds: Record<string, number> = {
  ...sharedSpellIds,
  "Colossus Smash": 167105, "Bladestorm": 227847, "Die by the Sword": 118038, "Spell Reflection": 23920,
  "Shadow Dance": 185313, "Smoke Bomb": 212182, "Deathmark": 360194, "Freezing Trap": 187650, "Trueshot": 288613,
  "Storm, Earth, and Fire": 137639, "Rampage": 184367, "Asphyxiate": 108194, "Spellwarden": 410320, "Anti-Magic Shell": 48707, "Harpoon": 190925,
  "Boomstick": 1261193, "Takedown": 1250646, "Combustion": 190319, "Fel Fissure": 200586, "The Hunt": 370965,
  "Eye Beam": 198013, "Darkness": 196718, "Adrenaline Rush": 13750, "Between the Eyes": 315341,
  "Celestial Alignment": 194223, "Ice Barrier": 11426, "Summon Demonic Tyrant": 265187, "Demonic Tyrant": 265187,
  "Stormkeeper": 191634, "Ascendance": 114050, "Grounding Totem": 204336, "Dragonrage": 375087, "Fire Breath": 357208,
  "Sleep Walk": 360806, "Rescue": 370665, "Arcane Surge": 365350, "Unstable Affliction": 1259790,
  "Wake of Ashes": 255937, "Blessing of Protection": 1022, "Blessing of Freedom": 1044, "Freedom": 1044,
  "Blessing of Sacrifice": 6940, "Doom Winds": 384352, "Collapsing Star": 1221150, "Ebon Might": 395152,
  "Prescience": 409311, "Time Dilation": 357170, "Rewind": 363534, "Zephyr": 374227, "Incapacitating Roar": 99,
  "Earthen Wall Totem": 198838, "Ray of Hope": 197268, "Symbol of Hope": 64901, "Capacitor Totem": 192058,
  "Chaos Nova": 179057, "Fel Eruption": 211881, "Imprison": 217832, "Sigil of Misery": 207684,
  "Concussive Shot": 5116, "Wing Buffet": 357214, "Tail Swipe": 368970, "Landslide": 358385, "Blinding Light": 115750,
  "Hamstring": 1715, "Dismantle": 207777, "Blinding Sleet": 207167, "Storm Bolt": 107570, "Piercing Howl": 12323, "Disarm": 236077, "Grapple Weapon": 233759,
  "Supernova": 157980, "Earthbind Totem": 2484, "Skyfury": 462854, "Hunter's Mark": 257284, "Mystic Touch": 8647,
  "Chaos Brand": 1490, "Blessing of the Bronze": 364342, "Arcane Intellect": 1459, "Devotion Aura": 465,
  "Concentration Aura": 317920, "Zen Spheres": 410777, "Sphere of Despair": 411038,
};

const classicSpellIds: Record<string, number> = {
  ...sharedSpellIds,
  "Colossus Smash": 86346, "Bladestorm": 46924, "Shadow Dance": 51713, "Smoke Bomb": 76577, "Vendetta": 79140,
  "Killing Spree": 51690, "Blade Flurry": 13877, "Bestial Wrath": 19574, "Freezing Trap": 1499, "Rapid Fire": 3045,
  "Scatter Shot": 19503, "Explosive Shot": 53301, "Black Arrow": 3674, "Wyvern Sting": 19386, "Fists of Fury": 113656,
  "Tigereye Brew": 116740, "Summon Gargoyle": 49206, "Gargoyle": 49206, "Strangulate": 47476, "Combustion": 11129,
  "Deep Freeze": 44572, "Arcane Power": 12042, "Presence of Mind": 12043, "Havoc": 80240, "Metamorphosis": 103958,
  "Unstable Affliction": 30108, "Celestial Alignment": 112071, "Lava Burst": 51505, "Ascendance": 114049,
  "Grounding Totem": 8177, "Feral Spirit": 51533, "Hand of Protection": 1022, "Hand of Freedom": 1044, "Freedom": 1044,
  "Hand of Sacrifice": 6940, "Dismantle": 51722, "Dispersion": 47585, "Disorienting Roar": 99, "Hymn of Hope": 64901,
  "Capacitor Totem": 108269, "Disarm": 676, "Grapple Weapon": 117368, "Arcane Brilliance": 1459,
  "Legacy of the Emperor": 115921, "Blessing of Kings": 20217, "Horn of Winter": 57330,
};

export function spellIdsFor(flavor: GameFlavor): Record<string, number> {
  if (flavor === "retail") {
    return retailSpellIds;
  }
  return classicSpellIds;
}

//Damage ratings are MS, burst, sustain, peel & control, defensives, mobility and dampening.
//Healer ratings are throughput, externals, mana, mobility, peel & control, dampening and instant CC.
//Warriors count as a purge for Shattering Throw, which breaks Ice Block, Divine Shield and Blessing of Protection
const retailSpecs: SpecProfile[] = withSpells([
  dps("Warrior", "Arms", "Melee", [3, 3, 3, 3, 3, 2, 2], true, "Mixed", ["Stun", "Disorient"], "Mortal Strike keeps a near-permanent 25% healing reduction up, Colossus Smash and Bladestorm open kill windows, and Die by the Sword and Spell Reflection keep it alive."),
  dps("Druid", "Feral", "Melee", [3, 2, 2, 3, 3, 3, 3], false, "Sustain", ["Stun", "Disorient", "Root"], "Cyclone and Maim lock targets down, bleeds keep steady pressure from stealth, and Innervate refills the healer's mana."),
  dps("Rogue", "Subtlety", "Melee", [3, 3, 1, 3, 3, 3, 3], false, "Late burst", ["Stun", "Incapacitate", "Disorient"], "Shadow Dance with Cheap Shot into Kidney Shot opens one-shot stun windows, with Blind on the healer and Smoke Bomb to cut off heals."),
  dps("Rogue", "Assassination", "Melee", [3, 2, 3, 3, 2, 2, 3], false, "Late burst", ["Stun", "Incapacitate", "Disorient", "Silence"], "Deathmark and stacked poisons, with Garrote silencing the healer, build pressure that gets very hard to heal through late."),
  dps("Hunter", "Beast Mastery", "Ranged physical", [3, 2, 3, 2, 2, 2, 3], true, "Sustain", ["Incapacitate", "Stun"], "Pressure that never stops, even while moving, Freezing Trap on the healer, and Roar of Sacrifice to protect a teammate."),
  dps("Hunter", "Marksmanship", "Ranged physical", [3, 3, 2, 2, 2, 2, 2], true, "Late burst", ["Incapacitate", "Stun"], "Trueshot and Aimed Shot hit very hard from range with Freezing Trap on the healer, but it needs line of sight to cast."),
  dps("Monk", "Windwalker", "Melee", [3, 3, 2, 2, 2, 3, 2], false, "Late burst", ["Incapacitate", "Stun"], "Storm, Earth, and Fire burst behind a Leg Sweep or Paralysis, and Ring of Peace to peel."),
  dps("Warrior", "Fury", "Melee", [2, 2, 3, 3, 3, 2, 2], true, "Mixed", ["Stun", "Disorient"], "Recklessness and Rampage pressure with strong self-healing, but its healing reduction only reaches 36% with uptime, so it wants Freedom or a strong peel partner."),
  dps("Death Knight", "Unholy", "Melee", [3, 2, 3, 3, 3, 2, 2], false, "Sustain", ["Stun"], "Steady disease pressure with Death Grip and Asphyxiate to set up kills, and Spellwarden puts Anti-Magic Shell on teammates, which absorbs magic damage and stops magic crowd control from landing on them."),
  dps("Hunter", "Survival", "Melee", [3, 3, 1, 2, 2, 2, 2], true, "Late burst", ["Incapacitate", "Stun"], "One-shot potential with Boomstick and Takedown, and Harpoon to stay on the target."),
  dps("Mage", "Fire", "Caster", [0, 3, 2, 3, 3, 3, 3], true, "Late burst", ["Incapacitate", "Disorient", "Root"], "Combustion one-shots a target when it lands, and Polymorph, Ring of Frost and Dragon's Breath lock the healer out while it does."),
  dps("Warlock", "Destruction", "Caster", [1, 3, 2, 3, 2, 2, 3], true, "Late burst", ["Disorient", "Horror"], "Chaos Bolt burst that crits through absorbs, Fear on the healer, and Fel Fissure's healing reduction when enemies stand in it."),
  dps("Demon Hunter", "Havoc", "Melee", [2, 3, 3, 1, 1, 3, 2], true, "Mixed", ["Stun", "Incapacitate"], "The Hunt and Eye Beam frontload burst from very high mobility, and Darkness protects the team, but it's weak to roots."),
  dps("Rogue", "Outlaw", "Melee", [3, 1, 3, 2, 2, 3, 2], false, "Sustain", ["Stun", "Incapacitate", "Disorient"], "Adrenaline Rush provides heavy single target pressure, with Kidney Shot stuns and Gouge, and it stays efficient in long games."),
  dps("Druid", "Balance", "Caster", [0, 3, 2, 3, 3, 3, 3], false, "Mixed", ["Disorient", "Root"], "Celestial Alignment burst from range, Cyclone and Mass Entanglement control, and Innervate for the healer's mana."),
  dps("Mage", "Frost", "Caster", [0, 2, 2, 3, 3, 3, 3], true, "Sustain", ["Incapacitate", "Disorient", "Root"], "Shatter combos off Frost Nova and Ring of Frost, Polymorph chains on the healer, and Ice Block and Ice Barrier to survive."),
  dps("Warlock", "Demonology", "Caster", [3, 1, 2, 3, 2, 2, 2], false, "Sustain", ["Disorient", "Horror"], "Demonic Tyrant pet burst, Fear, Mortal Coil and Axe Toss control, and a healing reduction."),
  dps("Shaman", "Elemental", "Caster", [0, 2, 3, 2, 3, 2, 3], true, "Sustain", ["Incapacitate", "Stun", "Root"], "Stormkeeper and Ascendance burst, Grounding Totem to eat a key CC, and mana-efficient damage in long games."),
  dps("Evoker", "Devastation", "Caster", [0, 2, 3, 2, 3, 3, 1], true, "Mixed", ["Disorient", "Root"], "Dragonrage and empowered Fire Breath from a mobile caster, Sleep Walk control, and knockbacks and Rescue for peel."),
  dps("Mage", "Arcane", "Caster", [0, 3, 1, 3, 1, 3, 2], true, "Mixed", ["Incapacitate", "Disorient", "Root"], "Arcane Surge one-shot windows with Polymorph and Ring of Frost on the healer, but few defensives outside Ice Block."),
  dps("Warlock", "Affliction", "Caster", [0, 2, 2, 3, 2, 2, 2], true, "Mixed", ["Disorient", "Horror", "Silence"], "Stacked damage over time, Unstable Affliction punishes dispels with a silence, and Fear on the healer. Best with a mana-efficient healer."),
  dps("Paladin", "Retribution", "Melee", [0, 2, 2, 2, 3, 2, 3], false, "Mixed", ["Stun", "Disorient"], "Avenging Wrath and Wake of Ashes burst, Blessing of Protection and Freedom for teammates, and Hammer of Justice. Strong into Subtlety Rogue setups."),
  dps("Priest", "Shadow", "Caster", [1, 1, 2, 2, 2, 1, 2], true, "Mixed", ["Disorient", "Silence"], "Mass Dispel answers Ice Block and Divine Shield, Psychic Scream and Silence lock the healer, and Power Infusion boosts a burst partner."),
  dps("Shaman", "Enhancement", "Melee", [0, 3, 2, 1, 2, 2, 1], true, "Mixed", ["Incapacitate", "Stun", "Root"], "Doom Winds and Ascendance burst that pairs with another burst spec, Hex on the healer, and Grounding Totem."),
  dps("Death Knight", "Frost", "Melee", [0, 3, 1, 3, 3, 2, 2], false, "Mixed", ["Stun"], "Pillar of Frost and Obliterate burst that needs a healing reduction partner, with Death Grip and Asphyxiate to set up kills."),
  dps("Demon Hunter", "Devourer", "Caster", [0, 2, 1, 2, 2, 3, 1], true, "Mixed", [], "Void caster with Collapsing Star burst and Demon Hunter mobility, but its damage is still weak next to its iteration from last season."),
  dps("Evoker", "Augmentation", "Caster", [0, 1, 0, 1, 1, 1, 0], true, "Mixed", ["Disorient", "Root"], "A PvE support spec. Ebon Might and Prescience add little in arenas, so it's basically unviable in PvP."),
  healer("Evoker", "Preservation", [3, 3, 2, 3, 3, 2, 1], "Sleep Walk", ["Poison"], false, "Time Dilation, Rewind and Zephyr as defensive cooldowns, Rescue to carry melee onto targets and out of danger, and spammable Sleep Walk."),
  healer("Druid", "Restoration", [3, 1, 3, 3, 3, 3, 2], "Incapacitating Roar", ["Curse", "Poison"], false, "Ironbark and Barkskin as defensive cooldowns, Cyclone on the enemy, Incapacitating Roar for instant peel, and the most mana-efficient healing for long dampening games."),
  healer("Monk", "Mistweaver", [2, 2, 3, 3, 2, 2, 3], "Paralysis and Leg Sweep", ["Poison", "Disease"], false, "Life Cocoon and Revival as defensive cooldowns, instant Paralysis and Leg Sweep for burst setups, and Ring of Peace to peel."),
  healer("Paladin", "Holy", [1, 3, 3, 2, 1, 1, 2], "Hammer of Justice", ["Poison", "Disease"], false, "Blessing of Sacrifice, Blessing of Protection and Divine Shield as defensive cooldowns, Freedom for low-mobility partners, and Hammer of Justice in close range."),
  healer("Shaman", "Restoration", [1, 2, 2, 2, 2, 2, 1], "Capacitor Totem", ["Curse"], true, "Spirit Link Totem and Earthen Wall Totem as defensive cooldowns, with Grounding and Tremor Totem to stop key CC."),
  healer("Priest", "Discipline", [2, 2, 2, 1, 1, 2, 1], "Psychic Scream", ["Disease"], true, "Pain Suppression and Power Word: Barrier, if selected, as defensive cooldowns, and Power Infusion for burst comps."),
  healer("Priest", "Holy", [2, 1, 2, 1, 2, 2, 3], "Holy Word: Chastise", ["Disease"], true, "Guardian Spirit and Ray of Hope as defensive cooldowns, instant Holy Word: Chastise for burst setups, Power Infusion and Leap of Faith."),
], retailTables);

//Classic keeps its own table. Only Arms, Fury, every Rogue and Hunter spec, Demonology and Windwalker have MS,
//and there are no Demon Hunters or Evokers. The other ratings are copied from retail until classic gets its own.
const classicSpecs: SpecProfile[] = withSpells([
  dps("Warrior", "Arms", "Melee", [3, 3, 3, 3, 3, 2, 2], true, "Mixed", ["Stun", "Disorient"], "Mortal Strike with near-permanent uptime, Colossus Smash and Bladestorm kill windows, and Battle Shout for other physical damage."),
  dps("Warrior", "Fury", "Melee", [3, 2, 3, 3, 3, 2, 2], true, "Mixed", ["Stun", "Disorient"], "Recklessness and Colossus Smash pressure with a healing reduction and strong self-healing."),
  dps("Druid", "Feral", "Melee", [0, 2, 2, 3, 3, 3, 3], false, "Sustain", ["Stun", "Disorient", "Root"], "Cyclone and Maim lock targets down, bleeds keep steady pressure from stealth, and Innervate refills the healer's mana."),
  dps("Rogue", "Subtlety", "Melee", [3, 3, 1, 3, 3, 3, 3], false, "Late burst", ["Stun", "Incapacitate", "Disorient"], "Shadow Dance with Cheap Shot into Kidney Shot opens one-shot stun windows, with Blind on the healer and Smoke Bomb to cut off heals."),
  dps("Rogue", "Assassination", "Melee", [3, 2, 3, 3, 2, 2, 3], false, "Late burst", ["Stun", "Incapacitate", "Disorient", "Silence"], "Vendetta and stacked poisons, with Garrote silencing the healer, build pressure that gets very hard to heal through late."),
  dps("Rogue", "Combat", "Melee", [3, 1, 3, 2, 2, 3, 2], false, "Sustain", ["Stun", "Incapacitate", "Disorient"], "Killing Spree and Blade Flurry cleave pressure that stays efficient in long games."),
  dps("Hunter", "Beast Mastery", "Ranged physical", [3, 2, 3, 2, 2, 2, 3], true, "Sustain", ["Incapacitate", "Stun"], "Bestial Wrath pressure that never stops, Freezing Trap on the healer, and Roar of Sacrifice to protect a teammate."),
  dps("Hunter", "Marksmanship", "Ranged physical", [3, 3, 2, 2, 2, 2, 2], true, "Late burst", ["Incapacitate", "Stun"], "Rapid Fire and Aimed Shot burst from range with Scatter Shot into Freezing Trap, but it needs line of sight to cast."),
  dps("Hunter", "Survival", "Ranged physical", [3, 3, 1, 2, 2, 2, 2], true, "Late burst", ["Incapacitate", "Stun"], "Explosive Shot and Black Arrow burst from range, with Wyvern Sting and Freezing Trap on the healer."),
  dps("Monk", "Windwalker", "Melee", [3, 3, 2, 2, 2, 3, 2], false, "Late burst", ["Incapacitate", "Stun"], "Fists of Fury and Tigereye Brew burst behind a Leg Sweep or Paralysis, and Ring of Peace to peel."),
  dps("Death Knight", "Unholy", "Melee", [0, 2, 3, 3, 3, 2, 2], false, "Sustain", ["Stun"], "Gargoyle and disease pressure with Death Grip and Strangulate to set up kills."),
  dps("Death Knight", "Frost", "Melee", [0, 3, 1, 3, 3, 2, 2], false, "Mixed", ["Stun"], "Pillar of Frost and Obliterate burst that needs a healing reduction partner, with Death Grip and Strangulate to set up kills."),
  dps("Mage", "Fire", "Caster", [0, 3, 2, 3, 3, 3, 3], true, "Late burst", ["Incapacitate", "Disorient", "Root"], "Combustion one-shots a target when it lands, and Polymorph, Ring of Frost and Dragon's Breath lock the healer out while it does."),
  dps("Mage", "Frost", "Caster", [0, 2, 2, 3, 3, 3, 3], true, "Sustain", ["Incapacitate", "Disorient", "Root"], "Deep Freeze and shatter combos, Polymorph chains on the healer, and Ice Block to survive."),
  dps("Mage", "Arcane", "Caster", [0, 3, 1, 3, 1, 3, 2], true, "Mixed", ["Incapacitate", "Disorient", "Root"], "Arcane Power and Presence of Mind burst with Polymorph and Ring of Frost on the healer, but few defensives outside Ice Block."),
  dps("Warlock", "Destruction", "Caster", [0, 3, 2, 3, 2, 2, 3], true, "Late burst", ["Disorient", "Horror"], "Chaos Bolt burst duplicated by Havoc, and Fear on the healer, but no healing reduction in classic."),
  dps("Warlock", "Demonology", "Caster", [3, 1, 2, 3, 2, 2, 2], false, "Sustain", ["Disorient", "Horror"], "Metamorphosis burst, Fear and Mortal Coil control, and a healing reduction."),
  dps("Warlock", "Affliction", "Caster", [0, 2, 2, 3, 2, 2, 2], true, "Mixed", ["Disorient", "Horror", "Silence"], "Stacked damage over time, Unstable Affliction punishes dispels with a silence, and Fear on the healer. Best with a mana-efficient healer."),
  dps("Druid", "Balance", "Caster", [0, 3, 2, 3, 3, 3, 3], false, "Mixed", ["Disorient", "Root"], "Celestial Alignment burst from range, Cyclone and Mass Entanglement control, and Innervate for the healer's mana."),
  dps("Shaman", "Elemental", "Caster", [0, 2, 3, 2, 3, 2, 3], true, "Sustain", ["Incapacitate", "Stun", "Root"], "Lava Burst and Ascendance burst, Grounding Totem to eat a key CC, and mana-efficient damage in long games."),
  dps("Shaman", "Enhancement", "Melee", [0, 3, 2, 1, 2, 2, 1], true, "Mixed", ["Incapacitate", "Stun", "Root"], "Ascendance and Feral Spirit burst that pairs with another burst spec, Hex on the healer, and Grounding Totem."),
  dps("Paladin", "Retribution", "Melee", [0, 2, 2, 2, 3, 2, 3], false, "Mixed", ["Stun", "Disorient"], "Avenging Wrath burst, Hand of Protection and Hand of Freedom for teammates, and Hammer of Justice. Strong into Subtlety Rogue setups."),
  dps("Priest", "Shadow", "Caster", [0, 1, 2, 2, 2, 1, 2], true, "Mixed", ["Disorient", "Silence"], "Mass Dispel answers Ice Block and Divine Shield, Psychic Scream and Silence lock the healer, and Dispersion to survive."),
  healer("Druid", "Restoration", [3, 1, 3, 3, 3, 3, 2], "Disorienting Roar", ["Curse", "Poison"], false, "Ironbark and Barkskin as defensive cooldowns, Cyclone on the enemy, and the most mana-efficient healing for long dampening games."),
  healer("Monk", "Mistweaver", [2, 2, 3, 3, 2, 2, 3], "Paralysis and Leg Sweep", ["Poison", "Disease"], false, "Life Cocoon and Revival as defensive cooldowns, instant Paralysis and Leg Sweep for burst setups, and Ring of Peace to peel."),
  healer("Paladin", "Holy", [1, 3, 3, 2, 1, 1, 2], "Hammer of Justice", ["Poison", "Disease"], false, "Hand of Sacrifice, Hand of Protection and Divine Shield as defensive cooldowns, Freedom for low-mobility partners, and Hammer of Justice in close range."),
  healer("Shaman", "Restoration", [1, 2, 2, 2, 2, 2, 1], "Capacitor Totem", ["Curse"], true, "Spirit Link Totem as a defensive cooldown, with Grounding and Tremor Totem to stop key CC."),
  healer("Priest", "Discipline", [2, 2, 2, 1, 1, 2, 1], "Psychic Scream", ["Disease"], true, "Pain Suppression and Power Word: Barrier as defensive cooldowns, and Power Infusion for burst comps."),
  healer("Priest", "Holy", [2, 1, 2, 1, 2, 2, 3], "Holy Word: Chastise", ["Disease"], true, "Guardian Spirit as a defensive cooldown, instant Holy Word: Chastise for burst setups, and Leap of Faith."),
], classicTables);

export function specsForFlavor(flavor: GameFlavor): SpecProfile[] {
  if (flavor === "retail") {
    return retailSpecs;
  }
  return classicSpecs;
}

//The "what each spec brings" line. Healers get their throughput added from the rating, so the two never disagree.
export function specSummary(spec: SpecProfile): string {
  if (spec.role !== "Healer") {
    return spec.rule;
  }
  let throughput = "Throughput is low in the current meta.";
  if (spec.throughput === 3) {
    throughput = "Throughput is among the highest in the current meta.";
  } else if (spec.throughput === 2) {
    throughput = "Throughput is average in the current meta.";
  }
  return `${spec.rule} ${throughput}`;
}

//points = weight × rating ÷ 3, plus 5 for a purge on damage specs. Throughput carries the most weight for
//healers, since it decides whether a team can play into dampening and win.
export function specBaseScore(spec: SpecProfile): number {
  if (spec.role === "Healer") {
    return (30 * spec.throughput + 15 * spec.externals + 10 * spec.mana + 10 * spec.mobility + 10 * spec.peel + 10 * spec.dampening + 15 * spec.instantCc) / 3;
  }
  let points = (20 * spec.ms + 15 * spec.burst + 15 * spec.sustain + 15 * spec.peel + 10 * spec.defensives + 10 * spec.mobility + 10 * spec.dampening) / 3;
  if (spec.purge) {
    points += 5;
  }
  return points;
}

export type RowEffect = "good" | "neutral" | "slightlyBad" | "veryBad";

//Rows that name spells and specific teammates. The "why this comp works" list shows the general rows first and these last.
//Mana fit is only specific when it names Innervate, which manaRow sets itself.
const specificRowLabels = ["Mobility pairing", "Healer CC", "Class buffs", "Evoker immunities"];

//Rows about one class's own strengths. They still score and get bullets, but aren't listed as breakdown attributes.
const classBenefitRowLabels = ["Paladin defensives", "Evoker immunities"];

export interface ScoreRow {
  label: string;
  points: number;
  effect: RowEffect;
  detail: string; //short, shown beside the row
  reason: string; //a sentence for the "why it works" and "watch out for" lists
  specific: boolean; //names spells and specific teammates, so it's listed after the general points
  bullets: string[]; //the reason split into bullet points. Most rows have one; class buffs get one per buff
  classBenefit: boolean; //one class's own strength, left out of the breakdown attributes
}

export interface SpecScore {
  spec: SpecProfile;
  baseScore: number;
}

//A spec's recent 3v3 games, as the SpecWinRates endpoint returns them
export interface SpecRecord {
  className: string;
  specName: string;
  wins: number;
  losses: number;
}

export interface CompositionScore {
  score: number; //out of 100, relative to the best comp
  rawScore: number;
  bestRawScore: number;
  bestTeam: SpecProfile[];
  tier: string;
  archetype: string;
  namedComp?: NamedCompMatch; //the glossary name and why it works, when the team has one
  category?: string; //set when the team isn't one healer and two damage specs
  specScores: SpecScore[];
  baseContribution: number; //0.35 × average SBS
  synergy: number; //synergyWeight × the synergy rows, after synergyCap
  live: number;
  penalty: number;
  rows: ScoreRow[];
}

export const baseWeight = 0.35;
export const synergyWeight = 1.75;
//Above the best synergy any team reaches (about 63), so it's a safety limit rather than something that ties top comps
export const synergyCap = 75;
const noHealerPenalty = 25;
const doubleHealerPenalty = 20;
const unviablePenalty = 30;
const buffPoints = 2;
const doubleBurstPoints = 3;
const highThroughputPoints = 4;
const lowThroughputPoints = 6;
const duplicateDpsPoints = 4;
//Win rates are pulled toward 50% as if every spec had this many extra games at 50%, so a few games barely move it
const livePriorGames = 20;
const livePointsPerPercent = 1;
const liveCap = 15;
//Winning only earns a small bonus, and only above 60%, so a lucky run on thin data can't inflate a comp
const liveBonusThreshold = 60;
const liveBonusPerPercent = 0.25;
const liveBonusCapPerSpec = 2;
const magicMelee = ["Death Knight:Unholy", "Death Knight:Frost", "Paladin:Retribution", "Shaman:Enhancement"];
const unviableSpecs = ["Evoker:Augmentation"];

function effectOf(points: number): RowEffect {
  if (points > 0) {
    return "good";
  }
  if (points === 0) {
    return "neutral";
  }
  if (points > -4) {
    return "slightlyBad";
  }
  return "veryBad";
}

function row(label: string, points: number, detail: string, reason: string): ScoreRow {
  return { label, points, effect: effectOf(points), detail, reason, specific: specificRowLabels.includes(label), bullets: [reason], classBenefit: classBenefitRowLabels.includes(label) };
}

function specLabel(spec: SpecProfile): string {
  return `${spec.specName} ${spec.className}`;
}

function joinLabels(specs: SpecProfile[]): string {
  return specs.map(specLabel).join(" and ");
}

function isSpec(spec: SpecProfile, className: string, specName: string): boolean {
  return spec.className === className && spec.specName === specName;
}

function isDamage(spec: SpecProfile): boolean {
  return spec.role !== "Healer";
}

function isPhysical(spec: SpecProfile): boolean {
  return spec.range === "Melee" || spec.range === "Ranged physical";
}

function dealsMagic(spec: SpecProfile): boolean {
  return spec.range === "Caster" || magicMelee.includes(`${spec.className}:${spec.specName}`);
}

//Only the best healing reduction scores, since a second one adds nothing. The detail lists every spec that
//brings one, best first.
function healingReductionRow(team: SpecProfile[]): ScoreRow {
  const label = "Healing reduction";
  const scored = team.map((spec, index) => {
    let points = 0;
    if (spec.ms === 3) {
      points = 10;
    } else if (spec.ms === 2) {
      points = 6;
      //Fury keeps its uptime with a strong peel partner or Freedom
      const supported = team.some((s, i) => i !== index && (s.peel === 3 || isSpec(s, "Paladin", "Holy")));
      if (isSpec(spec, "Warrior", "Fury") && supported) {
        points = 9;
      }
    } else if (spec.ms === 1) {
      points = 4;
    }
    return { spec, points };
  }).filter((s) => s.points > 0).sort((a, b) => b.points - a.points);
  if (scored.length === 0) {
    return row(label, -5, "", "Nobody brings a healing reduction, so the enemy healer is much harder to kill through.");
  }
  const best = scored[0];
  const bestName = specLabel(best.spec);
  let detail = bestName;
  if (scored.length > 1) {
    const others = scored.slice(1).map((s) => specLabel(s.spec));
    detail = `${bestName} (best) · ${others.join(" · ")}`;
  }
  if (best.spec.ms === 3) {
    return row(label, best.points, detail, `${bestName} brings a reliable healing reduction.`);
  }
  if (best.spec.ms === 2) {
    return row(label, best.points, detail, `${bestName}'s healing reduction depends on uptime, so it's less reliable than Arms.`);
  }
  return row(label, best.points, detail, `${bestName}'s healing reduction depends on positioning, so it's less reliable than Arms.`);
}

//Stripping buffs and breaking immunities are scored apart, since most purges can't touch Ice Block or Divine
//Shield. Together they are worth what the one combined row was: 4 points either way.
const purgePoints = 2;

//Purge: an offensive dispel that strips buffs. Warriors are flagged as a purge for Shattering Throw, which only
//breaks immunities, so they count in the immunity row instead.
function purgeRow(team: SpecProfile[]): ScoreRow {
  const label = "Purge";
  const sources = team.filter((s) => s.purge && s.className !== "Warrior");
  if (sources.length > 0) {
    return row(label, purgePoints, sources.map(specLabel).join(", "), `${joinLabels(sources)} can strip enemy buffs.`);
  }
  return row(label, -purgePoints, "", "Nobody on the team can strip enemy buffs.");
}

//Immunity removal: Mass Dispel (every Priest) and Shattering Throw (every Warrior) break Ice Block, Divine Shield
//and Blessing of Protection. Other purges can't.
function immunityRemovalRow(team: SpecProfile[]): ScoreRow {
  const label = "Immunity removal";
  const priests = team.filter((s) => s.className === "Priest");
  const warriors = team.filter((s) => s.className === "Warrior");
  const sources = [...priests, ...warriors];
  if (sources.length === 0) {
    return row(label, -purgePoints, "", "Nothing on the team answers Ice Block, Divine Shield or Blessing of Protection.");
  }
  const sentences: string[] = [];
  if (priests.length > 0) {
    sentences.push(`${joinLabels(priests)} can break immunities with Mass Dispel.`);
  }
  if (warriors.length > 0) {
    sentences.push(`${joinLabels(warriors)} can break immunities with Shattering Throw.`);
  }
  return row(label, purgePoints, sources.map(specLabel).join(", "), sentences.join(" "));
}

//Sharing a DR doesn't waste a setup, but it can leave the team fewer ways to peel outside its burst windows.
//Specs with peel 3 (Warriors, Death Knights, Preservation and the like) have plenty of other utility, so a DR
//only counts when at least one of the specs sharing it is lighter on peel.
function overlapRow(team: SpecProfile[]): ScoreRow {
  const label = "DR overlap";
  const sharers = new Map<Control, SpecProfile[]>();
  for (const spec of team) {
    for (const control of spec.controls) {
      const list = sharers.get(control) ?? [];
      list.push(spec);
      sharers.set(control, list);
    }
  }
  let points = 0;
  const shared: string[] = [];
  for (const [control, specs] of sharers) {
    if (specs.length < 2 || specs.every((s) => s.peel === 3)) {
      continue;
    }
    if (specs.length === 2) {
      points -= 2;
      shared.push(control);
    } else {
      points -= 4;
      shared.push(`${control} ×${specs.length}`);
    }
  }
  points = Math.max(-6, points);
  if (shared.length === 0) {
    const none = row(label, 0, "", "");
    none.bullets = [];
    return none;
  }
  return row(
    label,
    points,
    `Shared: ${shared.join(", ")}`,
    `Teammates share ${shared.join(", ")} diminishing returns, so outside their burst windows they have fewer ways to peel the enemy team.`,
  );
}

//Mobility spells teammates bring: Stampeding Roar, Freedom, Rescue and Leap of Faith. Low-mobility specs are
//covered by any of them, Freedom best. Melee at mobility 2 benefit without needing it, from the ones that keep
//them on a target. Leap of Faith only pulls a teammate out of danger, so it doesn't count for that.
//Leap of Faith and Rescue can only be cast on someone else, so they never cover the spec that brings them.
const othersOnlyMobilitySpells = ["Leap of Faith", "Rescue"];

//The mobility spells that can help the spec at this index
function mobilitySpellsFor(index: number, team: SpecProfile[]): string[] {
  const spells: string[] = [];
  team.forEach((spec, i) => {
    if (spec.mobilitySpell === "" || spells.includes(spec.mobilitySpell)) {
      return;
    }
    if (i === index && othersOnlyMobilitySpells.includes(spec.mobilitySpell)) {
      return;
    }
    spells.push(spec.mobilitySpell);
  });
  return spells;
}

function joinSpells(spells: string[], singular: string, plural: string): string {
  if (spells.length === 1) {
    return `${spells[0]} ${singular}`;
  }
  return `${spells.join(" and ")} ${plural}`;
}

//Melee that roots hurt the most: they have little way to break a root themselves, so it cuts off their pressure
const rootVulnerableSpecs = ["Demon Hunter:Havoc", "Warrior:Arms", "Warrior:Fury", "Death Knight:Unholy", "Death Knight:Frost"];
const rootBreakingSpells = ["Blessing of Freedom", "Hand of Freedom", "Rescue"];

type MobilityHelp = "low" | "roots" | "uptime";

function mobilityRow(team: SpecProfile[]): ScoreRow {
  const label = "Mobility pairing";
  const used: string[] = [];
  let points = 0;
  //Specs helped by the same spells share one sentence, keyed by the spells and what they do
  const groups = new Map<string, { spells: string[]; help: MobilityHelp; specs: SpecProfile[] }>();
  const unhelped: SpecProfile[] = [];
  function addGroup(spells: string[], help: MobilityHelp, spec: SpecProfile) {
    const key = `${help}|${spells.join("|")}`;
    const group = groups.get(key);
    if (group) {
      group.specs.push(spec);
    } else {
      groups.set(key, { spells, help, specs: [spec] });
    }
    for (const spell of spells) {
      if (!used.includes(spell)) {
        used.push(spell);
      }
    }
  }
  team.forEach((spec, index) => {
    if (spec.mobility === 1) {
      const spells = mobilitySpellsFor(index, team);
      if (spells.length === 0) {
        points -= 2;
        unhelped.push(spec);
        return;
      }
      if (spells.some((s) => s.endsWith("Freedom"))) {
        points += 3;
      } else {
        points += 2;
      }
      addGroup(spells, "low", spec);
      return;
    }
    if (!isDamage(spec) || spec.range !== "Melee") {
      return;
    }
    const spells = mobilitySpellsFor(index, team).filter((s) => s !== "Leap of Faith");
    //Root breakers are worth the most on melee that roots hurt the most, whatever their mobility rating
    const breakers = spells.filter((s) => rootBreakingSpells.includes(s));
    if (rootVulnerableSpecs.includes(`${spec.className}:${spec.specName}`) && breakers.length > 0) {
      points += 2;
      addGroup(breakers, "roots", spec);
      return;
    }
    //Other melee at mobility 2 still benefit a little, without a bullet point of their own
    if (spec.mobility === 2 && spells.length > 0) {
      points += 1;
      addGroup(spells, "uptime", spec);
    }
  });
  const reasons: string[] = [];
  for (const group of groups.values()) {
    const names = joinLabels(group.specs);
    if (group.help === "low") {
      if (group.specs.length === 1) {
        reasons.push(`${joinSpells(group.spells, "covers", "cover")} ${names}'s low mobility.`);
      } else {
        reasons.push(`${joinSpells(group.spells, "covers", "cover")} the low mobility of ${names}.`);
      }
    } else if (group.help === "roots") {
      reasons.push(`${joinSpells(group.spells, "frees", "free")} ${names} from roots, which hit them harder than most melee.`);
    }
  }
  if (unhelped.length > 0) {
    let verb = "is";
    if (unhelped.length > 1) {
      verb = "are";
    }
    reasons.push(`${joinLabels(unhelped)} ${verb} low on mobility, and nobody on the team helps with it.`);
  }
  if (points === 0 && reasons.length === 0) {
    return row(label, 0, "", "Nobody on the team needs help with mobility.");
  }
  const mobilityResult = row(label, points, used.join(" · "), reasons.join(" "));
  mobilityResult.bullets = reasons;
  return mobilityResult;
}

//Healing throughput decides whether the team survives pressure and wins long games, so it scores as an attribute
//on top of the healer's base score. Weak throughput, like Holy Paladin's, costs more than strong throughput earns.
function healerThroughputRow(team: SpecProfile[]): ScoreRow {
  const label = "Healer throughput";
  const healerSpec = team.find((s) => s.role === "Healer");
  if (healerSpec === undefined) {
    const none = row(label, 0, "", "");
    none.bullets = [];
    return none;
  }
  const healerName = specLabel(healerSpec);
  if (healerSpec.throughput === 3) {
    return row(label, highThroughputPoints, "High", `${healerName}'s healing throughput is among the highest in the current meta.`);
  }
  if (healerSpec.throughput <= 1) {
    return row(label, -lowThroughputPoints, "Low", `${healerName}'s healing throughput is weak in the current meta, so the team struggles to heal through pressure.`);
  }
  const average = row(label, 0, "", "");
  average.bullets = [];
  return average;
}

//Instant healer CC lines up with heavy burst. CC that needs close range, like Hammer of Justice, scores lower.
function healerControlRow(team: SpecProfile[]): ScoreRow {
  const label = "Healer CC";
  const healerSpec = team.find((s) => s.role === "Healer");
  if (healerSpec === undefined) {
    return row(label, 0, "", "There's no healer on the team.");
  }
  const detail = healerSpec.instantCcName.split(" and ").join(" · ");
  const healerName = specLabel(healerSpec);
  if (healerSpec.instantCc < 2) {
    return row(label, 0, detail, `${healerName}'s ${healerSpec.instantCcName} isn't instant, so it doesn't add much to burst windows.`);
  }
  const bursty = team.filter((s) => isDamage(s) && s.burst === 3);
  if (bursty.length === 0) {
    return row(label, 0, detail, `${healerName}'s ${healerSpec.instantCcName} has no heavy-burst partner to line up with.`);
  }
  const names = joinLabels(bursty);
  if (healerSpec.instantCc === 3) {
    return row(label, 4, detail, `${healerName}'s instant ${healerSpec.instantCcName} locks a target down during ${names}'s burst.`);
  }
  return row(label, 2, detail, `${healerName}'s instant ${healerSpec.instantCcName} adds CC to ${names}'s burst, though it needs close range.`);
}

interface Buff {
  name: string;
  specName?: string; //set when only one spec of the class brings it
  points: number;
  //who on the team the buff is worth scoring for, or none. index is the spec bringing it
  helped: (index: number, team: SpecProfile[]) => SpecProfile[];
  describe: (helped: string, index: number, team: SpecProfile[]) => string;
}

function partners(index: number, team: SpecProfile[]): SpecProfile[] {
  return team.filter((_, i) => i !== index);
}

function everyone(index: number, team: SpecProfile[]): SpecProfile[] {
  return partners(index, team);
}

//Class buffs don't stack, so each buff scores once per team, no matter how many of that class there are.
//Paladins run one aura, so Devotion only counts when Concentration doesn't. Which class brings which buff is in
//the class buff tables near the top.
const buffs: Buff[] = [
  {
    name: "Chaos Brand", points: buffPoints,
    helped: (i, team) => partners(i, team).filter((p) => isDamage(p) && dealsMagic(p)),
    describe: (h) => `Chaos Brand buffs ${h}, since the enemy takes more magic damage.`,
  },
  {
    name: "Mark of the Wild", points: buffPoints, helped: everyone,
    describe: (_h, _i, team) => {
      const tanky = team.filter((p) => isDamage(p) && p.defensives === 3);
      if (tanky.length > 0) {
        return `Mark of the Wild buffs everyone, and makes ${joinLabels(tanky)} even tankier than they already are.`;
      }
      return "Mark of the Wild buffs everyone's versatility, for a little more damage and damage reduction.";
    },
  },
  {
    name: "Power Word: Fortitude", points: buffPoints, helped: everyone,
    describe: () => "Power Word: Fortitude buffs everyone's stamina.",
  },
  {
    name: "Skyfury", points: buffPoints, helped: everyone,
    describe: (_h, _i, team) => {
      const physical = team.filter((p) => isDamage(p) && isPhysical(p));
      if (physical.length > 0) {
        return `Skyfury buffs everyone's mastery, and gives ${joinLabels(physical)} a chance at extra attacks.`;
      }
      return "Skyfury buffs everyone's mastery.";
    },
  },
  {
    name: "Blessing of the Bronze", points: buffPoints,
    helped: (i, team) => partners(i, team).filter((p) => p.mobility === 3),
    describe: (h) => `Blessing of the Bronze buffs everyone's movement cooldowns, which helps ${h} the most, since they lean on them to stay on targets and escape.`,
  },
  {
    name: "Hunter's Mark", points: buffPoints,
    helped: (i, team) => partners(i, team).filter(isDamage),
    describe: (h) => `Hunter's Mark buffs ${h}'s damage on the marked target while it's above 80% health.`,
  },
  {
    name: "Arcane Intellect", points: buffPoints,
    helped: (i, team) => partners(i, team).filter((p) => p.range === "Caster" || p.role === "Healer"),
    describe: (h) => `Arcane Intellect buffs ${h}'s intellect.`,
  },
  {
    name: "Arcane Brilliance", points: buffPoints,
    helped: (i, team) => partners(i, team).filter((p) => p.range === "Caster" || p.role === "Healer"),
    describe: (h) => `Arcane Brilliance buffs ${h}'s spell power.`,
  },
  {
    name: "Mystic Touch", points: buffPoints,
    helped: (_, team) => team.filter((p) => isDamage(p) && isPhysical(p)),
    describe: (h, _, team) => {
      const melee = team.filter((p) => isDamage(p) && p.range === "Melee").length;
      if (melee >= 2) {
        return `Mystic Touch buffs ${h}, since the enemy takes 5% more physical damage, and with two melee it's at its most impactful.`;
      }
      return `Mystic Touch buffs ${h}, since the enemy takes 5% more physical damage, but having two melee would make it more impactful.`;
    },
  },
  {
    name: "Zen Spheres", specName: "Mistweaver", points: 1,
    helped: (i, team) => partners(i, team).filter(isDamage),
    describe: () => "Zen Spheres, a Mistweaver PvP talent, puts a Sphere of Despair on one enemy so they take 10% more damage.",
  },
  {
    name: "Legacy of the Emperor", points: buffPoints, helped: everyone,
    describe: () => "Legacy of the Emperor buffs everyone's strength, agility and intellect.",
  },
  {
    name: "Blessing of Kings", points: buffPoints, helped: everyone,
    describe: () => "Blessing of Kings buffs everyone's strength, agility and intellect.",
  },
  {
    name: "Concentration Aura", points: buffPoints,
    helped: (i, team) => partners(i, team).filter((p) => p.range === "Caster"),
    describe: (h) => `Concentration Aura buffs ${h} by shortening interrupts and silences on them.`,
  },
  {
    name: "Devotion Aura", points: buffPoints,
    helped: (i, team) => {
      const damage = partners(i, team).filter(isDamage);
      if (damage.length > 0 && damage.every((s) => s.defensives === 3)) {
        return damage;
      }
      return [];
    },
    describe: (h) => `Devotion Aura buffs everyone's damage reduction, on top of ${h}'s strong defensives.`,
  },
  {
    name: "Battle Shout", points: buffPoints,
    helped: (i, team) => partners(i, team).filter(isPhysical),
    describe: (h) => `Battle Shout buffs ${h}'s attack power.`,
  },
  {
    name: "Horn of Winter", points: buffPoints,
    helped: (i, team) => partners(i, team).filter(isPhysical),
    describe: (h) => `Horn of Winter buffs ${h}'s attack power.`,
  },
];

//Every buff the team brings is listed. Only the ones that help a teammate score and get a sentence.
function buffRow(team: SpecProfile[]): ScoreRow {
  const label = "Class buffs";
  const listed: string[] = [];
  const scored: string[] = [];
  const sentences: string[] = [];
  let points = 0;
  const pickedPaladinAura = new Set<number>();
  team.forEach((spec, index) => {
    const own = buffs.filter((b) => spec.buffNames.includes(b.name) && (b.specName === undefined || b.specName === spec.specName));
    for (const buff of own) {
      if (!listed.includes(buff.name)) {
        listed.push(buff.name);
      }
      if (scored.includes(buff.name)) {
        continue;
      }
      if (spec.className === "Paladin" && pickedPaladinAura.has(index)) {
        continue;
      }
      const helped = buff.helped(index, team);
      if (helped.length > 0) {
        scored.push(buff.name);
        sentences.push(buff.describe(joinLabels(helped), index, team));
        points += buff.points;
        if (spec.className === "Paladin") {
          pickedPaladinAura.add(index);
        }
      }
    }
  });
  if (listed.length === 0) {
    return row(label, 0, "", "Nobody on the team brings a party buff.");
  }
  if (scored.length === 0) {
    return row(label, 0, listed.join(" · "), "The team's class buffs don't line up with its partners.");
  }
  const buffRowResult = row(label, points, listed.join(" · "), sentences.join(" "));
  buffRowResult.bullets = sentences;
  return buffRowResult;
}

function burstRow(team: SpecProfile[]): ScoreRow {
  const heavy = team.filter((s) => isDamage(s) && s.burst === 3);
  if (heavy.length >= 2) {
    const names = heavy.map(specLabel).join(" + ");
    return row("Double burst", doubleBurstPoints, names, `${names} can line up heavy burst windows together.`);
  }
  return row("Double burst", 0, "", "The team doesn't have two heavy-burst specs.");
}

//The team's shape, shown under the tier. It doesn't score.
function archetypeOf(team: SpecProfile[]): string {
  const damage = team.filter(isDamage);
  if (damage.length !== 2) {
    return `${damage.length} damage specs`;
  }
  const melee = damage.filter((s) => s.range === "Melee").length;
  if (melee === 2) {
    return "Double melee";
  }
  if (melee === 1) {
    if (damage.some((s) => s.range === "Caster")) {
      return "Caster-melee hybrid";
    }
    return "Melee + ranged physical";
  }
  if (damage.some((s) => s.range === "Ranged physical")) {
    return "Double ranged";
  }
  return "Double caster";
}

//Retribution and Holy Paladins bring so many defensive cooldowns that they're a brick wall and hard to shut down.
//That goes even further next to squishier damage specs, with defensives 2 or lower, that they can cover.
function paladinDefensivesRow(team: SpecProfile[]): ScoreRow {
  const label = "Paladin defensives";
  const paladins = team.filter((s) => isSpec(s, "Paladin", "Retribution") || isSpec(s, "Paladin", "Holy"));
  if (paladins.length === 0) {
    const none = row(label, 0, "", "");
    none.bullets = [];
    return none;
  }
  const names = joinLabels(paladins);
  let verb = "brings";
  if (paladins.length > 1) {
    verb = "bring";
  }
  const squishy = team.filter((s) => isDamage(s) && s.className !== "Paladin" && s.defensives <= 2);
  const wall = `${names} ${verb} lots of defensive cooldowns, making them hard to kill.`;
  if (squishy.length > 0) {
    return row(label, 4, names, `${names} ${verb} lots of defensive cooldowns to keep themselves and squishier teammates alive.`);
  }
  return row(label, 2, names, wall);
}

//Preservation's immunities make it a hard target to kill. With two damage specs that peel well on their own
//(peel 3), the enemy can't easily swap to the healer or the damage specs, so the comp gets stronger.
function evokerImmunitiesRow(team: SpecProfile[]): ScoreRow {
  const label = "Evoker immunities";
  const evoker = team.find((s) => isSpec(s, "Evoker", "Preservation"));
  if (evoker === undefined) {
    const none = row(label, 0, "", "");
    none.bullets = [];
    return none;
  }
  const evokerName = specLabel(evoker);
  const damage = team.filter(isDamage);
  if (damage.length === 2 && damage.every((s) => s.peel === 3)) {
    return row(
      label,
      4,
      evokerName,
      `${evokerName}'s immunities make it a hard target to kill, and with ${joinLabels(damage)} peeling well on their own, the whole team is hard to break.`,
    );
  }
  return row(label, 2, evokerName, `${evokerName}'s immunities make it a hard target to kill.`);
}

type SpecTest = (spec: SpecProfile) => boolean;

function classIs(className: string): SpecTest {
  return (s) => s.className === className;
}

function specIs(className: string, ...specNames: string[]): SpecTest {
  return (s) => s.className === className && specNames.includes(s.specName);
}

interface NamedComp {
  name: string;
  first: SpecTest; //a damage spec
  second: SpecTest; //the other damage spec
  healer?: SpecTest; //set when the comp needs a particular healer
  reason: (first: string, second: string, healer: string) => string;
}

//Named arena comps from Skill Capped's PvP glossary (skill-capped.com/wowarticles/general/pvp-glossary).
//The first match scores, so comps that need a particular healer come first, then exact specs, then whole classes.
//"Melee Cleave" and "Spell Cleave" are left out, since they only mean two melee or two casters.
const namedComps: NamedComp[] = [
  {
    name: "Double Dragon", first: specIs("Evoker", "Devastation", "Augmentation"), second: () => true, healer: specIs("Evoker", "Preservation"),
    reason: (a, _b, h) => `${a} and ${h} double up on Evoker mobility, Sleep Walk control and Rescue.`,
  },
  {
    name: "Shatterplay", first: specIs("Priest", "Shadow"), second: specIs("Mage", "Frost"), healer: (s) => isSpec(s, "Druid", "Restoration") || isSpec(s, "Paladin", "Holy"),
    reason: (a, b, h) => `${b}'s shatter combos and ${a}'s Psychic Scream and Silence chain control, while ${h} keeps the team alive through long games.`,
  },
  {
    name: "Godcomp", first: specIs("Priest", "Shadow"), second: classIs("Mage"), healer: (s) => isSpec(s, "Druid", "Restoration") || isSpec(s, "Paladin", "Holy"),
    reason: (a, b, h) => `${a} and ${b} layer magic damage and control, while ${h} keeps the team alive through long games.`,
  },
  {
    name: "LSD", first: classIs("Warlock"), second: specIs("Shaman", "Elemental"), healer: specIs("Druid", "Restoration"),
    reason: (a, b, h) => `${a} and ${b} stack steady caster pressure, and ${h}'s Cyclone adds another layer of control.`,
  },
  {
    name: "LSD2", first: classIs("Warlock"), second: specIs("Druid", "Balance"), healer: specIs("Shaman", "Restoration"),
    reason: (a, b, h) => `${a} and ${b} stack steady caster pressure, with Cyclone and Fear on the enemy healer and ${h}'s totems for utility.`,
  },
  {
    name: "LSD3", first: classIs("Warlock"), second: specIs("Shaman", "Enhancement"), healer: specIs("Druid", "Restoration"),
    reason: (a, b, h) => `${a}'s steady damage pairs with ${b}'s burst, and ${h}'s Cyclone adds another layer of control.`,
  },
  {
    name: "Fireplay", first: specIs("Priest", "Shadow"), second: specIs("Mage", "Fire"),
    reason: (a, b) => `${a}'s Psychic Scream and Silence lock out the healer while ${b}'s Combustion goes for the kill.`,
  },
  {
    name: "Frozen Chicken Cleave", first: specIs("Druid", "Balance"), second: specIs("Mage", "Frost"),
    reason: (a, b) => `${a}'s Cyclone and ${b}'s Polymorph give the team two long CC chains on the healer.`,
  },
  {
    name: "Spicy Chicken Cleave", first: specIs("Druid", "Balance"), second: specIs("Mage", "Fire"),
    reason: (a, b) => `${a}'s Cyclone holds the healer while Celestial Alignment and ${b}'s Combustion burst together.`,
  },
  {
    name: "Owlplay", first: specIs("Druid", "Balance"), second: specIs("Priest", "Shadow"),
    reason: (a, b) => `${a} and ${b} pressure from range, with Cyclone, Psychic Scream and Silence to lock out the healer.`,
  },
  {
    name: "Boomy DH", first: specIs("Druid", "Balance"), second: specIs("Demon Hunter", "Havoc"),
    reason: (a, b) => `${b}'s Chaos Brand boosts ${a}'s magic damage, and Cyclone holds the healer while they burst.`,
  },
  {
    name: "Ebola Cleave", first: specIs("Druid", "Feral"), second: specIs("Death Knight", "Unholy"),
    reason: (a, b) => `${a}'s bleeds and ${b}'s diseases stack damage over time that's hard to heal through.`,
  },
  {
    name: "DHDK (Hero Cleave)", first: specIs("Death Knight", "Unholy"), second: specIs("Demon Hunter", "Havoc"),
    reason: (a, b) => `${b}'s mobility and frontloaded burst pair with ${a}'s Death Grip and steady pressure.`,
  },
  {
    name: "Scatterplay", first: classIs("Hunter"), second: specIs("Priest", "Shadow"),
    reason: (a, b) => `${a}'s Freezing Trap and ${b}'s Psychic Scream set up kills while both keep pressure from range.`,
  },
  {
    name: "RPX", first: classIs("Rogue"), second: specIs("Priest", "Shadow"),
    reason: (a, b) => `${a}'s stuns and ${b}'s Psychic Scream and Silence chain control across two targets.`,
  },
  {
    name: "Shadowplay", first: specIs("Priest", "Shadow"), second: classIs("Warlock"),
    reason: (a, b) => `${a} and ${b} stack damage over time faster than the enemy healer can dispel it.`,
  },
  {
    name: "Beast Cleave", first: specIs("Shaman", "Enhancement"), second: classIs("Hunter"),
    reason: (a, b) => `${a} and ${b} line up heavy burst with constant pressure from the Hunter's pet.`,
  },
  {
    name: "Turbo Cleave", first: specIs("Shaman", "Enhancement"), second: classIs("Warrior"),
    reason: (a, b) => `${a}'s burst and ${b}'s Mortal Strike pressure put the enemy healer under constant strain.`,
  },
  {
    name: "Thunder Cleave", first: specIs("Shaman", "Elemental"), second: classIs("Warrior"),
    reason: (a, b) => `${b}'s Mortal Strike pressure pairs with ${a}'s steady caster damage and Grounding Totem.`,
  },
  {
    name: "Cupid (PHP)", first: specIs("Paladin", "Retribution"), second: classIs("Hunter"),
    reason: (a, b) => `${a}'s Blessing of Protection and Freedom keep ${b} free to deal damage from range.`,
  },
  {
    name: "Ret War", first: specIs("Paladin", "Retribution"), second: classIs("Warrior"),
    reason: (a, b) => `${a} and ${b} burst together behind Mortal Strike, with Blessing of Freedom keeping the Warrior on target.`,
  },
  {
    name: "Scooby Doo Cleave", first: specIs("Paladin", "Retribution"), second: classIs("Rogue"),
    reason: (a, b) => `${b}'s stun chains open windows for ${a}'s burst.`,
  },
  {
    name: "Vanguards Cleave", first: specIs("Paladin", "Retribution"), second: classIs("Death Knight"),
    reason: (a, b) => `${a} and ${b} are both hard to kill, and Death Grip pulls targets into their damage.`,
  },
  {
    name: "Jungle Cleave", first: specIs("Druid", "Feral"), second: classIs("Hunter"),
    reason: (a, b) => `${a} and ${b} keep constant physical pressure, with Cyclone and Freezing Trap to lock out the healer.`,
  },
  {
    name: "Kitty Cleave", first: specIs("Druid", "Feral"), second: classIs("Warrior"),
    reason: (a, b) => `${a} and ${b} keep constant physical pressure, with Cyclone on the healer during kill windows.`,
  },
  {
    name: "FLX", first: specIs("Druid", "Feral"), second: classIs("Warlock"),
    reason: (a, b) => `${a}'s Cyclone and ${b}'s Fear give the team two ways to lock out the healer.`,
  },
  {
    name: "FMX", first: specIs("Druid", "Feral"), second: classIs("Mage"),
    reason: (a, b) => `${a}'s Cyclone and ${b}'s Polymorph give the team two long CC chains on the healer.`,
  },
  {
    name: "RMX", first: classIs("Rogue"), second: specIs("Mage", "Fire"),
    reason: (a, b) => `${a} locks the target down with Cheap Shot and Kidney Shot, so ${b}'s Combustion lands without being kicked or peeled, and can one-shot them.`,
  },
  {
    name: "RMX", first: classIs("Rogue"), second: classIs("Mage"),
    reason: (a, b) => `${a} and ${b} chain Kidney Shot, Blind, Polymorph and Ring of Frost across two targets, locking the healer out while the kill target dies.`,
  },
  {
    name: "RLX", first: classIs("Rogue"), second: classIs("Warlock"),
    reason: (a, b) => `${a}'s stuns and ${b}'s Fear chain control while damage over time keeps the healer busy.`,
  },
  {
    name: "Thug Cleave", first: classIs("Rogue"), second: classIs("Hunter"),
    reason: (a, b) => `${a}'s stuns and ${b}'s Freezing Trap set up heavy physical burst.`,
  },
  {
    name: "Smoke Bomb Cleave", first: classIs("Rogue"), second: classIs("Death Knight"),
    reason: (a, b) => `${a}'s Smoke Bomb cuts the healer off while ${b}'s Death Grip pulls the target into it.`,
  },
  {
    name: "KFC", first: classIs("Warrior"), second: classIs("Hunter"),
    reason: (a, b) => `${a}'s Mortal Strike and ${b}'s ranged pressure keep relentless physical damage on one target.`,
  },
  {
    name: "WLX", first: classIs("Warrior"), second: classIs("Warlock"),
    reason: (a, b) => `${a}'s Mortal Strike pairs with ${b}'s damage over time and Fear on the healer.`,
  },
  {
    name: "WMX", first: classIs("Warrior"), second: classIs("Mage"),
    reason: (a, b) => `${a}'s Mortal Strike pressure pairs with ${b}'s Polymorph on the healer.`,
  },
  {
    name: "TSG", first: classIs("Death Knight"), second: classIs("Warrior"),
    reason: (a, b) => `${a} and ${b} are tanky melee whose stuns and Death Grip set up kills behind Mortal Strike.`,
  },
  {
    name: "PHDK", first: classIs("Death Knight"), second: classIs("Hunter"),
    reason: (a, b) => `${a}'s Death Grip and ${b}'s Freezing Trap set up kills for steady physical pressure.`,
  },
  {
    name: "Shadowcleave", first: classIs("Death Knight"), second: classIs("Warlock"),
    reason: (a, b) => `${a} and ${b} stack damage over time that wears the enemy healer down.`,
  },
  {
    name: "The Walking Dead (TWD)", first: specIs("Monk", "Windwalker"), second: classIs("Death Knight"),
    reason: (a, b) => `${a}'s burst lines up with ${b}'s Death Grip, with Leg Sweep and Asphyxiate to set up kills.`,
  },
  {
    name: "MLX", first: classIs("Mage"), second: classIs("Warlock"),
    reason: (a, b) => `${a}'s Polymorph and ${b}'s Fear give the team two ways to lock out the healer while caster damage builds.`,
  },
];

export interface NamedCompMatch {
  name: string;
  reason: string;
}

//The glossary name for the team, if it has one. It doesn't score; the page shows the name under the tier.
function namedCompOf(team: SpecProfile[]): NamedCompMatch | undefined {
  const healerSpec = team.find((s) => s.role === "Healer");
  const damage = team.filter(isDamage);
  if (damage.length !== 2) {
    return undefined;
  }
  for (const comp of namedComps) {
    if (comp.healer !== undefined && (healerSpec === undefined || !comp.healer(healerSpec))) {
      continue;
    }
    let first: SpecProfile | undefined;
    let second: SpecProfile | undefined;
    if (comp.first(damage[0]) && comp.second(damage[1])) {
      first = damage[0];
      second = damage[1];
    } else if (comp.first(damage[1]) && comp.second(damage[0])) {
      first = damage[1];
      second = damage[0];
    }
    if (first !== undefined && second !== undefined) {
      let healerName = "";
      if (healerSpec !== undefined) {
        healerName = specLabel(healerSpec);
      }
      return { name: comp.name, reason: comp.reason(specLabel(first), specLabel(second), healerName) };
    }
  }
  return undefined;
}

//Two damage specs of the same class bring the same class tools, cooldowns, buffs and DRs twice, so the team has
//less to work with. Same spec or not, it costs the same. A healer sharing a class with a damage spec doesn't count.
function duplicateDpsRow(team: SpecProfile[]): ScoreRow {
  const label = "Duplicate DPS";
  const damage = team.filter(isDamage);
  const counts = new Map<string, SpecProfile[]>();
  for (const spec of damage) {
    const list = counts.get(spec.className) ?? [];
    list.push(spec);
    counts.set(spec.className, list);
  }
  let points = 0;
  const details: string[] = [];
  const sentences: string[] = [];
  for (const [className, specs] of counts) {
    if (specs.length < 2) {
      continue;
    }
    points -= duplicateDpsPoints * (specs.length - 1);
    if (specs.every((s) => s.specName === specs[0].specName)) {
      const name = specLabel(specs[0]);
      details.push(name);
      sentences.push(`Running more than one ${name} doubles up on the same tools and cooldowns, so the team has less variety to work with.`);
    } else {
      details.push(className);
      sentences.push(`${joinLabels(specs)} share ${className} class tools and cooldowns, so the team has less variety to work with.`);
    }
  }
  if (details.length === 0) {
    const none = row(label, 0, "", "");
    none.bullets = [];
    return none;
  }
  return row(label, points, details.join(" · "), sentences.join(" "));
}

function peelRow(team: SpecProfile[]): ScoreRow {
  const label = "Total peel";
  const total = team.reduce((sum, s) => sum + s.peel, 0);
  const withPeel = team.filter((s) => s.peelSpell !== "");
  const detail = withPeel.map((s) => s.peelSpell).join(" · ");
  if (total >= 8) {
    return row(label, 4, detail, "The team has plenty of peel to stop the enemy's setups.");
  }
  if (total >= 6) {
    return row(label, 2, detail, "The team has solid peel to slow down the enemy's setups.");
  }
  if (total >= 4) {
    return row(label, 0, detail, "The team's peel is average.");
  }
  return row(label, -3, detail, "The team has little peel, so the enemy's setups are hard to stop.");
}

function manaRow(team: SpecProfile[]): ScoreRow {
  const label = "Mana fit";
  const healerSpec = team.find((s) => s.role === "Healer");
  if (healerSpec === undefined) {
    return row(label, 0, "", "There's no healer to manage mana for.");
  }
  const healerName = specLabel(healerSpec);
  const spells: string[] = [];
  for (const spec of team) {
    if (spec.manaSpell !== "" && !spells.includes(spec.manaSpell)) {
      spells.push(spec.manaSpell);
    }
  }
  let detail = "";
  if (spells.length > 0) {
    detail = spells.join(" · ");
  }
  let points = 0;
  const reasons: string[] = [];
  if (healerSpec.mana === 3) {
    points += 2;
    reasons.push(`${healerName} is mana efficient.`);
    const affliction = team.find((s) => isSpec(s, "Warlock", "Affliction"));
    if (affliction !== undefined) {
      points += 2;
      reasons.push(`That matters for ${specLabel(affliction)}, which wins by dragging games out.`);
    }
  }
  const druid = team.find((s) => s.className === "Druid" && isDamage(s));
  if (druid !== undefined) {
    points += 2;
    reasons.push(`${specLabel(druid)}'s Innervate lets ${healerName} heal for free during the enemy's burst.`);
  }
  if (reasons.length === 0) {
    return row(label, 0, detail, `${healerName} has average mana for long games.`);
  }
  const manaRowResult = row(label, points, detail, reasons.join(" "));
  if (druid !== undefined) {
    manaRowResult.specific = true;
  }
  return manaRowResult;
}

//Only a comp with 2+ damage specs at Dampening 3 plays for the late game, so only it scores here.
//A high-throughput healer is what lets those comps win in dampening.
function dampeningRow(team: SpecProfile[]): ScoreRow {
  const label = "Dampening plan";
  const damage = team.filter(isDamage);
  if (damage.filter((s) => s.dampening === 3).length < 2) {
    return row(label, 0, "", "The team doesn't play for the late game.");
  }
  let points = 0;
  const notes: string[] = [];
  const healerSpec = team.find((s) => s.role === "Healer");
  let healerName = "the healer";
  let healerLasts = false;
  if (healerSpec !== undefined) {
    healerName = specLabel(healerSpec);
    if (healerSpec.throughput === 3) {
      points += 3;
      healerLasts = true;
      notes.push("high-throughput healer");
    //only the dampening rating says a healer keeps up as healing falls off. A full mana bar alone doesn't:
    //Mistweaver and Holy Paladin rarely run dry, but their healing still falls behind late
    } else if (healerSpec.dampening === 3) {
      points += 2;
      healerLasts = true;
      notes.push("healer lasts");
    } else if (healerSpec.mana === 1 || healerSpec.throughput === 1 || healerSpec.dampening === 1) {
      points -= 3;
      notes.push("healer falls behind");
    }
  }
  const sustain = damage.filter((s) => s.profile === "Sustain").length;
  const lateBurst = damage.filter((s) => s.profile === "Late burst").length;
  if (sustain >= 2) {
    points += 2;
    notes.push("two Sustain specs");
  } else if (lateBurst >= 2) {
    points += 2;
    notes.push("two Late burst specs");
  } else if (sustain === 1 && lateBurst === 1) {
    points += 1;
    notes.push("Sustain + Late burst");
  }
  if (notes.length === 0) {
    return row(label, 0, "", "The team plays for the late game.");
  }
  if (points < 0) {
    return row(label, points, "", `The team plays for the late game, but ${healerName}'s healing falls behind in dampening.`);
  }
  if (healerLasts) {
    return row(label, points, "", `The team plays for the late game, and ${healerName} can out-heal dampening to win it.`);
  }
  return row(label, points, "", "The team's damage keeps scaling into the late game.");
}

//Recent win rates, pulled toward 50% with livePriorGames so a handful of games barely moves the score.
//Losing specs lose a point per percent below 50. Winning specs above 60% gain at most liveBonusCapPerSpec.
function liveRow(team: SpecProfile[], records: SpecRecord[] | undefined): ScoreRow {
  const label = "Live data";
  if (records === undefined || records.length === 0) {
    return row(label, 0, "", "There are no recent 3v3 games to adjust the score with.");
  }
  let points = 0;
  const details: string[] = [];
  const low: string[] = [];
  const high: string[] = [];
  for (const spec of team) {
    const record = records.find((r) => r.className === spec.className && r.specName === spec.specName);
    if (record === undefined || record.wins + record.losses === 0) {
      continue;
    }
    const games = record.wins + record.losses;
    const rawRate = record.wins / games * 100;
    const adjusted = (record.wins + livePriorGames / 2) / (games + livePriorGames) * 100;
    const text = `${specLabel(spec)} ${rawRate.toFixed(1)}% (${games})`;
    details.push(text);
    if (adjusted < 50) {
      points += (adjusted - 50) * livePointsPerPercent;
      low.push(`${specLabel(spec)} is winning ${rawRate.toFixed(1)}% of ${games} recent games`);
    } else if (rawRate > liveBonusThreshold) {
      const bonus = Math.min(liveBonusCapPerSpec, (adjusted - 50) * liveBonusPerPercent);
      if (bonus > 0) {
        points += bonus;
        high.push(`${specLabel(spec)} is winning ${rawRate.toFixed(1)}% of ${games} recent games`);
      }
    }
  }
  points = Math.round(Math.max(-liveCap, Math.min(liveCap, points)) * 10) / 10;
  if (details.length === 0) {
    return row(label, 0, "", "None of these specs have recent 3v3 games.");
  }
  const sentences: string[] = [];
  if (low.length > 0) {
    sentences.push(`${low.join(", and ")}, which pulls the score down.`);
  }
  if (high.length > 0) {
    sentences.push(`${high.join(", and ")}, which nudges the score up slightly.`);
  }
  let reason = "These specs are winning about half their recent games.";
  if (sentences.length > 0) {
    reason = sentences.join(" ");
  }
  return row(label, points, details.join(" · "), reason);
}

function viabilityRow(team: SpecProfile[]): ScoreRow | undefined {
  const unviable = team.filter((s) => unviableSpecs.includes(`${s.className}:${s.specName}`));
  if (unviable.length === 0) {
    return undefined;
  }
  const names = joinLabels(unviable);
  return row("PvP viability", -unviablePenalty * unviable.length, `${names} · PvE spec`, `${names} is a PvE support spec and basically unviable in arenas.`);
}

function tierOf(score: number): string {
  if (score >= 85) {
    return "S";
  }
  if (score >= 70) {
    return "A";
  }
  if (score >= 55) {
    return "B";
  }
  if (score >= 40) {
    return "C";
  }
  return "D";
}

interface BestComp {
  rawScore: number;
  team: SpecProfile[];
}

interface CachedBest {
  records: SpecRecord[] | undefined;
  best: BestComp;
}

const bestComps = new Map<GameFlavor, CachedBest>();

//Scores every healer with every pair of damage specs, once per flavor and win rate snapshot. Retail is about 2,600 teams.
function bestComp(flavor: GameFlavor, records: SpecRecord[] | undefined): BestComp {
  const cached = bestComps.get(flavor);
  if (cached && cached.records === records) {
    return cached.best;
  }
  const specs = specsForFlavor(flavor);
  const damage = specs.filter(isDamage);
  const healers = specs.filter((s) => !isDamage(s));
  let best: BestComp = { rawScore: 0, team: [] };
  for (let i = 0; i < damage.length; i++) {
    for (let j = i; j < damage.length; j++) {
      for (const healerSpec of healers) {
        const team = [damage[i], damage[j], healerSpec];
        const rawScore = rawScoreOf(team, records).rawScore;
        if (rawScore > best.rawScore) {
          best = { rawScore, team };
        }
      }
    }
  }
  bestComps.set(flavor, { records, best });
  return best;
}

function rawScoreOf(team: SpecProfile[], records: SpecRecord[] | undefined) {
  const specScores = team.map((spec) => ({ spec, baseScore: specBaseScore(spec) }));
  const baseContribution = baseWeight * specScores.reduce((sum, s) => sum + s.baseScore, 0) / team.length;

  const ms = healingReductionRow(team);
  const rows = [
    ms, purgeRow(team), immunityRemovalRow(team), overlapRow(team), mobilityRow(team), healerThroughputRow(team), healerControlRow(team), buffRow(team), burstRow(team),
    paladinDefensivesRow(team), evokerImmunitiesRow(team), duplicateDpsRow(team), peelRow(team), manaRow(team), dampeningRow(team),
  ];
  const synergy = Math.min(synergyCap, synergyWeight * rows.reduce((sum, r) => sum + r.points, 0));
  const liveData = liveRow(team, records);
  const live = liveData.points;
  rows.push(liveData);

  let penalty = 0;
  let category: string | undefined;
  const healers = team.filter((s) => s.role === "Healer").length;
  if (healers === 0) {
    penalty = noHealerPenalty;
    category = "No healer";
  } else if (healers > 1) {
    penalty = doubleHealerPenalty;
    category = "Double healer";
  }
  const viability = viabilityRow(team);
  if (viability) {
    penalty -= viability.points;
    rows.unshift(viability);
  }

  const rawScore = baseContribution + synergy + live - penalty;
  return { rawScore, archetype: archetypeOf(team), namedComp: namedCompOf(team), category, specScores, baseContribution, synergy, live, penalty, rows };
}

export function scoreComposition(team: SpecProfile[], flavor: GameFlavor, records?: SpecRecord[]): CompositionScore {
  const raw = rawScoreOf(team, records);
  const best = bestComp(flavor, records);
  const score = Math.round(Math.max(0, Math.min(100, raw.rawScore / best.rawScore * 100)));
  return { ...raw, score, tier: tierOf(score), bestRawScore: best.rawScore, bestTeam: best.team };
}
