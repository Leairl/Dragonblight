import { FC, ReactNode } from "react";
import { Callout, SegmentedControl, Text } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Dragonblight } from "../../clients/Dragonblight";
import { wowheadUrl } from "../../helpers/game-flavor";
import { CompareSide } from "./talent-data";
import { SlotDiff, SlotPick, slotChangeCount, SpecOption } from "./talent-diff";

//The pieces the talents and glyphs tabs have in common.

export const CompareNotice: FC<{ text: string }> = ({ text }) => (
  <Callout.Root color="gray">
    <Callout.Icon>
      <InfoCircledIcon />
    </Callout.Icon>
    <Callout.Text>{text}</Callout.Text>
  </Callout.Root>
);

export const TalentLink: FC<{ spellId?: number; name?: string }> = ({ spellId, name }) => (
  <a className="talent-change-link" href={wowheadUrl(`spell=${spellId}`)} data-wh-rename-link="false">
    {name}
  </a>
);

export const SpecPicker: FC<{
  options: SpecOption[];
  specId?: number;
  className?: string;
  onChange: (specId: number) => void;
}> = ({ options, specId, className, onChange }) => (
  <SegmentedControl.Root size="1" value={String(specId)} onValueChange={(v) => onChange(Number(v))}>
    {options.map((o) => (
      <SegmentedControl.Item key={o.id} value={String(o.id)}>
        <span className="flex items-center gap-1">
          <img src={`/Specs/${o.name.toLowerCase()}_${className?.toLowerCase()}.png`} width="16" height="16" />
          {o.name}
        </span>
      </SegmentedControl.Item>
    ))}
  </SegmentedControl.Root>
);

//who is on this side, and a note when the spec being compared is not the one they logged out as
export const SideHeader: FC<{
  kind: "del" | "add";
  side: CompareSide;
  spec: Dragonblight.CharacterSpecialization | undefined;
  isActiveSpec: boolean;
  summary: Dragonblight.CharacterSpecializationsSummary | undefined;
  children?: ReactNode;
}> = ({ kind, side, spec, isActiveSpec, summary, children }) => (
  <div className={`talent-side ${kind}`}>
    <span className="diff-marker">{kind == "del" ? "−" : "+"}</span>
    <div className="min-w-0 grow">
      <Text size="2" weight="bold" className="block truncate">
        {side.displayName ?? side.name}
      </Text>
      {!isActiveSpec && (
        <Text size="1" color="gray" className="block">
          Logged out as {summary?.active_specialization?.name}, showing their {spec?.specialization?.name}
        </Text>
      )}
    </div>
    {children}
  </div>
);

const SlotCell: FC<{ picks: SlotPick[]; changed: boolean; kind: "del" | "add" }> = ({ picks, changed, kind }) => (
  <div className={`diff-cell ${changed ? kind : ""}`}>
    <span className="diff-marker">{changed ? (kind == "del" ? "−" : "+") : ""}</span>
    <div className="talent-pvp-list">
      {picks.length == 0 && <span className="diff-missing">None selected</span>}
      {picks.map((p) => (
        <span key={p.id} className={p.changed ? "hl" : ""}>
          {p.spellId == undefined ? p.name : <TalentLink spellId={p.spellId} name={p.name} />}
        </span>
      ))}
    </div>
  </div>
);

//Picks that fit any slot as a split row, like an equipment slot
export const SlotRow: FC<{ label: string; diff: SlotDiff }> = ({ label, diff }) => {
  const changed = slotChangeCount(diff) > 0;
  return (
    <div className={changed ? "diff-row changed" : "diff-row"}>
      <div className="diff-slot">{label}</div>
      <SlotCell picks={diff.left} changed={changed} kind="del" />
      <SlotCell picks={diff.right} changed={changed} kind="add" />
    </div>
  );
};
