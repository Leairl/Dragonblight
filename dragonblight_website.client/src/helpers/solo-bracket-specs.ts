import { Dragonblight } from "../clients/Dragonblight";

export interface SoloSpec {
  //Blizzard's ladder name, which is also the bracket the server syncs and the rankings URL uses
  slug: string;
  className: string;
  specName: string;
  //Blizzard's playable-specialization id, which is how a Blitz reward says which ladder it is for
  specId: number;
}

export let blitzSpecs: SoloSpec[] = [];
export let shuffleSpecs: SoloSpec[] = [];

export const defaultBlitzSpec = "blitz-overall";
export const defaultShuffleSpec = "shuffle-overall";

export const bracketLabels: Record<string, string> = {
  "2v2": "2v2",
  "3v3": "3v3",
  "5v5": "5v5",
  rbg: "RBG",
  shuffle: "Shuffle",
  blitz: "Blitz",
};

//Shuffle and Blitz have a ladder per spec, so their tabs show the overall ladder
export function bracketSlug(name: string): string {
  if (name == "shuffle") {
    return defaultShuffleSpec;
  }
  if (name == "blitz") {
    return defaultBlitzSpec;
  }
  return name;
}

export function isShuffleBracket(bracket: string | undefined): boolean {
  return bracket?.startsWith("shuffle") ?? false;
}
export function isBlitzBracket(bracket: string | undefined): boolean {
  return bracket?.startsWith("blitz") ?? false;
}
export function setShuffleSpecs(specs: SoloSpec[]): void {
  shuffleSpecs = specs;
}
export function setBlitzSpecs(specs: SoloSpec[]): void {
  blitzSpecs = specs;
}
//the spec's icon in /public/Specs, named the way the profile page already names them
export function SoloSpecIcon(spec: SoloSpec): string {
  if (spec.specName === "") {
    return 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
  }
  return `/Specs/${spec.specName.toLowerCase()}_${spec.className.toLowerCase()}.png`;
}
