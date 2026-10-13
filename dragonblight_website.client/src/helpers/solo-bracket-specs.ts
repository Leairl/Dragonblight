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
