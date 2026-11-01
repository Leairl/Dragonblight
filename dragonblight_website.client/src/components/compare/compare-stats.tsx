import React, { FC, useEffect, useState } from "react";
import { Callout, Card, Skeleton, Text } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Dragonblight } from "../../clients/Dragonblight";
import { getFlavor } from "../../helpers/game-flavor";
import { useItemLevelMode } from "../../helpers/itemLevelMode";
import ItemLevelToggle from "../item-level-toggle/item-level-toggle";
import { getPvpGearGain, PvpGearGain, pvpSheet } from "../../helpers/pvpStats";

//The two characters' character sheets side by side, one row per stat, with the difference on the
//right the way the equipment tab shows an item level difference.
//
//Blizzard reports the character sheet outside PvP. In PvP mode each side's sheet is the estimate
//pvpStats.ts builds from the gear's PvP item levels, marked as approximate.

export interface StatSide {
  region: string;
  server: string;
  name: string;
  displayName?: string;
}

interface CompareStatsProps {
  left: StatSide;
  right: StatSide;
  //average item level in the page's PvE / PvP mode, worked out by the page
  leftItemLevel?: number;
  rightItemLevel?: number;
  //each side's gear and its PvP item levels, for the PvP sheet
  leftEquipment?: Dragonblight.CharacterEquipmentSummary;
  rightEquipment?: Dragonblight.CharacterEquipmentSummary;
  leftPvpLevels?: Map<Dragonblight.EquippedItem, number>;
  rightPvpLevels?: Map<Dragonblight.EquippedItem, number>;
}

type Stats = Dragonblight.CharacterStatisticsSummary;

interface StatRow {
  label: string;
  value: (s: Stats) => number | undefined;
  format: (v: number) => string;
  //the rating behind a percentage, shown small beside it
  rating?: (s: Stats) => number | undefined;
}

//character sheets for the visit, so flipping tabs does not fetch them again
const sheets = new Map<string, Promise<Stats>>();
function loadStats(side: StatSide) {
  const key = `${side.region}/${side.server}/${side.name}`;
  let p = sheets.get(key);
  if (!p) {
    p = new Dragonblight.StatClient().getCharacterStats(side.server.replace(" ", "-"), side.name, side.region);
    p.catch(() => sheets.delete(key));
    sheets.set(key, p);
  }
  return p;
}

const ratingOf = (s: { rating?: number; rating_normalized?: number } | undefined) =>
  s?.rating_normalized ?? s?.rating;
const pct = (v: number) => `${v.toFixed(2)}%`;
const whole = (v: number) => Math.round(v).toLocaleString("en-US");
const thousands = (v: number) => `${(v / 1000).toFixed(0)}K`;

//which primary stat the class uses: the one the character sheet has raised above its base
function primaryOf(s: Stats | undefined): "strength" | "agility" | "intellect" {
  const gain = (k: "strength" | "agility" | "intellect") => (s?.[k]?.effective ?? 0) - (s?.[k]?.base ?? 0);
  return (["strength", "agility", "intellect"] as const).reduce((a, b) => (gain(b) > gain(a) ? b : a));
}

