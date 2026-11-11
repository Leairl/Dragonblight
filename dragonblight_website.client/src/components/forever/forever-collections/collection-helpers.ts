import type { Dragonblight } from "../../../clients/Dragonblight";

export type CollectionKind = "mount" | "pet" | "toy" | "appearance";

// One collected mount, pet, toy or appearance as the tab lists it. id is what its picture is looked
// up by: the mount, the pet's species, the toy, or the appearance.
export interface CollectionEntry {
  kind: CollectionKind;
  key: string;
  id: number;
  name: string;
  detail?: string;
  quality?: string;
  muted?: boolean;
}

export function mountEntries(mounts: Dragonblight.ForeverCollectedMount[] | undefined): CollectionEntry[] {
  return (mounts ?? []).flatMap((entry) => entry.mount ? [{
    kind: "mount" as const,
    key: `mount/${entry.mount.id}`,
    id: entry.mount.id,
    name: entry.mount.name ?? "Unknown mount",
    // Blizzard says false for a mount the character can't ride yet, e.g. one for the other faction
    detail: entry.is_useable === false ? "Not usable" : undefined,
    muted: entry.is_useable === false,
  }] : []);
}

export function petEntries(pets: Dragonblight.ForeverCollectedPet[] | undefined): CollectionEntry[] {
  return (pets ?? []).flatMap((entry) => entry.species ? [{
    kind: "pet" as const,
    // the character can own two of a species, so the pet's own id keeps keys unique
    key: `pet/${entry.id}`,
    id: entry.species.id,
    name: entry.species.name ?? "Unknown pet",
    detail: [entry.level != null ? `Level ${entry.level}` : undefined, entry.quality?.name].filter(Boolean).join(" · ") || undefined,
    quality: entry.quality?.type,
  }] : []);
}

export function toyEntries(toys: Dragonblight.ForeverCollectedToy[] | undefined): CollectionEntry[] {
  return (toys ?? []).flatMap((entry) => entry.toy ? [{
    kind: "toy" as const,
    key: `toy/${entry.toy.id}`,
    id: entry.toy.id,
    name: entry.toy.name ?? "Unknown toy",
  }] : []);
}

const qualityRank = ["POOR", "COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "ARTIFACT", "HEIRLOOM"];

// A slot's appearances, best quality first and then by name. Appearances with no item in Blizzard's
// API have no name, so they come last, dimmed.
export function appearanceEntries(appearances: Dragonblight.ForeverAppearance[] | undefined): CollectionEntry[] {
  return (appearances ?? [])
    .map((appearance) => ({
      kind: "appearance" as const,
      key: `appearance/${appearance.id}`,
      id: appearance.id,
      name: appearance.name ?? "Unnamed appearance",
      quality: appearance.quality,
      muted: !appearance.name,
    }))
    .sort((a, b) => Number(a.muted) - Number(b.muted)
      || qualityRank.indexOf(b.quality ?? "") - qualityRank.indexOf(a.quality ?? "")
      || a.name.localeCompare(b.name));
}

export function filterEntries(entries: CollectionEntry[], query: string): CollectionEntry[] {
  const text = query.trim().toLocaleLowerCase();
  if (!text) return entries;
  return entries.filter((entry) => entry.name.toLocaleLowerCase().includes(text) || entry.detail?.toLocaleLowerCase().includes(text));
}

type QualityColor = "gray" | "green" | "blue" | "purple" | "orange" | "amber" | "cyan";

// Item quality colors as the game shows them on an item or pet's name.
export function qualityColor(quality: string | undefined): QualityColor | undefined {
  switch (quality) {
    case "POOR": return "gray";
    // common is the game's white: the default text color
    case "UNCOMMON": return "green";
    case "RARE": return "blue";
    case "EPIC": return "purple";
    case "LEGENDARY": return "orange";
    case "ARTIFACT": return "amber";
    case "HEIRLOOM": return "cyan";
    default: return undefined;
  }
}

// "2 of 141" with a bar, or just the count when Forever's totals couldn't be read. A total lower
// than the count (game data a patch behind the character) is treated as unknown, not as over 100%.
export function collectionProgress(collected: number, total: number | undefined) {
  if (!total || total < collected) return undefined;
  return { value: collected, max: total, percent: Math.round((collected / total) * 100) };
}
