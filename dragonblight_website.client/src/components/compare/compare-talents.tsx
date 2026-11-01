import { FC, useEffect, useState } from "react";
import { Button, Callout, Card, Select, SegmentedControl, Skeleton, Text } from "@radix-ui/themes";
import { InfoCircledIcon, CopyIcon, CheckIcon } from "@radix-ui/react-icons";
import { Dragonblight } from "../../clients/Dragonblight";
import { getFlavor, wowheadUrl } from "../../helpers/game-flavor";
import {
  commonSpecs,
  defaultLoadout,
  defaultSpec,
  diffClassic,
  diffPvp,
  diffTree,
  findSpec,
  capstoneNodeId,
  heroTreeOf,
  NodeDiff,
  PvpPick,
  spellIdOf,
  splitTree,
  TreeDiff,
} from "./talent-diff";
import "../retail-talent-viewer/retail-talent-viewer.css";
import TalentArrows, { ArrowKind, TALENT_CELL, TALENT_ICON } from "../retail-talent-viewer/talent-arrows";
declare const $WowheadPower: { refreshLinks: () => void };

//grid spacing and icon size, shared with the profile's retail talent viewer
const CELL = TALENT_CELL;
const ICON = TALENT_ICON;

export interface CompareSide {
  region: string;
  server: string;
  name: string;
  className?: string;
  displayName?: string;
}

interface CompareTalentsProps {
  left: CompareSide;
  right: CompareSide;
  //the spec in the url, if one was picked
  specId?: number;
  onSpecChange: (specId: number) => void;
}

//Talent summaries and trees are kept for the visit, so flipping between the equipment and
//talents tabs does not fetch them again.
const summaries = new Map<string, Promise<Dragonblight.CharacterSpecializationsSummary>>();
const trees = new Map<string, Promise<Dragonblight.TalentTree>>();

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

function loadTree(specId: number, region: string) {
  const key = `${specId}/${region}`;
  let p = trees.get(key);
  if (!p) {
    p = new Dragonblight.TalentClient().getTalentTree(specId, region);
    p.catch(() => trees.delete(key));
    trees.set(key, p);
  }
  return p;
}

interface Loaded<T> {
  key: string;
  value?: T;
  failed?: boolean;
}

