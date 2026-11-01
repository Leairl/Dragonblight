import { Dragonblight } from "../clients/Dragonblight";

// A character sheet as it would read in PvP (Arenas, Battlegrounds, War Mode), worked out from the
// sheet Blizzard reports, which is the character outside PvP.
//
// In PvP gear is raised to its PvP item level and every stat on it rises with it. Blizzard does
// not report the PvP sheet, so it is rebuilt here from rules measured against Blizzard's own data:
//
//   - Each item's stats at its PvP item level come from Wowhead's tooltip at that level. At an
//     item's own level Wowhead matched Blizzard on all 16 of a character's items. Secondaries are
//     split in Blizzard's proportions, since Wowhead shows an item's default secondaries (see
//     wowhead-item-stats.ts) - only the total is taken from Wowhead.
//   - Rating to percentage at level 90 is a fixed number of rating per 1%, the same for every
//     character (checked on 113): crit 46, haste 44, mastery 46 per mastery point, versatility 54.
//     Past 30% each extra point is worth less; the brackets below matched Blizzard exactly on all
//     243 values checked, the 11 past 30% included.
//   - Crit and versatility from rating add to the character's other sources; haste multiplies.
//     Mastery points times the spec's multiplier add to its base, and the multiplier is read off
//     the character's own sheet.
//   - Primary stat and stamina from gear are raised on the sheet by talents and passives; the
//     extra PvP amount gets the same multiplier the character's gear already gets. Health is 20
//     per stamina.
//
// Gems and enchants do not scale with item level and are left as they are. It is an estimate:
// procs, temporary buffs and anything the sheet adds that does not follow these rules are not
// modelled, so the result is marked as approximate wherever it is shown.

type Stats = Dragonblight.CharacterStatisticsSummary;
type Item = Dragonblight.EquippedItem;

const RATING_PER_PERCENT = { crit: 46, haste: 44, mastery: 46, versatility: 54 };
const HEALTH_PER_STAMINA = 20;
// share of each further 1% that rating still gives, once it has given this much
const DIMINISHING: [upTo: number, keeps: number][] = [
  [30, 1.0],
  [39, 0.9],
  [47, 0.8],
  [54, 0.7],
  [66, 0.6],
  [126, 0.5],
  [Infinity, 0],
];

// percentage (or mastery points) from rating, after diminishing returns
function fromRating(rating: number, perPercent: number): number {
  const raw = rating / perPercent;
  let out = 0;
  let from = 0;
  for (const [upTo, keeps] of DIMINISHING) {
    if (raw <= upTo) return out + (raw - from) * keeps;
    out += (upTo - from) * keeps;
    from = upTo;
  }
  return out;
}

// rating needed to reach a percentage (or mastery points): fromRating run backwards
function toRating(percent: number, perPercent: number): number {
  let raw = 0;
  let from = 0;
  let left = percent;
  for (const [upTo, keeps] of DIMINISHING) {
    const span = (upTo - from) * keeps;
    if (left <= span || keeps === 0) return (raw + (keeps ? left / keeps : 0)) * perPercent;
    raw = upTo;
    left -= span;
    from = upTo;
  }
  return raw * perPercent;
}

// A stat's rating. Retail reports it as rating_normalized; a server without that field (an older
// build, or an entry cached before it) leaves only the percentage, and then crit and haste rating
// are worked back out from it - exactly, since the conversion is fixed. Mastery cannot be: its
// percentage includes a per-spec multiplier only the rating reveals, so it gets undefined.
function ratingOf(
  s: { rating?: number; rating_normalized?: number; rating_bonus: number } | undefined,
  perPercent?: number
): number | undefined {
  if (s?.rating_normalized != undefined) return s.rating_normalized;
  if (s?.rating) return s.rating;
  if (!s?.rating_bonus) return 0;
  return perPercent != undefined ? Math.round(toRating(s.rating_bonus, perPercent)) : undefined;
}

type Primary = "strength" | "agility" | "intellect";
const PRIMARY_TYPE: Record<string, Primary> = { STRENGTH: "strength", AGILITY: "agility", INTELLECT: "intellect" };
const SECONDARY_TYPE: Record<string, "crit" | "haste" | "mastery" | "versatility"> = {
  CRIT_RATING: "crit",
  HASTE_RATING: "haste",
  MASTERY_RATING: "mastery",
  VERSATILITY: "versatility",
};

interface ItemStats {
  primary: number;
  stamina: number;
  armor: number;
  secondaryTotal: number;
}

