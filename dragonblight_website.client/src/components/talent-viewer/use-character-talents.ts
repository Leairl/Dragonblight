import { useEffect, useState } from "react";
import { Dragonblight } from "../../clients/Dragonblight";
declare const $WowheadPower: { refreshLinks: () => void };

//loads a character's talents for the classic talent and glyph tabs, and has Wowhead pick up the
//links they render once loading finishes
export function useCharacterTalents(server: string, charName: string, region: string) {
  const [talents, setTalents] = useState<Dragonblight.CharacterSpecializationsSummary>();
  const [loading, setLoading] = useState<boolean>(true);
  useEffect(() => {
    LoadTalents();
  }, []);
  useEffect(() => {
    $WowheadPower.refreshLinks();
  }, [loading]);

  async function LoadTalents() {
    setLoading(true);
    const client = new Dragonblight.TalentClient();
    setTalents(await client.getCharacterTalents(server, charName, region));
    setTimeout(() => {
      setLoading(false);
    }, 300);
  }

  return { talents, loading };
}
