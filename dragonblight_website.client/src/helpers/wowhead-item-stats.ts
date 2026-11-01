import { Dragonblight } from "../clients/Dragonblight";

// Wowhead's item tooltips show an item's default secondary stats, not the ones it actually has.
// Gear whose secondaries were changed (Jax's PvP tier helm is Versatility/Mastery in game and
// from Blizzard, but Wowhead draws it Crit/Mastery) carries the change somewhere Wowhead does not
// read, and its tooltip service has no way to be told the stats. So the secondary stat lines are
// rewritten as each tooltip appears, from the stats Blizzard reports for the item.
//
// Blizzard's numbers are for the item's own item level, while a tooltip can be drawn at another
// (the compare page draws PvP item level). Changing an item's secondaries redistributes the same
// stat budget - the helm has 167 either way, 105 + 62 or 56 + 111 - so the tooltip keeps Wowhead's
// total at the level it is drawn at and splits it in Blizzard's proportions. Checked against the
// game: the helm at 344 comes out at the 131 Versatility / 78 Mastery the game shows.
//
// Links opt in with a data-db-stats attribute (secondaryStatsAttr). The tooltip that appears is
// matched to the link the pointer is on, since Wowhead's tooltip does not say which link raised it.

const SECONDARY = ["Critical Strike", "Haste", "Mastery", "Versatility"];
const STAT_LINE = new RegExp(`^\\+\\s*([\\d,]+) (${SECONDARY.join("|")})$`);
export const STATS_ATTRIBUTE = "data-db-stats";

type Stats = [name: string, value: number][];

// The item's secondary stats as Blizzard reports them, for the link's data-db-stats attribute.
// Stats the item shows greyed out (another spec's primary stat) are not secondaries and never match.
export function secondaryStatsAttr(item: Dragonblight.EquippedItem | undefined): string | undefined {
  const stats: Stats = (item?.stats ?? [])
    .filter((s) => !s.is_negated && SECONDARY.includes(s.type?.name ?? ""))
    .map((s) => [s.type!.name!, s.value]);
  return stats.length ? JSON.stringify(stats) : undefined;
}

// The lines of the item's own secondary stats. Wowhead fences them with comment markers -
// <!--ebstats--> ... <!--egstats--> - so a gem or enchant reading "+20 Haste" elsewhere in the
// tooltip is never touched. Without the markers nothing is found and the tooltip is left alone.
function statBlock(root: Element): HTMLSpanElement[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
  let start: Comment | undefined;
  while (walker.nextNode()) {
    const c = walker.currentNode as Comment;
    if (c.data === "ebstats") start = c;
    else if (c.data === "egstats" && start) {
      const spans: HTMLSpanElement[] = [];
      for (let n = start.nextSibling; n && n !== c; n = n.nextSibling) {
        if (n.nodeName === "SPAN") spans.push(n as HTMLSpanElement);
      }
      return spans;
    }
  }
  return [];
}

// Rewrites a tooltip's secondary stat lines. Does nothing when the tooltip already agrees, which
// also keeps the rewrite from feeding itself through the observer below.
function rewrite(root: Element, actual: Stats): void {
  const lines = statBlock(root).filter((s) => STAT_LINE.test(s.textContent?.trim() ?? ""));
  if (lines.length === 0) return;
  const shown = lines.map((s) => {
    const m = STAT_LINE.exec(s.textContent!.trim())!;
    return { name: m[2], value: Number(m[1].replace(/,/g, "")) };
  });
  const total = shown.reduce((t, s) => t + s.value, 0);
  const budget = actual.reduce((t, [, v]) => t + v, 0);
  if (total === 0 || budget === 0) return;
  const wanted = actual.map(([name, v]) => ({ name, value: Math.round((v * total) / budget) }));
  const same =
    wanted.length === shown.length && wanted.every((w, i) => w.name === shown[i].name && w.value === shown[i].value);
  if (same) return;

  // reuse Wowhead's own line elements so the styling stays theirs; extra lines go, missing ones
  // are copies of the last, each after a line break like Wowhead's
  wanted.forEach((w, i) => {
    let line = lines[i];
    if (!line) {
      const last = lines[lines.length - 1];
      line = last.cloneNode(false) as HTMLSpanElement;
      last.after(document.createElement("br"), line);
      lines.push(line);
    }
    line.textContent = `+${w.value.toLocaleString("en-US")} ${w.name}`;
  });
  for (const extra of lines.slice(wanted.length)) {
    if (extra.previousSibling?.nodeName === "BR") extra.previousSibling.remove();
    extra.remove();
  }
}

// Watches for tooltips and corrects them. Call once at startup.
export function installItemStatFix(): void {
  let hovered: Stats | undefined;
  document.addEventListener(
    "mouseover",
    (e) => {
      const link = (e.target as Element | null)?.closest?.(`[${STATS_ATTRIBUTE}]`);
      try {
        hovered = link ? JSON.parse(link.getAttribute(STATS_ATTRIBUTE)!) : undefined;
      } catch {
        hovered = undefined;
      }
    },
    true
  );
  new MutationObserver((records) => {
    if (!hovered) return;
    for (const record of records) {
      record.addedNodes.forEach((node) => {
        const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
        const tooltip = el?.closest(".wowhead-tooltip") ?? el?.querySelector(".wowhead-tooltip");
        if (tooltip) rewrite(tooltip, hovered!);
      });
    }
  }).observe(document.body, { childList: true, subtree: true });
}
