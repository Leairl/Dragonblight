import { Dragonblight } from "../../clients/Dragonblight";
import {
  Embellishment,
  findSlotItem,
  getEmbellishments,
  getEnchant,
  getEnchantName,
  getGemSockets,
  GemSocket,
} from "../../helpers/equipmentHelper";

//The slots worth comparing, in character sheet order. Shirt and tabard are cosmetic and left out.
export const compareSlots: { slot: number; label: string }[] = [
  { slot: 1, label: "Head" },
  { slot: 2, label: "Neck" },
  { slot: 3, label: "Shoulder" },
  { slot: 15, label: "Back" },
  { slot: 5, label: "Chest" },
  { slot: 9, label: "Wrist" },
  { slot: 10, label: "Hands" },
  { slot: 6, label: "Waist" },
  { slot: 7, label: "Legs" },
  { slot: 8, label: "Feet" },
  { slot: 11, label: "Ring 1" },
  { slot: 12, label: "Ring 2" },
  { slot: 13, label: "Trinket 1" },
  { slot: 14, label: "Trinket 2" },
  { slot: 16, label: "Main Hand" },
  { slot: 17, label: "Off Hand" },
  { slot: 18, label: "Ranged" },
];

//Rings and trinkets have no meaningful order: the same two rings worn the other way round are
//not a difference. Each pair on the right is lined up against the left before diffing.
const interchangeable: [number, number][] = [
  [11, 12],
  [13, 14],
];

export interface GemDiff extends GemSocket {
  changed: boolean;
}

export interface SideDiff {
  item?: Dragonblight.EquippedItem;
  //the item level shown: PvP or PvE, whichever the page is set to
  ilvl: number;
  enchantName: string;
  embellishments: Embellishment[];
  gems: GemDiff[];
}

export interface SlotDiff {
  slot: number;
  label: string;
  left: SideDiff;
  right: SideDiff;
  itemChanged: boolean;
  ilvlChanged: boolean;
  enchantChanged: boolean;
  gemsChanged: boolean;
  embellishmentChanged: boolean;
  //positive when the right side's item level is higher
  ilvlDelta: number;
  changed: boolean;
}

export interface EquipmentDiff {
  slots: SlotDiff[];
  changedSlots: number;
  itemChanges: number;
  enchantChanges: number;
  gemChanges: number;
  embellishmentChanges: number;
  //embellished items each side wears - the game allows two
  leftEmbellished: number;
  rightEmbellished: number;
}

const gemKey = (g: GemSocket) => (g.itemId != undefined ? `gem:${g.itemId}` : "empty");

//Marks each gem that has no counterpart on the other side. Gems are matched as a multiset rather
//than socket by socket, so the same gems in a different socket order are not a change.
function diffGems(mine: GemSocket[], theirs: GemSocket[]): GemDiff[] {
  const available = new Map<string, number>();
  for (const g of theirs) {
    available.set(gemKey(g), (available.get(gemKey(g)) ?? 0) + 1);
  }
  return mine.map((g) => {
    const left = available.get(gemKey(g)) ?? 0;
    if (left > 0) {
      available.set(gemKey(g), left - 1);
      return { ...g, changed: false };
    }
    return { ...g, changed: true };
  });
}

function sameItem(a: Dragonblight.EquippedItem | undefined, b: Dragonblight.EquippedItem | undefined) {
  return (a?.item?.id ?? 0) == (b?.item?.id ?? 0);
}

type LevelOf = (item: Dragonblight.EquippedItem | undefined) => number;

function diffSlot(
  slot: number,
  label: string,
  l: Dragonblight.EquippedItem | undefined,
  r: Dragonblight.EquippedItem | undefined,
  levelOf: LevelOf
): SlotDiff {
  const lGems = getGemSockets(l);
  const rGems = getGemSockets(r);
  const left: SideDiff = {
    item: l,
    ilvl: levelOf(l),
    enchantName: getEnchantName(l),
    embellishments: getEmbellishments(l),
    gems: diffGems(lGems, rGems),
  };
  const right: SideDiff = {
    item: r,
    ilvl: levelOf(r),
    enchantName: getEnchantName(r),
    embellishments: getEmbellishments(r),
    gems: diffGems(rGems, lGems),
  };
  //the same embellishments, in whatever order the item lists them
  const embKey = (e: Embellishment[]) => e.map((x) => x.spellId).sort().join(",");
  const embellishmentChanged = embKey(left.embellishments) != embKey(right.embellishments);
  const itemChanged = !sameItem(l, r);
  const ilvlDelta = right.ilvl - left.ilvl;
  //a different item already reads as a change; the item level is only called out on its own
  //when both sides wear the same item at different upgrade levels
  const ilvlChanged = !itemChanged && ilvlDelta != 0;
  const enchantChanged = (getEnchant(l)?.enchantment_id ?? 0) != (getEnchant(r)?.enchantment_id ?? 0);
  const gemsChanged = left.gems.some((g) => g.changed) || right.gems.some((g) => g.changed);
  return {
    slot,
    label,
    left,
    right,
    itemChanged,
    ilvlChanged,
    enchantChanged,
    gemsChanged,
    embellishmentChanged,
    ilvlDelta,
    changed: itemChanged || ilvlChanged || enchantChanged || gemsChanged || embellishmentChanged,
  };
}

//`levels` holds the item level to show for each item (its PvP level in PvP mode); an item missing
//from it falls back to its own item level, which is what an empty map gives for PvE
export function diffEquipment(
  leftEquipment: Dragonblight.CharacterEquipmentSummary | undefined,
  rightEquipment: Dragonblight.CharacterEquipmentSummary | undefined,
  levels: Map<Dragonblight.EquippedItem, number>
): EquipmentDiff {
  const levelOf: LevelOf = (item) => (item ? levels.get(item) ?? item.level?.value ?? 0 : 0);
  const rightItems = new Map<number, Dragonblight.EquippedItem | undefined>();
  for (const { slot } of compareSlots) {
    rightItems.set(slot, findSlotItem(rightEquipment, slot));
  }
  for (const [a, b] of interchangeable) {
    const la = findSlotItem(leftEquipment, a);
    const lb = findSlotItem(leftEquipment, b);
    const ra = rightItems.get(a);
    const rb = rightItems.get(b);
    const straight = Number(sameItem(la, ra)) + Number(sameItem(lb, rb));
    const swapped = Number(sameItem(la, rb)) + Number(sameItem(lb, ra));
    if (swapped > straight) {
      rightItems.set(a, rb);
      rightItems.set(b, ra);
    }
  }

  const slots = compareSlots
    .map(({ slot, label }) => diffSlot(slot, label, findSlotItem(leftEquipment, slot), rightItems.get(slot), levelOf))
    //a slot neither character uses (a ranged slot in retail, an off hand for a two-hander) is noise
    .filter((d) => d.left.item != undefined || d.right.item != undefined);

  return {
    slots,
    changedSlots: slots.filter((s) => s.changed).length,
    itemChanges: slots.filter((s) => s.itemChanged).length,
    enchantChanges: slots.filter((s) => s.enchantChanged).length,
    gemChanges: slots.filter((s) => s.gemsChanged).length,
    embellishmentChanges: slots.filter((s) => s.embellishmentChanged).length,
    leftEmbellished: slots.filter((s) => s.left.embellishments.length > 0).length,
    rightEmbellished: slots.filter((s) => s.right.embellishments.length > 0).length,
  };
}