// an item's stats at a given item level, read from Wowhead's tooltip; kept for the visit
const tooltips = new Map<string, Promise<ItemStats | undefined>>();
function statsAtLevel(item: Item, ilvl: number): Promise<ItemStats | undefined> {
  const bonus = item.bonus_list?.join(":") ?? "";
  const key = `${item.item?.id}|${bonus}|${ilvl}`;
  let p = tooltips.get(key);
  if (!p) {
    p = fetch(`https://nether.wowhead.com/tooltip/item/${item.item?.id}?dataEnv=1&locale=0&bonus=${bonus}&ilvl=${ilvl}`)
      .then((r) => (r.ok ? r.json() : undefined))
      .then((d: { tooltip?: string } | undefined) => (d?.tooltip ? parseTooltip(d.tooltip) : undefined))
      .catch(() => {
        tooltips.delete(key);
        return undefined;
      });
    tooltips.set(key, p);
  }
  return p;
}

// The item's own stats only: primary, stamina and armor come before Wowhead's <!--ebstats-->
// marker and the secondaries between it and <!--egstats-->, so a socket bonus or anything else
// further down never counts.
function parseTooltip(html: string): ItemStats | undefined {
  const [head, rest] = html.split("<!--ebstats-->");
  if (rest == undefined) return undefined;
  const block = rest.split("<!--egstats-->")[0];
  const text = (s: string) => s.replace(/<[^>]+>/g, " ");
  const num = (m: RegExpMatchArray | null) => (m ? Number(m[1].replace(/,/g, "")) : 0);
  const secondaries = [...text(block).matchAll(/\+\s*([\d,]+) (?:Critical Strike|Haste|Mastery|Versatility)/g)];
  return {
    primary: num(text(head).match(/\+\s*([\d,]+) \[?(?:Strength|Agility|Intellect)/)),
    stamina: num(text(head).match(/\+\s*([\d,]+) Stamina/)),
    armor: num(text(head).match(/([\d,]+) Armor/)),
    secondaryTotal: secondaries.reduce((t, m) => t + Number(m[1].replace(/,/g, "")), 0),
  };
}

export interface PvpGearGain {
  primary: number;
  stamina: number;
  armor: number;
  crit: number;
  haste: number;
  mastery: number;
  versatility: number;
}

// What the character's gear gains in PvP, summed over every item raised to a higher PvP item level.
// `pvpLevels` is each item's PvP item level (pvpItemLevel.ts). Items that cannot be read add nothing.
export async function getPvpGearGain(
  equipment: Dragonblight.CharacterEquipmentSummary | undefined,
  pvpLevels: Map<Item, number>
): Promise<PvpGearGain> {
  const gain: PvpGearGain = { primary: 0, stamina: 0, armor: 0, crit: 0, haste: 0, mastery: 0, versatility: 0 };
  await Promise.all(
    (equipment?.equipped_items ?? []).map(async (item) => {
      const level = item.level?.value ?? 0;
      const pvp = pvpLevels.get(item) ?? level;
      if (pvp <= level) return;
      const at = await statsAtLevel(item, pvp);
      if (!at) return;
      const own = (item.stats ?? []).filter((s) => !s.is_negated);
      const sum = (pick: (t: string) => boolean) =>
        own.filter((s) => pick(s.type?.type ?? "")).reduce((t, s) => t + s.value, 0);
      gain.primary += at.primary - sum((t) => t in PRIMARY_TYPE);
      gain.stamina += at.stamina - sum((t) => t === "STAMINA");
      gain.armor += at.armor - (item.armor?.value ?? 0);
      // the PvP secondary total, split the way Blizzard says this item's secondaries are split
      const secs = own.filter((s) => (s.type?.type ?? "") in SECONDARY_TYPE);
      const total = secs.reduce((t, s) => t + s.value, 0);
      if (total > 0 && at.secondaryTotal > 0) {
        for (const s of secs) {
          gain[SECONDARY_TYPE[s.type!.type!]] += Math.round((s.value * at.secondaryTotal) / total) - s.value;
        }
      }
    })
  );
  return gain;
}

// the primary stat the character's gear gives, by what most of it carries
function primaryOf(equipment: Dragonblight.CharacterEquipmentSummary | undefined): Primary | undefined {
  const counts = new Map<Primary, number>();
  for (const item of equipment?.equipped_items ?? []) {
    for (const s of item.stats ?? []) {
      const p = PRIMARY_TYPE[s.type?.type ?? ""];
      if (p && !s.is_negated) counts.set(p, (counts.get(p) ?? 0) + s.value);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

// The sheet with the PvP gain applied. Values with nothing to scale by are left as they are;
// weapon DPS is cleared, since weapon damage rises with item level in a way not modelled here.
export function pvpSheet(
  stats: Stats,
  equipment: Dragonblight.CharacterEquipmentSummary | undefined,
  gain: PvpGearGain
): Stats {
  const out: Stats = structuredClone(stats);
  const gear = (types: string[]) =>
    (equipment?.equipped_items ?? [])
      .flatMap((i) => i.stats ?? [])
      .filter((s) => !s.is_negated && types.includes(s.type?.type ?? ""))
      .reduce((t, s) => t + s.value, 0);
  // how much the sheet raises what gear gives, measured on this character
  const multiplier = (onSheet: number, fromGear: number) => (fromGear > 0 && onSheet > 0 ? onSheet / fromGear : 1);

  const primary = primaryOf(equipment);
  if (primary && out[primary]) {
    const p = out[primary]!;
    const extra = Math.round(gain.primary * multiplier(p.effective - p.base, gear(["STRENGTH", "AGILITY", "INTELLECT"])));
    out[primary] = { ...p, effective: p.effective + extra };
    // attack power follows strength and agility, spell power intellect
    if (primary === "intellect") out.spell_power += extra;
    else out.attack_power += extra;
  }
  if (out.stamina) {
    const st = out.stamina;
    const extra = Math.round(gain.stamina * multiplier(st.effective - st.base, gear(["STAMINA"])));
    out.stamina = { ...st, effective: st.effective + extra };
    out.health += extra * HEALTH_PER_STAMINA;
  }
  if (out.armor) out.armor = { ...out.armor, effective: out.armor.effective + gain.armor };

  // crit adds to the character's other crit
  const crit = (s: Dragonblight.RatingStatistic | undefined) => {
    if (!s) return s;
    const rating = (ratingOf(s, RATING_PER_PERCENT.crit) ?? 0) + gain.crit;
    const bonus = fromRating(rating, RATING_PER_PERCENT.crit);
    return { ...s, rating_normalized: rating, rating_bonus: bonus, value: s.value - s.rating_bonus + bonus };
  };
  out.melee_crit = crit(out.melee_crit);
  out.ranged_crit = crit(out.ranged_crit);
  out.spell_crit = crit(out.spell_crit);

  // haste multiplies with the character's other haste
  const haste = (s: Dragonblight.RatingStatistic | undefined) => {
    if (!s) return s;
    const rating = (ratingOf(s, RATING_PER_PERCENT.haste) ?? 0) + gain.haste;
    const bonus = fromRating(rating, RATING_PER_PERCENT.haste);
    const other = (1 + s.value / 100) / (1 + s.rating_bonus / 100);
    return { ...s, rating_normalized: rating, rating_bonus: bonus, value: (other * (1 + bonus / 100) - 1) * 100 };
  };
  out.melee_haste = haste(out.melee_haste);
  out.ranged_haste = haste(out.ranged_haste);
  out.spell_haste = haste(out.spell_haste);

  // mastery points times the spec's multiplier, read off the sheet; with no mastery rating there
  // is nothing to read it from, and mastery is left alone
  const masteryRating = ratingOf(out.mastery);
  if (out.mastery && masteryRating != undefined) {
    const m = out.mastery;
    const points = fromRating(masteryRating, RATING_PER_PERCENT.mastery);
    if (points > 0) {
      const perPoint = m.rating_bonus / points;
      const rating = masteryRating + gain.mastery;
      const bonus = fromRating(rating, RATING_PER_PERCENT.mastery) * perPoint;
      out.mastery = { ...m, rating_normalized: rating, rating_bonus: bonus, value: m.value - m.rating_bonus + bonus };
    }
  }

  // versatility: damage and healing done gain the full amount, damage taken half
  {
    const before = fromRating(out.versatility, RATING_PER_PERCENT.versatility);
    out.versatility += gain.versatility;
    const after = fromRating(out.versatility, RATING_PER_PERCENT.versatility);
    out.versatility_damage_done_bonus += after - before;
    out.versatility_healing_done_bonus += after - before;
    out.versatility_damage_taken_bonus += (after - before) / 2;
  }

  out.main_hand_dps = NaN;
  out.off_hand_dps = NaN;
  out.main_hand_damage_min = NaN;
  out.main_hand_damage_max = NaN;
  out.off_hand_damage_min = NaN;
  out.off_hand_damage_max = NaN;
  return out;
}