const CompareTalents: FC<CompareTalentsProps> = (props) => {
  const isRetail = getFlavor() === "retail";
  const { region: lRegion, server: lServer, name: lName } = props.left;
  const { region: rRegion, server: rServer, name: rName } = props.right;
  const pairKey = `${lRegion}/${lServer}/${lName}|${rRegion}/${rServer}/${rName}`;
  const [talents, setTalents] = useState<Loaded<[Dragonblight.CharacterSpecializationsSummary, Dragonblight.CharacterSpecializationsSummary]>>({ key: "" });
  const [tree, setTree] = useState<Loaded<Dragonblight.TalentTree>>({ key: "" });
  //loadouts picked by hand, for the spec they were picked in
  const [picked, setPicked] = useState<{ spec?: number; left?: number; right?: number }>({});
  const [copied, setCopied] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadSummary(lRegion, lServer, lName), loadSummary(rRegion, rServer, rName)])
      .then((v) => !cancelled && setTalents({ key: pairKey, value: v }))
      .catch(() => !cancelled && setTalents({ key: pairKey, failed: true }));
    return () => {
      cancelled = true;
    };
  }, [pairKey, lRegion, lServer, lName, rRegion, rServer, rName]);

  const [leftSummary, rightSummary] = talents.key == pairKey ? talents.value ?? [] : [];
  const options = commonSpecs(leftSummary, rightSummary);
  const specId = options.some((o) => o.id == props.specId) ? props.specId : defaultSpec(options);
  const leftSpec = findSpec(leftSummary, specId);
  const rightSpec = findSpec(rightSummary, specId);
  const leftLoadoutIndex = picked.spec == specId && picked.left != undefined ? picked.left : defaultLoadout(leftSpec);
  const rightLoadoutIndex = picked.spec == specId && picked.right != undefined ? picked.right : defaultLoadout(rightSpec);
  const leftLoadout = leftSpec?.loadouts?.[leftLoadoutIndex];
  const rightLoadout = rightSpec?.loadouts?.[rightLoadoutIndex];

  const treeKey = `${specId}/${lRegion}`;
  useEffect(() => {
    if (!isRetail || specId == undefined) return;
    let cancelled = false;
    loadTree(specId, lRegion)
      .then((t) => !cancelled && setTree({ key: treeKey, value: t }))
      .catch(() => !cancelled && setTree({ key: treeKey, failed: true }));
    return () => {
      cancelled = true;
    };
  }, [treeKey, isRetail, specId, lRegion]);
  const talentTree = tree.key == treeKey ? tree.value : undefined;

  const retail = (() => {
    if (!talentTree || !leftLoadout || !rightLoadout) return undefined;
    const { classNodes, specNodes } = splitTree(talentTree);
    const leftHero = heroTreeOf(talentTree, leftLoadout.selected_hero_talents);
    const rightHero = heroTreeOf(talentTree, rightLoadout.selected_hero_talents);
    const sameHero = leftHero?.id == rightHero?.id;
    return {
      classDiff: diffTree(talentTree.playable_class?.name ?? "Class", classNodes, leftLoadout.selected_class_talents, rightLoadout.selected_class_talents),
      specDiff: diffTree(
        talentTree.playable_specialization?.name ?? "Specialization",
        specNodes,
        leftLoadout.selected_spec_talents,
        rightLoadout.selected_spec_talents,
        capstoneNodeId(specNodes)
      ),
      leftHero,
      rightHero,
      sameHero,
      heroDiff: sameHero
        ? diffTree(leftHero?.name ?? "Hero", leftHero?.hero_talent_nodes, leftLoadout.selected_hero_talents, rightLoadout.selected_hero_talents)
        : undefined,
      leftHeroDiff: sameHero ? undefined : diffTree(leftHero?.name ?? "Hero", leftHero?.hero_talent_nodes, leftLoadout.selected_hero_talents, undefined),
      rightHeroDiff: sameHero ? undefined : diffTree(rightHero?.name ?? "Hero", rightHero?.hero_talent_nodes, undefined, rightLoadout.selected_hero_talents),
    };
  })();
  const pvp = diffPvp(leftSpec, rightSpec);
  const classic = isRetail ? undefined : diffClassic(leftSpec, rightSpec);

  const loading = talents.key != pairKey || (isRetail && specId != undefined && tree.key != treeKey);

  useEffect(() => {
    if (!loading) $WowheadPower.refreshLinks();
  });

  if (talents.key == pairKey && talents.failed) {
    return message("Talents could not be loaded. Try again in a moment.");
  }
  if (!loading && options.length == 0) {
    return message(
      `${props.left.displayName ?? props.left.name} and ${props.right.displayName ?? props.right.name} have no specialization in common with talents set. Blizzard only reports a spec's talents once the character has played it.`
    );
  }
  if (tree.key == treeKey && tree.failed) {
    return message("The talent tree for this spec could not be loaded. Try again in a moment.");
  }

  const changeCount = retail
    ? retail.classDiff.changes.length +
      retail.specDiff.changes.length +
      (retail.heroDiff?.changes.length ?? 0) +
      (retail.sameHero ? 0 : 1) +
      pvpChangeCount()
    : (classic?.filter((t) => t.changed).length ?? 0) + pvpChangeCount();
  const spec = options.find((o) => o.id == specId);

  return (
    <Card className="compare-diff border-card">
      <div className="diff-toolbar">
        {loading ? (
          <Skeleton width="320px" height="24px" />
        ) : (
          <SegmentedControl.Root size="1" value={String(specId)} onValueChange={(v) => props.onSpecChange(Number(v))}>
            {options.map((o) => (
              <SegmentedControl.Item key={o.id} value={String(o.id)}>
                <span className="flex items-center gap-1">
                  <img src={`/Specs/${o.name.toLowerCase()}_${props.left.className?.toLowerCase()}.png`} width="16" height="16" />
                  {o.name}
                </span>
              </SegmentedControl.Item>
            ))}
          </SegmentedControl.Root>
        )}
        <div className="grow" />
        {!loading && (
          <Text size="2">
            <b>{changeCount}</b> {changeCount == 1 ? "difference" : "differences"}
          </Text>
        )}
      </div>

      {!loading && spec && (
        <div className="talent-sides">
          {sideBar("del", props.left, leftSpec, leftLoadoutIndex, spec.leftActive, leftSummary, (i) =>
            setPicked({ spec: specId, left: i, right: rightLoadoutIndex })
          )}
          {sideBar("add", props.right, rightSpec, rightLoadoutIndex, spec.rightActive, rightSummary, (i) =>
            setPicked({ spec: specId, left: leftLoadoutIndex, right: i })
          )}
        </div>
      )}

      {loading ? (
        <div className="p-4">
          <Skeleton width="100%" height="320px" />
        </div>
      ) : retail ? (
        <>
          {treeSection(retail.classDiff)}
          {retail.sameHero ? (
            retail.heroDiff && treeSection(retail.heroDiff)
          ) : (
            <div className="talent-section">
              <div className="talent-section-head">
                <Text size="2" weight="bold">Hero talents</Text>
                <span className="talent-hero-swap">
                  <span className="del">− {retail.leftHero?.name ?? "None"}</span>
                  <span className="add">+ {retail.rightHero?.name ?? "None"}</span>
                </span>
              </div>
              <div className="talent-hero-pair">
                {retail.leftHeroDiff && treeGrid(retail.leftHeroDiff)}
                {retail.rightHeroDiff && treeGrid(retail.rightHeroDiff)}
              </div>
            </div>
          )}
          {treeSection(retail.specDiff)}
          {pvpSection()}
        </>
      ) : classic ? (
        <>
          <div className="talent-section-head talent-section-head-bar">
            <Text size="2" weight="bold">Talents</Text>
          </div>
          {classic.map((t) => (
            <div key={t.tier} className={t.changed ? "diff-row changed" : "diff-row"}>
              <div className="diff-slot">Level {t.level}</div>
              {classicCell(t.left, t.changed, "del")}
              {classicCell(t.right, t.changed, "add")}
            </div>
          ))}
          {pvpSection()}
        </>
      ) : (
        message("No talents reported for this spec.")
      )}
    </Card>
  );

  function pvpChangeCount() {
    //a talent swapped for another is one difference, not two
    return Math.max(pvp.right.filter((p) => p.changed).length, pvp.left.filter((p) => p.changed).length);
  }

  function message(text: string) {
    return (
      <Callout.Root color="gray">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>{text}</Callout.Text>
      </Callout.Root>
    );
  }

  //who is on this side, which of their saved loadouts is shown, and a note when the spec being
  //compared is not the one they logged out as
  function sideBar(
    kind: "del" | "add",
    side: CompareSide,
    spec: Dragonblight.CharacterSpecialization | undefined,
    index: number,
    isActiveSpec: boolean,
    summary: Dragonblight.CharacterSpecializationsSummary | undefined,
    onPick: (i: number) => void
  ) {
    const loadouts = spec?.loadouts ?? [];
    const code = loadouts[index]?.talent_loadout_code;
    return (
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
        {loadouts.length > 1 && (
          <Select.Root size="1" value={String(index)} onValueChange={(v) => onPick(Number(v))}>
            <Select.Trigger variant="soft" color="gray" />
            <Select.Content>
              {loadouts.map((l, i) => (
                <Select.Item key={i} value={String(i)}>
                  Loadout {i + 1}
                  {l.is_active ? " (current)" : ""}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        )}
        {code && (
          <Button
            className="ml-1"
            size="1"
            variant="ghost"
            color="gray"
            title="Copy talent import string"
            onClick={() => {
              navigator.clipboard?.writeText(code).then(() => setCopied(kind)).catch(() => undefined);
              setTimeout(() => setCopied(undefined), 1500);
            }}
          >
            {copied == kind ? <CheckIcon /> : <CopyIcon />}
          </Button>
        )}
      </div>
    );
  }

  function treeSection(diff: TreeDiff) {
    return (
      <div className="talent-section">
        <div className="talent-section-head">
          <Text size="2" weight="bold">{diff.title}</Text>
          <Text size="1" color="gray">
            {diff.changes.length == 0 ? "no differences" : `${diff.changes.length} ${diff.changes.length == 1 ? "difference" : "differences"}`}
          </Text>
        </div>
        <div className="talent-section-body">
          {treeGrid(diff)}
          {diff.changes.length > 0 && <div className="talent-changes">{diff.changes.map(changeLine)}</div>}
        </div>
      </div>
    );
  }

  //The tree once, with both characters' picks laid over it: red for a talent only the left took,
  //green for one only the right took, blue where both took the node but differently.
  function treeGrid(diff: TreeDiff) {
    const nodes = diff.nodes;
    if (nodes.length == 0) return null;
    const minRow = Math.min(...nodes.map((n) => n.node.display_row));
    const minCol = Math.min(...nodes.map((n) => n.node.display_col));
    const width = (Math.max(...nodes.map((n) => n.node.display_col)) - minCol) * CELL + ICON;
    const height = (Math.max(...nodes.map((n) => n.node.display_row)) - minRow) * CELL + ICON;
    const x = (d: NodeDiff) => (d.node.display_col - minCol) * CELL;
    const y = (d: NodeDiff) => (d.node.display_row - minRow) * CELL;
    const byId = new Map(nodes.map((d) => [d.node.id, d]));

    return (
      <div className="talent-diff-grid" style={{ width, height }}>
        {/* gold where both took the path, red or green where only one side did */}
        <TalentArrows
          width={width}
          height={height}
          icon={ICON}
          arrows={nodes.flatMap((from) =>
            (from.node.unlocks ?? []).flatMap((id) => {
              const to = byId.get(id);
              if (!to) return [];
              const l = from.left != undefined && to.left != undefined;
              const r = from.right != undefined && to.right != undefined;
              const kind: ArrowKind = l && r ? "taken" : l ? "del" : r ? "add" : "untaken";
              return [
                {
                  key: `${from.node.id}-${id}`,
                  x1: x(from) + ICON / 2,
                  y1: y(from) + ICON / 2,
                  x2: x(to) + ICON / 2,
                  y2: y(to) + ICON / 2,
                  kind,
                },
              ];
            })
          )}
        />
        {nodes.map((d) => (
          <div
            key={d.node.id}
            className="retailTalentNode talent-diff-node"
            data-state={d.state}
            style={{ left: x(d), top: y(d) }}
            title={nodeTitle(d)}
          >
            {/* keyed by spell: Wowhead draws an icon into a link once and never redraws it, so
                a node whose spell changes (another loadout, another choice) needs a new link */}
            {d.spellId != undefined && (
              <a
                key={d.spellId}
                className="retailTalentIcon"
                href={wowheadUrl(`spell=${d.spellId}`)}
                data-wh-rename-link="false"
              ></a>
            )}
            {d.maxRank > 1 && (
              <span className="retailTalentRank">
                {/* where the two sides spent different points - one of them possibly none - the
                    badge shows both, left then right */}
                {(d.left?.rank ?? 0) != (d.right?.rank ?? 0)
                  ? `${d.left?.rank ?? 0}→${d.right?.rank ?? 0}`
                  : `${(d.right ?? d.left)?.rank ?? 0}/${d.maxRank}`}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  function nodeTitle(d: NodeDiff) {
    const l = props.left.displayName ?? props.left.name;
    const r = props.right.displayName ?? props.right.name;
    switch (d.state) {
      case "del":
        return `Only ${l}`;
      case "add":
        return `Only ${r}`;
      case "mod":
        return `${l}: ${d.leftName} ${d.left?.rank}/${d.maxRank} · ${r}: ${d.rightName} ${d.right?.rank}/${d.maxRank}`;
      default:
        return undefined;
    }
  }

  function talentLink(spellId: number | undefined, name: string | undefined) {
    return (
      <a key={spellId} className="talent-change-link" href={wowheadUrl(`spell=${spellId}`)} data-wh-rename-link="false">
        {name}
      </a>
    );
  }

  //Points on each side and the difference, for a talent that takes more than one: "4/4 → 0/4 −4".
  //A side that did not take the talent counts as 0, so a talent only one side took reads the
  //same way as one both took at different ranks.
  function rankChange(d: NodeDiff) {
    const l = d.left?.rank ?? 0;
    const r = d.right?.rank ?? 0;
    if (d.maxRank <= 1 || l == r) return null;
    return (
      <span className="talent-change-rank">
        <span className="talent-change-del">{l}/{d.maxRank}</span>
        <span className="talent-change-arrow">→</span>
        <span className="talent-change-add">{r}/{d.maxRank}</span>
        <span className={`talent-change-delta ${r > l ? "up" : "down"}`}>
          {r > l ? "+" : "−"}
          {Math.abs(r - l)}
        </span>
      </span>
    );
  }

  function changeLine(d: NodeDiff) {
    if (d.state == "del") {
      return (
        <div key={d.node.id} className="talent-change del">
          <span className="diff-marker">−</span>
          {talentLink(d.spellId, d.leftName)}
          {rankChange(d)}
        </div>
      );
    }
    if (d.state == "add") {
      return (
        <div key={d.node.id} className="talent-change add">
          <span className="diff-marker">+</span>
          {talentLink(d.spellId, d.rightName)}
          {rankChange(d)}
        </div>
      );
    }
    //both took the node: either a different choice, or a different number of points
    const choiceChanged = d.left?.tooltip?.talent?.id != d.right?.tooltip?.talent?.id;
    return (
      <div key={d.node.id} className="talent-change mod">
        <span className="diff-marker">~</span>
        {choiceChanged ? (
          <>
            <span className="talent-change-del">{talentLink(spellIdOf(d.node, d.left), d.leftName)}</span>
            <span className="talent-change-arrow">→</span>
            <span className="talent-change-add">{talentLink(d.spellId, d.rightName)}</span>
          </>
        ) : (
          <>
            {talentLink(d.spellId, d.rightName)}
            {rankChange(d)}
          </>
        )}
      </div>
    );
  }

  //PvP talents as a split row, like an equipment slot; slots are interchangeable
  function pvpSection() {
    if (pvp.left.length == 0 && pvp.right.length == 0) return null;
    const changed = pvp.left.some((p) => p.changed) || pvp.right.some((p) => p.changed);
    return (
      <>
        <div className="talent-section-head talent-section-head-bar">
          <Text size="2" weight="bold">PvP talents</Text>
          <Text size="1" color="gray">
            {changed ? "" : "no differences"}
          </Text>
        </div>
        <div className={changed ? "diff-row changed" : "diff-row"}>
          <div className="diff-slot">PvP</div>
          {pvpCell(pvp.left, changed, "del")}
          {pvpCell(pvp.right, changed, "add")}
        </div>
      </>
    );
  }

  function pvpCell(picks: PvpPick[], changed: boolean, kind: "del" | "add") {
    return (
      <div className={`diff-cell ${changed ? kind : ""}`}>
        <span className="diff-marker">{changed ? (kind == "del" ? "−" : "+") : ""}</span>
        <div className="talent-pvp-list">
          {picks.length == 0 && <span className="diff-missing">None selected</span>}
          {picks.map((p) => (
            <span key={p.id} className={p.changed ? "hl" : ""}>
              {talentLink(p.spellId, p.name)}
            </span>
          ))}
        </div>
      </div>
    );
  }

  function classicCell(t: Dragonblight.TalentSelection | undefined, changed: boolean, kind: "del" | "add") {
    return (
      <div className={`diff-cell ${changed ? kind : ""}`}>
        <span className="diff-marker">{changed ? (kind == "del" ? "−" : "+") : ""}</span>
        {t ? (
          <span className={changed ? "hl" : ""}>{talentLink(t.spell_tooltip?.spell?.id, t.talent?.name)}</span>
        ) : (
          <span className="diff-missing">No talent</span>
        )}
      </div>
    );
  }
};

export default CompareTalents;