const CompareStats: FC<CompareStatsProps> = (props) => {
  const retail = getFlavor() === "retail";
  const [ilvlMode] = useItemLevelMode();
  const pairKey = [props.left, props.right].map((s) => `${s.region}/${s.server}/${s.name}`).join("|");
  const [data, setData] = useState<{ key: string; stats?: [Stats, Stats]; failed?: boolean }>({ key: "" });
  const { region: lr, server: ls, name: ln } = props.left;
  const { region: rr, server: rs, name: rn } = props.right;
  const pvpMode = retail && ilvlMode == "pvp";
  //what each side's gear gains in PvP, tagged with the gear it was worked out for
  const [gains, setGains] = useState<{ left: unknown; right: unknown; value: [PvpGearGain, PvpGearGain] }>();
  const { leftEquipment, rightEquipment, leftPvpLevels, rightPvpLevels } = props;
  useEffect(() => {
    if (!pvpMode || !leftEquipment || !rightEquipment || !leftPvpLevels || !rightPvpLevels) return;
    let cancelled = false;
    Promise.all([getPvpGearGain(leftEquipment, leftPvpLevels), getPvpGearGain(rightEquipment, rightPvpLevels)]).then(
      (value) => !cancelled && setGains({ left: leftEquipment, right: rightEquipment, value })
    );
    return () => {
      cancelled = true;
    };
  }, [pvpMode, leftEquipment, rightEquipment, leftPvpLevels, rightPvpLevels]);
  const gainsReady = gains != undefined && gains.left === leftEquipment && gains.right === rightEquipment;

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadStats({ region: lr, server: ls, name: ln }), loadStats({ region: rr, server: rs, name: rn })])
      .then((v) => !cancelled && setData({ key: pairKey, stats: v }))
      .catch(() => !cancelled && setData({ key: pairKey, failed: true }));
    return () => {
      cancelled = true;
    };
  }, [pairKey, lr, ls, ln, rr, rs, rn]);

  if (data.key == pairKey && data.failed) {
    return (
      <Callout.Root color="gray">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>Stats could not be loaded. Try again in a moment.</Callout.Text>
      </Callout.Root>
    );
  }
  const [sheetL, sheetR] = data.key == pairKey && data.stats ? data.stats : [undefined, undefined];
  //in PvP mode, the estimated PvP sheets once the gear gains are worked out; until then, nothing,
  //so the rows show as loading rather than flashing the sheet outside PvP first
  const [l, r] =
    !pvpMode
      ? [sheetL, sheetR]
      : sheetL && sheetR && gainsReady
        ? [pvpSheet(sheetL, leftEquipment, gains!.value[0]), pvpSheet(sheetR, rightEquipment, gains!.value[1])]
        : [undefined, undefined];
  const primary = primaryOf(l ?? r);
  const primaryLabel = primary.charAt(0).toUpperCase() + primary.slice(1);

  const sections: { title: string; rows: StatRow[] }[] = [
    {
      title: "General",
      rows: [
        { label: "Health", value: (s) => s.health, format: thousands },
        {
          label: ilvlMode == "pvp" && retail ? "PvP item level" : "Item level",
          value: (s) => (s === l ? props.leftItemLevel : props.rightItemLevel),
          format: whole,
        },
      ],
    },
    {
      title: "Attributes",
      rows: [
        { label: primaryLabel, value: (s) => s[primary]?.effective, format: whole },
        { label: "Stamina", value: (s) => s.stamina?.effective, format: whole },
        { label: "Armor", value: (s) => s.armor?.effective, format: whole },
      ],
    },
    retail
      ? {
          title: "Secondary",
          rows: [
            { label: "Critical Strike", value: (s) => s.melee_crit?.value, format: pct, rating: (s) => ratingOf(s.melee_crit) },
            { label: "Haste", value: (s) => s.melee_haste?.value, format: pct, rating: (s) => ratingOf(s.melee_haste) },
            { label: "Mastery", value: (s) => s.mastery?.value, format: pct, rating: (s) => ratingOf(s.mastery) },
            { label: "Versatility", value: (s) => s.versatility_damage_done_bonus, format: pct, rating: (s) => s.versatility },
            { label: "Leech", value: (s) => s.lifesteal?.value, format: pct, rating: (s) => ratingOf(s.lifesteal) },
            { label: "Avoidance", value: (s) => s.avoidance?.rating_bonus, format: pct, rating: (s) => ratingOf(s.avoidance) },
            { label: "Speed", value: (s) => s.speed?.rating_bonus, format: pct, rating: (s) => ratingOf(s.speed) },
          ],
        }
      : {
          //MoP keeps melee and spell crit and haste apart
          title: "Secondary",
          rows: [
            { label: "Melee Crit", value: (s) => s.melee_crit?.value, format: pct, rating: (s) => ratingOf(s.melee_crit) },
            { label: "Melee Haste", value: (s) => s.melee_haste?.value, format: pct, rating: (s) => ratingOf(s.melee_haste) },
            { label: "Spell Crit", value: (s) => s.spell_crit?.value, format: pct, rating: (s) => ratingOf(s.spell_crit) },
            { label: "Spell Haste", value: (s) => s.spell_haste?.value, format: pct, rating: (s) => ratingOf(s.spell_haste) },
            { label: "Mastery", value: (s) => s.mastery?.value, format: pct, rating: (s) => ratingOf(s.mastery) },
          ],
        },
    {
      title: "Offense",
      rows: [
        primary == "intellect"
          ? { label: "Spell Power", value: (s) => s.spell_power, format: whole }
          : { label: "Attack Power", value: (s) => s.attack_power, format: whole },
        { label: "Main Hand DPS", value: (s) => s.main_hand_dps, format: (v) => v.toFixed(1) },
      ],
    },
    {
      title: "Defense",
      rows: [
        { label: "Dodge", value: (s) => s.dodge?.value, format: pct },
        { label: "Parry", value: (s) => s.parry?.value, format: pct },
        { label: "Block", value: (s) => s.block?.value, format: pct },
      ],
    },
  ];

  return (
    <Card className="compare-diff border-card">
      <div className="diff-toolbar">
        <Text size="1" color="gray">
          {pvpMode
            ? "Estimated PvP stats, worked out from each item's PvP item level"
            : "Character sheet stats outside PvP, as Blizzard reports them"}
        </Text>
        <div className="grow" />
        <ItemLevelToggle />
      </div>
      {sections.map((section) => (
        <React.Fragment key={section.title}>
          <div className="talent-section-head talent-section-head-bar">
            <Text size="2" weight="bold">
              {section.title}
            </Text>
          </div>
          {section.rows.map((row) => statRow(row))}
        </React.Fragment>
      ))}
    </Card>
  );

  function statRow(row: StatRow) {
    if (!l || !r) {
      return (
        <div key={row.label} className="diff-row">
          <div className="diff-slot">{row.label}</div>
          <div className="diff-cell">
            <span className="diff-marker" />
            <Skeleton width="80px" height="14px" />
          </div>
          <div className="diff-cell">
            <span className="diff-marker" />
            <Skeleton width="80px" height="14px" />
          </div>
        </div>
      );
    }
    const a = row.value(l) ?? 0;
    const b = row.value(r) ?? 0;
    //a value not estimated for PvP (weapon DPS)
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      return (
        <div key={row.label} className="diff-row">
          <div className="diff-slot">{row.label}</div>
          <div className="diff-cell stat-cell" title="Not estimated for PvP">
            <span className="diff-marker" />
            <span className="stat-value diff-missing">—</span>
          </div>
          <div className="diff-cell stat-cell" title="Not estimated for PvP">
            <span className="diff-marker" />
            <span className="stat-value diff-missing">—</span>
          </div>
        </div>
      );
    }
    //differences too small to survive the formatting are no difference at all
    const changed = row.format(a) != row.format(b);
    const delta = b - a;
    return (
      <div key={row.label} className={changed ? "diff-row changed" : "diff-row"}>
        <div className="diff-slot">{row.label}</div>
        {statCell(row, l, a, changed, "del")}
        <div className={`diff-cell stat-cell ${changed ? "add" : ""}`}>
          <span className="diff-marker">{changed ? "+" : ""}</span>
          <span className="stat-value">{row.format(b)}</span>
          {row.rating && <span className="stat-rating">{whole(row.rating(r) ?? 0)}</span>}
          {changed && (
            <span className={`diff-delta ${delta > 0 ? "up" : "down"}`}>
              {delta > 0 ? "+" : "−"}
              {row.format(Math.abs(delta))}
            </span>
          )}
        </div>
      </div>
    );
  }

  function statCell(row: StatRow, s: Stats, v: number, changed: boolean, kind: "del" | "add") {
    return (
      <div className={`diff-cell stat-cell ${changed ? kind : ""}`}>
        <span className="diff-marker">{changed ? "−" : ""}</span>
        <span className="stat-value">{row.format(v)}</span>
        {row.rating && <span className="stat-rating">{whole(row.rating(s) ?? 0)}</span>}
      </div>
    );
  }
};

export default CompareStats;
