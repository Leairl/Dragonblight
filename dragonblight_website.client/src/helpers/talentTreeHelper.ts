import { Dragonblight } from "../clients/Dragonblight";

//Talent trees are static game data and the same for every character, so each spec's tree is
//fetched once per visit, whichever page or tab asks for it. A failed fetch is forgotten so the
//next request tries again.
const trees = new Map<string, Promise<Dragonblight.TalentTree>>();

export function loadTree(specId: number, region: string) {
  const key = `${specId}/${region}`;
  let p = trees.get(key);
  if (!p) {
    p = new Dragonblight.TalentClient().getTalentTree(specId, region);
    p.catch(() => trees.delete(key));
    trees.set(key, p);
  }
  return p;
}
