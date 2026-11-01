import { Dragonblight } from "../clients/Dragonblight";
import { RandEnchant } from "./randomEnchantHelper";

//Pure lookups on a single equipped item, for pages that need to read gear without the profile
//paperdoll's props - the compare page reads two characters' gear side by side.

//Blizzard's slot types, indexed by the paperdoll slot numbers the profile uses
export const slotName: string[] = [
  "ammo",
  "head",
  "neck",
  "shoulder",
  "shirt",
  "chest",
  "waist",
  "legs",
  "feet",
  "wrist",
  "hands",
  "finger_1",
  "finger_2",
  "trinket_1",
  "trinket_2",
  "back",
  "main_hand",
  "off_hand",
  "ranged",
  "tabard",
];

export function findSlotItem(
  equipment: Dragonblight.CharacterEquipmentSummary | undefined,
  slot: number
): Dragonblight.EquippedItem | undefined {
  return equipment?.equipped_items?.find(
    (item) => item.slot?.type?.toLowerCase() == slotName[slot]
  );
}

//the permanent enchant; gems and temporary enchants live in other enchantment slots
export function getEnchant(item: Dragonblight.EquippedItem | undefined): Dragonblight.Enchantment | undefined {
  return item?.enchantments?.find((e) => e.enchantment_slot?.id == 0);
}

//the enchant's source item name (e.g. "Enchant Boots - Lynx's Dexterity"), falling back to the
//display string when there is no source item
export function getEnchantName(item: Dragonblight.EquippedItem | undefined): string {
  const enchant = getEnchant(item);
  if (!enchant) return "";
  const name = enchant.source_item?.name ?? enchant.display_string ?? "";
  return stripWowMarkup(name.replace("Enchanted: ", ""));
}

export interface Embellishment {
  spellId: number;
  name: string;
}

//The embellishments on a crafted item. Blizzard marks an embellished item with its unique-equip
//limit ("Unique-Equipped: Embellished (2)") and lists the embellishment's effect among the item's
//spells, e.g. Arcanoweave Lining. Armor has no spells of its own, so on armor those are the
//embellishments; the check on the limit keeps an ordinary trinket's or weapon's effect out.
export function getEmbellishments(item: Dragonblight.EquippedItem | undefined): Embellishment[] {
  if (!item?.limit_category?.includes("Embellished")) return [];
  return (item.spells ?? [])
    .filter((s) => s.spell?.id != undefined)
    .map((s) => ({ spellId: s.spell!.id, name: s.spell?.name ?? "Embellishment" }));
}

export interface GemSocket {
  itemId?: number;
  name?: string;
  empty?: string;
}

//What sits in each of an item's sockets, in socket order. Retail reports sockets directly and
//includes the empty ones; MoP Classic has no sockets array at all and reports its gems as
//enchantments in slots 2 to 4, where an empty socket simply does not appear.
export function getGemSockets(item: Dragonblight.EquippedItem | undefined): GemSocket[] {
  if (item?.sockets != null) {
    return item.sockets.map((socket) =>
      socket.item?.id != undefined
        ? { itemId: socket.item.id, name: socket.item.name }
        : { empty: socket.socket_type?.name ?? "Empty Socket" }
    );
  }
  return (item?.enchantments ?? [])
    .filter((e) => e.enchantment_slot?.id == 2 || e.enchantment_slot?.id == 3 || e.enchantment_slot?.id == 4)
    .map((e) => ({ itemId: e.source_item?.id, name: e.source_item?.name }));
}

function getRandomEnchantments(item: Dragonblight.EquippedItem | undefined): string {
  let randomEnchantment = "";
  RandEnchant.forEach((value, key) => {
    if (item?.name?.endsWith(value)) {
      randomEnchantment += key + ":";
    }
  });
  return randomEnchantment;
}

//What Wowhead needs to draw the item this character is actually wearing: without the bonus ids
//and item level it renders the item's base version instead. Matches the profile paperdoll.
//`ilvl` overrides the item level, which is how a tooltip is drawn at its PvP item level - Wowhead
//scales the stats to whatever level it is given.
export function itemTooltipParams(item: Dragonblight.EquippedItem | undefined, ilvl?: number): string {
  const gems = getGemSockets(item)
    .map((g) => g.itemId)
    .filter((id) => id != undefined)
    .join(":");
  const pcs = item?.set?.items?.filter((i) => i.is_equipped).map((t) => t.item?.id).join(":");
  return (
    `item=${item?.item?.id ?? 0}` +
    `&ench=${getEnchant(item)?.enchantment_id}` +
    `&gems=${gems}` +
    `&rand=${getRandomEnchantments(item)}` +
    `&pcs=${pcs}` +
    `&transmog=${item?.transmog?.item?.id ?? 0}` +
    `&bonus=${item?.bonus_list?.join(":") ?? ""}` +
    `&ilvl=${ilvl ?? item?.level?.value ?? ""}`
  );
}

//Blizzard strings carry in-game UI escape codes that only the game client renders:
//|A...|a atlas icons (e.g. the crafting quality star), |T...|t textures,
//|cAARRGGBB...|r colours. On the web they show up as raw text, so drop them.
export function stripWowMarkup(text: string): string {
  return text
    .replace(/\|A[^|]*\|a/g, "")
    .replace(/\|T[^|]*\|t/g, "")
    .replace(/\|c[0-9a-fA-F]{8}/g, "")
    .replace(/\|r/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

//in-game item quality colours, keyed by Blizzard's quality type
export const QualityColor: Record<string, string> = {
  POOR: "#9d9d9d",
  COMMON: "#ffffff",
  UNCOMMON: "#1eff00",
  RARE: "#0070dd",
  EPIC: "#a335ee",
  LEGENDARY: "#ff8000",
  ARTIFACT: "#e6cc80",
  HEIRLOOM: "#00ccff",
};
