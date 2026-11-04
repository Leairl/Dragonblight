//Icon paths in /public, named after Blizzard's class and spec names. A missing name gets the
//unknown icon, since a character's class or spec isn't always synced yet.
export function classIcon(className: string | undefined): string {
  if (!className) {
    return "/unknown.png";
  }
  return `/ProfileClassIcons/${className.replace(/ /g, "").toLowerCase()}.png`;
}

export function specIcon(className: string | undefined, specName: string | undefined): string {
  if (!className || !specName) {
    return "/unknown.png";
  }
  return `/Specs/${specName.toLowerCase()}_${className.toLowerCase()}.png`;
}
