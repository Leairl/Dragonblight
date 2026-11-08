import React from "react";
import { ClassColor } from "../../helpers/classColorHelper";
import { getFlavor, wowheadUrl } from "../../helpers/game-flavor";
import { SpecProfile, spellIdsFor } from "../../helpers/composition-score";

interface Token {
  text: string;
  className?: string; //set for a spec name, to color it
  spellId?: number; //set for a spell name, to link its Wowhead tooltip
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

//Splits a score sentence into plain text, spec names and spell names. Longer names are matched first, and only
//as whole words, so "Blinding Light" is never cut short to "Blind" and "Polymorphs" stays plain text.
function tokenize(text: string, specs: SpecProfile[], spellIds: Record<string, number>): Token[] {
  const specClass = new Map<string, string>();
  for (const spec of specs) {
    specClass.set(`${spec.specName} ${spec.className}`, spec.className);
  }
  const names = [...specClass.keys(), ...Object.keys(spellIds)].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`\\b(${names.map(escapeRegex).join("|")})\\b`, "g");
  //A spec is colored the first time it appears in the sentence, and plain after that
  const colored = new Set<string>();
  return text.split(pattern).filter((part) => part !== "").map((part) => {
    const className = specClass.get(part);
    if (className !== undefined) {
      if (colored.has(part)) {
        return { text: part };
      }
      colored.add(part);
      return { text: part, className };
    }
    const spellId = spellIds[part];
    if (spellId !== undefined) {
      return { text: part, spellId };
    }
    return { text: part };
  });
}

//The page calls $WowheadPower.refreshLinks() after rendering, which attaches the tooltips to the links.
const RichText: React.FC<{ text: string; specs: SpecProfile[] }> = (props) => {
  const spellIds = spellIdsFor(getFlavor());
  return (
    <>
      {tokenize(props.text, props.specs, spellIds).map((token, index) => {
        if (token.className !== undefined) {
          return <span key={index} className="font-semibold" style={{ color: ClassColor.get(token.className) }}>{token.text}</span>;
        }
        if (token.spellId !== undefined) {
          return (
            <a
              key={`${index}-${token.spellId}`}
              href={wowheadUrl(`spell=${token.spellId}`)}
              target="_blank"
              rel="noopener noreferrer"
              data-wh-icon-size="tiny"
              className="font-semibold"
            >
              {token.text}
            </a>
          );
        }
        return <React.Fragment key={index}>{token.text}</React.Fragment>;
      })}
    </>
  );
};

export default RichText;
