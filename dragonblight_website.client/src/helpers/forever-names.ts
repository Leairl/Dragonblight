// Names and icon paths for WoW: Forever classes' specs and races, shared by the Forever pages.

// Blizzard's names for some Forever talent trees, shortened to the names players use. The
// short name is also what the spec icons are named after (elemental_shaman.png, feral_druid.png).
const specDisplayNames: Record<string, string> = {
  "Elemental Combat": "Elemental",
  "Shadow Magic": "Shadow",
  "Feral Combat": "Feral",
};

export function specDisplayName(specName: string): string {
  const shown = specDisplayNames[specName];
  if (shown !== undefined) {
    return shown;
  }
  return specName;
}

// The spec icon file, from the spec's display name, e.g. /Specs/shadow_priest.png
export function specIcon(specName: string, className: string): string {
  return `/Specs/${specName.toLowerCase()}_${className.toLowerCase()}.png`;
}

// The race icon file: the race name lowercased with every space removed, so "High Order
// Skyborne" is highorderskyborne-m.png
export function raceIcon(raceName: string): string {
  return `/RaceIcons/${raceName.toLowerCase().split(" ").join("")}-m.png`;
}
