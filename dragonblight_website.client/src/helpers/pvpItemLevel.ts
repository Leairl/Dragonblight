import { Dragonblight } from "../clients/Dragonblight";
import { getFlavor } from "./game-flavor";

//PvP item level - what an item is worth in Arenas, Battlegrounds and War Mode.
//
//Blizzard's API only reports the item level outside PvP. The PvP level comes from the item's
//bonus ids, and Wowhead decodes it into an equip line on the tooltip: "Increases item level to a
//minimum of 344 in Arenas, Battlegrounds, and War Mode." It is a floor, not a fixed level - a
//Gladiator's helm at 292 is 344 in PvP, while an honor piece upgraded past its floor of 263 just
//keeps its own level. So the PvP level is the higher of the two.
//
//The tooltip is read straight from Wowhead's tooltip endpoint, the same one its tooltip script
//calls for every hover; it answers cross-origin requests. MoP Classic has no PvP item level, so
//there the PvP level is the item level.

//Floors are looked up one bonus id at a time, never for an item's whole bonus list. An item can
//carry more than one PvP floor - honor gear has its track's 263 (bonus 12245) and the season's
//344 (bonus 13658) - and the game applies the highest, but Wowhead's tooltip prints only one of
//them, and for honor gear it picks the 263. A floor belongs to the bonus id alone, whatever item
//it is on, so each id is asked about once and remembered across visits.
const FLOOR_LINE = /increases item level to (?:a minimum of )?(\d+) in arenas/i;
//bumped when the stored floors should be thrown away, e.g. if Wowhead's data was found wrong
const STORAGE_KEY = "pvpFloorsByBonus.v1";
//a bonus id's floor, 0 when it gives none
const floors = new Map<number, Promise<number>>();
const stored: Record<string, number> = readStored();

function readStored(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function store(bonus: number, floor: number) {
  stored[bonus] = floor;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    //storage blocked or full: the floor is still remembered for this visit
  }
}

function itemLevel(item: Dragonblight.EquippedItem): number {
  return item.level?.value ?? 0;
}

//the PvP floor one bonus id gives, read off the tooltip of an item carrying it on its own
function bonusFloor(bonus: number, itemId: number): Promise<number> {
  if (stored[bonus] != undefined) return Promise.resolve(stored[bonus]);
  let floor = floors.get(bonus);
  if (floor == undefined) {
    //dataEnv 1 is live retail
    floor = fetch(`https://nether.wowhead.com/tooltip/item/${itemId}?dataEnv=1&locale=0&bonus=${bonus}`)
      .then((r) => {
        if (!r.ok) throw new Error(`wowhead ${r.status}`);
        return r.json();
      })
      .then((data: { tooltip?: string }) => {
        const match = data.tooltip?.match(FLOOR_LINE);
        const value = match ? Number(match[1]) : 0;
        store(bonus, value);
        return value;
      })
      //no answer proves nothing: count no floor for now, and ask again next time
      .catch(() => {
        floors.delete(bonus);
        return 0;
      });
    floors.set(bonus, floor);
  }
  return floor;
}

//the highest PvP floor among an item's bonus ids, 0 for PvE gear
async function pvpFloor(item: Dragonblight.EquippedItem): Promise<number> {
  const id = item.item?.id;
  if (id == undefined || !item.bonus_list?.length) return 0;
  const found = await Promise.all(item.bonus_list.map((b) => bonusFloor(b, id)));
  return Math.max(0, ...found);
}

//every equipped item's PvP item level
export async function getPvpItemLevels(
  equipment: Dragonblight.CharacterEquipmentSummary | undefined
): Promise<Map<Dragonblight.EquippedItem, number>> {
  const items = equipment?.equipped_items ?? [];
  const levels = new Map<Dragonblight.EquippedItem, number>();
  if (getFlavor() !== "retail") {
    items.forEach((item) => levels.set(item, itemLevel(item)));
    return levels;
  }
  await Promise.all(
    items.map(async (item) => {
      const floor = await pvpFloor(item);
      levels.set(item, Math.max(itemLevel(item), floor));
    })
  );
  return levels;
}

//slots that count towards the character's item level: everything but shirt and tabard
const COUNTED_SLOTS = [
  "HEAD", "NECK", "SHOULDER", "BACK", "CHEST", "WRIST", "HANDS", "WAIST", "LEGS", "FEET",
  "FINGER_1", "FINGER_2", "TRINKET_1", "TRINKET_2", "MAIN_HAND", "OFF_HAND",
];
const TWO_HANDED = ["TWOHWEAPON", "RANGED", "RANGEDRIGHT"];

//Average PvP item level, worked out the way the game works out the equipped item level: 16
//slots, with a two-handed weapon counted twice when the off hand is empty.
export function averagePvpItemLevel(
  equipment: Dragonblight.CharacterEquipmentSummary | undefined,
  levels: Map<Dragonblight.EquippedItem, number>
): number {
  const items = equipment?.equipped_items ?? [];
  const bySlot = new Map(items.map((i) => [i.slot?.type ?? "", i]));
  let total = 0;
  for (const slot of COUNTED_SLOTS) {
    const item = bySlot.get(slot);
    if (item) total += levels.get(item) ?? itemLevel(item);
  }
  const mainHand = bySlot.get("MAIN_HAND");
  if (mainHand && !bySlot.has("OFF_HAND") && TWO_HANDED.includes(mainHand.inventory_type?.type ?? "")) {
    total += levels.get(mainHand) ?? itemLevel(mainHand);
  }
  return Math.floor(total / COUNTED_SLOTS.length);
}
