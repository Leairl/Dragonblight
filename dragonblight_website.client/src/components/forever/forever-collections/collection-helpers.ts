import type { Dragonblight } from "../../../clients/Dragonblight";

export type CollectionKind = "mount" | "pet" | "toy";

// One collected mount, pet or toy as the tab lists it. id is what its picture is looked up by:
// the mount, the pet's species, or the toy.
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

export function filterEntries(entries: CollectionEntry[], query: string): CollectionEntry[] {
  const text = query.trim().toLocaleLowerCase();
  if (!text) return entries;
  return entries.filter((entry) => entry.name.toLocaleLowerCase().includes(text) || entry.detail?.toLocaleLowerCase().includes(text));
}

type QualityColor = "gray" | "green" | "blue" | "purple" | "orange";

// Item quality colors as the game shows them on a pet's name.
export function qualityColor(quality: string | undefined): QualityColor | undefined {
  switch (quality) {
    case "POOR":
    case "COMMON": return "gray";
    case "UNCOMMON": return "green";
    case "RARE": return "blue";
    case "EPIC": return "purple";
    case "LEGENDARY": return "orange";
    default: return undefined;
  }
}

// "2 of 141" with a bar, or just the count when Forever's totals couldn't be read. A total lower
// than the count (game data a patch behind the character) is treated as unknown, not as over 100%.
export function collectionProgress(collected: number, total: number | undefined) {
  if (!total || total < collected) return undefined;
  return { value: collected, max: total, percent: Math.round((collected / total) * 100) };
}
