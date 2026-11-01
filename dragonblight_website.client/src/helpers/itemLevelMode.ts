import { useSyncExternalStore } from "react";

// Whether item levels are shown as they are in PvP (Arenas, Battlegrounds, War Mode - raised to
// the gear's PvP minimum) or as they are everywhere else. One choice for the whole site: the
// profile and compare pages, their tooltips and stats all follow it, and every component reading
// it updates together when it changes.
//
// It is a per-viewer convenience, so it is kept in the browser; when storage is unavailable the
// site still works, it just forgets the choice. PvP is the default - this is a PvP site.

export type ItemLevelMode = "pvp" | "pve";

const KEY = "itemLevelMode";
const listeners = new Set<() => void>();

function read(): ItemLevelMode {
  try {
    return localStorage.getItem(KEY) === "pve" ? "pve" : "pvp";
  } catch {
    return "pvp";
  }
}

let current: ItemLevelMode = read();

export function setItemLevelMode(mode: ItemLevelMode): void {
  current = mode;
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // remembered for this visit only
  }
  listeners.forEach((l) => l());
}

export function useItemLevelMode(): [ItemLevelMode, (mode: ItemLevelMode) => void] {
  const mode = useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => current
  );
  return [mode, setItemLevelMode];
}
