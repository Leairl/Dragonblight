// Helpers for drawing items the way Wowhead's tooltip script does, where its own data can't be used.

// Wowhead's quality classes by Blizzard's quality type, for a name's colour
const qualityClasses: Record<string, string> = {
  POOR: "q0",
  COMMON: "q1",
  UNCOMMON: "q2",
  RARE: "q3",
  EPIC: "q4",
  LEGENDARY: "q5",
  ARTIFACT: "q6",
  HEIRLOOM: "q7",
};

// e.g. "UNCOMMON" -> "q2"; white (q1) when unknown
export function wowheadQualityClass(quality: string | undefined): string {
  if (quality && qualityClasses[quality]) {
    return qualityClasses[quality];
  }
  return "q1";
}

// Wowhead's icon image by its icon name ("inv_misc_armorkit_15"), at "small" (18px) or "medium" (36px)
export function wowheadIconUrl(iconName: string, size: "small" | "medium"): string {
  return `https://wow.zamimg.com/images/wow/icons/${size}/${iconName}.jpg`;
}

// Opens a Wowhead page in a new tab. For items drawn with our own tooltip: a link to wowhead.com would
// get Wowhead's tooltip too, whatever its attributes, so these open the page on click instead.
export function openWowhead(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}
