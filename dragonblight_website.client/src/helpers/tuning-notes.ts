import type { GameFlavor } from "./game-flavor";

//Blizzard's latest class tuning, by spec, for the comp score's meta card. Entered by hand from each post.
//Only changes that reach PvP count as a buff or nerf, so a change marked "does not affect PvP combat" is PvE only.
export type TuningDirection = "Buff" | "Nerf" | "Mixed" | "PvE only";

export interface TuningNote {
  className: string;
  specName: string;
  direction: TuningDirection;
  changes: string[];
}

export interface TuningPost {
  title: string;
  url: string;
  liveDate: string;
  notes: TuningNote[];
}

const retailTuning: TuningPost = {
  title: "Class Tuning Incoming - October 27",
  url: "https://us.forums.blizzard.com/en/wow/t/class-tuning-incoming-october-27/2390748",
  liveDate: "October 27, 2026",
  notes: [
    {
      className: "Death Knight", specName: "Unholy", direction: "Nerf",
      changes: ["San'layn: Vampiric Strike damage reduced by 20% in PvP"],
    },
    {
      className: "Demon Hunter", specName: "Devourer", direction: "Buff",
      changes: ["Collapsing Star damage increased by 20% in PvP"],
    },
    {
      className: "Druid", specName: "Feral", direction: "PvE only",
      changes: ["All damage increased by 5%, not in PvP"],
    },
    {
      className: "Druid", specName: "Restoration", direction: "PvE only",
      changes: ["Verdancy +60%, Regrowth +10% and Improved Swiftmend 40% (was 30%), not in PvP"],
    },
    {
      className: "Evoker", specName: "Preservation", direction: "Buff",
      changes: [
        "Chronowarden: Chronal Dynamo raises non-instant Living Flame by 80% in PvP (was 50%)",
        "Chronowarden: Reverberations heals for an extra 80% over 8 sec in PvP (was 40%)",
      ],
    },
    {
      className: "Hunter", specName: "Marksmanship", direction: "Buff",
      changes: [
        "Trick Shots ricochet damage 85% (was 75%), Explosive Shot +10%, Volley +10%",
        "Kill Shot +40%, Dark Ranger: Black Arrow +40% and Deathblow 25% from Aimed Shot, in PvP",
      ],
    },
    {
      className: "Mage", specName: "Fire", direction: "Nerf",
      changes: ["All damage reduced by 5% in PvP", "All damage increased by 5%, not in PvP"],
    },
    {
      className: "Mage", specName: "Frost", direction: "Buff",
      changes: ["Frostfire: Isothermic Core's Meteor +20% and Duality's Pyroblast +20% in PvP"],
    },
    {
      className: "Monk", specName: "Mistweaver", direction: "Buff",
      changes: ["Conduit of the Celestials: Celestial Conduit healing +35% and Strength of the Black Ox absorb +25% in PvP"],
    },
    {
      className: "Paladin", specName: "Holy", direction: "Buff",
      changes: ["All healing increased by 5% in PvP", "Divine Favor reduces Holy Light's mana cost by 50% in PvP (was 30%)"],
    },
    {
      className: "Priest", specName: "Holy", direction: "Mixed",
      changes: [
        "Prayer of Healing +30% in PvP, but Prayerful Litany's primary target bonus 75% (was 125%)",
        "Archon: Resonant Energy 4% per stack (was 2%), Empowered Surges 10% (was 5%), Realized Potential 25% (was 20%) in PvP",
      ],
    },
    {
      className: "Rogue", specName: "Assassination", direction: "Buff",
      changes: ["Deathstalker: Deathstalker's Mark +20%, Hunt Them Down +20% and Darkest Night 15% (was 8%) in PvP"],
    },
    {
      className: "Rogue", specName: "Subtlety", direction: "Nerf",
      changes: ["All ability damage reduced by 8%", "Trickster: Fazed increases damage by 5% (was 7%)"],
    },
    {
      className: "Shaman", specName: "Restoration", direction: "Buff",
      changes: ["Healing Stream Totem and Stormstream Totem healing +20% in PvP"],
    },
    {
      className: "Warlock", specName: "Affliction", direction: "PvE only",
      changes: ["Unstable Affliction damage increased by 20%, not in PvP"],
    },
    {
      className: "Warlock", specName: "Destruction", direction: "Buff",
      changes: ["Rain of Fire damage increased by 20%"],
    },
  ],
};

//no classic tuning post has been entered yet
export function latestTuning(flavor: GameFlavor): TuningPost | undefined {
  if (flavor === "retail") {
    return retailTuning;
  }
  return undefined;
}

export function tuningFor(post: TuningPost | undefined, className: string, specName: string): TuningNote | undefined {
  return post?.notes.find((n) => n.className === className && n.specName === specName);
}
