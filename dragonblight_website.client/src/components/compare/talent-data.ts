import { useEffect, useState } from "react";
import { Dragonblight } from "../../clients/Dragonblight";

type Summary = Dragonblight.CharacterSpecializationsSummary;

export interface CompareSide {
  region: string;
  server: string;
  name: string;
  className?: string;
  displayName?: string;
}

//Talent summaries are kept for the visit, so flipping between tabs does not fetch them again.
const summaries = new Map<string, Promise<Summary>>();

function loadSummary(region: string, server: string, name: string) {
  const key = `${region}/${server}/${name}`;
  let p = summaries.get(key);
  if (!p) {
    p = new Dragonblight.TalentClient().getCharacterTalents(server.replace(" ", "-"), name, region);
    p.catch(() => summaries.delete(key));
    summaries.set(key, p);
  }
  return p;
}

//Both characters' specializations summaries: talents and glyphs both come from this one call.
export function useTalentSummaries(left: CompareSide, right: CompareSide) {
  const { region: lRegion, server: lServer, name: lName } = left;
  const { region: rRegion, server: rServer, name: rName } = right;
  const pairKey = `${lRegion}/${lServer}/${lName}|${rRegion}/${rServer}/${rName}`;
  const [state, setState] = useState<{ key: string; value?: [Summary, Summary]; failed?: boolean }>({ key: "" });

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadSummary(lRegion, lServer, lName), loadSummary(rRegion, rServer, rName)])
      .then((v) => !cancelled && setState({ key: pairKey, value: v }))
      .catch(() => !cancelled && setState({ key: pairKey, failed: true }));
    return () => {
      cancelled = true;
    };
  }, [pairKey, lRegion, lServer, lName, rRegion, rServer, rName]);

  const current = state.key == pairKey ? state : undefined;
  return {
    leftSummary: current?.value?.[0],
    rightSummary: current?.value?.[1],
    loading: current == undefined,
    failed: current?.failed ?? false,
  };
}
