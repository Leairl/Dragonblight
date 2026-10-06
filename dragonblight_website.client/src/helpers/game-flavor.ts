// Which version of WoW the site is showing: MoP Classic or retail.
//
// Every route names its flavor as its first path segment - /classic/rankings,
// /retail/profile/... - so the URL alone decides, with no stored preference to fall back
// on. The router's basename adds the segment to every Link and navigate(), so route
// definitions and the paths in this file stay flavor-free.

export type GameFlavor = "classic" | "retail";

const HEADER = "X-Game-Flavor";

// Retail is the exception; anything else, including a URL missing its flavor, is classic.
export function getFlavor(): GameFlavor {
  return window.location.pathname.split("/")[1] === "retail" ? "retail" : "classic";
}

// Prefixes a path for plain browser navigation. Links inside the router don't need this -
// basename adds the flavor for them.
export function flavorHref(path: string): string {
  return `/${getFlavor()}${path}`;
}

// Where the toggle lands you, given the flavor-free path you are on now. A character
// belongs to one flavor, so switching leaves its page; retail has no 5v5 ladder.
function destination(flavor: GameFlavor, path: string): string {
  if (path.startsWith("/profile")) return "/rankings";
  if (flavor === "retail" && path.endsWith("/5v5")) return path.replace("/5v5", "/3v3");
  return path;
}

// Switches flavor. `path` is the current path without its flavor - exactly what
// useLocation() returns inside the router. This is a full page load rather than a
// client-side navigation, so every page refetches and index.html re-reads the flavor
// for tooltips and the model viewer.
export function setFlavor(flavor: GameFlavor, path: string): void {
  if (flavor === getFlavor()) return;
  window.location.assign(`/${flavor}${destination(flavor, path)}`);
}

// A URL with no flavor - an old link, a bookmark, a typed address - gets the default
// written into it before the app renders, so the router's basename always matches.
// replaceState rewrites this history entry instead of adding one.
export function ensureFlavorInPath(): void {
  if (window.location.pathname.split("/")[1] === getFlavor()) return;
  const path = `/${getFlavor()}${window.location.pathname}`;
  window.history.replaceState(window.history.state, "", path + window.location.search);
}

// Wraps fetch so every request to our own API carries the current flavor as a header,
// which is how the server picks a flavor without it being a parameter on each endpoint.
// Call once at startup.
export function installFlavorHeader(): void {
  const original = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string" ? input
      : input instanceof URL ? input.toString()
      : input.url;

    if (!url.includes("/api/")) return original(input, init);

    if (typeof input === "string" || input instanceof URL) {
      const headers = new Headers(init?.headers);
      headers.set(HEADER, getFlavor());
      return original(input, { ...init, headers });
    }

    const request = new Request(input, init);
    request.headers.set(HEADER, getFlavor());
    return original(request);
  };
}

// The path segment Wowhead serves each game version under: MoP Classic lives at
// /mop-classic/, retail at the root. Tooltip contents come from the matching `domain`
// in whTooltips, which index.html sets before tooltips.js loads.
export function wowheadPath(flavor: GameFlavor = getFlavor()): string {
  return flavor === "classic" ? "mop-classic/" : "";
}

// Builds a Wowhead link for the current flavor, e.g. wowheadUrl(`item=${id}`).
export function wowheadUrl(path: string, flavor: GameFlavor = getFlavor()): string {
  return `https://www.wowhead.com/${wowheadPath(flavor)}${path}`;
}

// The PvP brackets a flavor has ladders for, in display order. Retail has no 5v5.
// The server's GameFlavorExtensions.Brackets() returns the same brackets in the same
// order, and profile-rating labels its cards by position, so the two must agree.
export function brackets(flavor: GameFlavor = getFlavor()): string[] {
  return flavor === "retail" ? ["2v2", "3v3", "rbg", "shuffle", "blitz"] : ["2v2", "3v3", "5v5", "rbg"];
}
