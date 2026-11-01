import React, { useEffect, useState } from 'react';
import { Button, Callout, SegmentedControl, Select, Text } from "@radix-ui/themes";
import { useSearchParams } from "react-router";
import { CheckIcon, CopyIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import './retail-talent-viewer.css';
import { Dragonblight } from "../../clients/Dragonblight";
import { ClassColor } from '../../helpers/classColorHelper';
import { wowheadUrl } from "../../helpers/game-flavor";
import TalentArrows, { TALENT_CELL, TALENT_ICON } from "./talent-arrows";
import { capstoneNodeId, heroTreeOf, maxRankOf, normalizePicks, spellIdOf, splitTree } from "../compare/talent-diff";
declare const $WowheadPower: { refreshLinks: () => void };

// Retail talent panes, laid out the way Wowhead lays them out.
//
// Blizzard publishes each tree as a list of nodes, and every node carries the grid square it
// sits on (display_row / display_col) plus the node ids it unlocks. That is enough to place the
// icons and draw the lines between them, so nothing here is hardcoded per class - a new class or
// a reworked tree needs no change. The character's own picks come from a loadout, which names a
// node id and how many points went into it: the one they are playing by default, or any other
// saved loadout for the spec picked from the dropdown.
//
// MoP Classic has a fixed 6x3 grid per class and is handled by talent-viewer.tsx instead.

// spacing shared with the compare page; see talent-arrows.tsx
const CELL = TALENT_CELL;
const ICON = TALENT_ICON;

interface RetailTalentViewerProps {
  charName: string
  server: string
  region: string
  charClass: string
}

// Talent trees are static game data and the same for every character, so each spec's tree is
// fetched once per visit, however often the spec picker flips back to it.
const trees = new Map<string, Promise<Dragonblight.TalentTree>>();
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

const RetailTalentViewer: React.FC<RetailTalentViewerProps> = (props) => {
  const [talents, setTalents] = useState<Dragonblight.CharacterSpecializationsSummary>();
  const [summaryLoading, setSummaryLoading] = useState<boolean>(true);
  // the tree for the spec on screen, tagged with that spec so a slow answer for a spec the user
  // has already left is not drawn
  const [tree, setTree] = useState<{ specId: number; tree?: Dragonblight.TalentTree; failed?: boolean }>();
  // the saved loadout picked from the dropdown, for the spec it was picked in; otherwise the
  // spec's loadout in use is shown
  const [picked, setPicked] = useState<{ specId: number; index: number }>();
  const [copied, setCopied] = useState(false);
  // the spec on screen lives in the url (?spec=261), so a link opens on it
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    Load();
  }, []);

  // Blizzard's talent data holds every spec the character has played, each with its saved
  // loadouts, so any of them can be shown without another request.
  const specs = (talents?.specializations ?? []).filter(s => (s.loadouts?.length ?? 0) > 0);
  const activeSpecId = talents?.active_specialization?.id;
  const urlSpec = Number(params.get("spec")) || undefined;
  const specId = specs.some(s => s.specialization?.id === urlSpec)
    ? urlSpec
    : specs.some(s => s.specialization?.id === activeSpecId) ? activeSpecId : specs[0]?.specialization?.id;

  useEffect(() => {
    if (specId == undefined) { return; }
    let cancelled = false;
    loadTree(specId, props.region)
      .then(t => { if (!cancelled) setTree({ specId, tree: t }); })
      .catch(() => { if (!cancelled) setTree({ specId, failed: true }); });
    return () => { cancelled = true; };
  }, [specId, props.region]);

  const loading = summaryLoading || (specId != undefined && tree?.specId !== specId);

  // Wowhead's script turns the links into icons and attaches the tooltips, and only looks at
  // the document when told to, so it has to run after each render that adds nodes.
  useEffect(() => {
    if (!loading) {
      $WowheadPower.refreshLinks();
    }
  });

  function pickSpec(id: number) {
    setParams(prev => {
      const next = new URLSearchParams(prev);
      if (id === activeSpecId) next.delete("spec"); else next.set("spec", String(id));
      return next;
    }, { replace: true });
  }

  if (loading) {
    return (
      <div className="grid min-h-[250px] w-full place-items-center p-6">
        <svg className="w-16 h-16 animate-spin text-gray-900/50" viewBox="0 0 64 64" fill="none"
          xmlns="http://www.w3.org/2000/svg" width="24" height="24">
          <circle cx="32" cy="32" r="29" stroke="currentColor" strokeWidth="5" />
          <path d="M32 3C44.5 3 55.5 11 59.5 23" stroke="currentColor" strokeWidth="5"
            strokeLinecap="round" style={{ color: ClassColor.get(props.charClass ?? "black") }} />
        </svg>
      </div>
    );
  }

  const spec = specs.find(s => s.specialization?.id === specId);
  const loadouts = spec?.loadouts ?? [];
  const index = picked != undefined && picked.specId === specId ? picked.index : Math.max(0, loadouts.findIndex(l => l.is_active));
  const loadout = loadouts[index];
  const specTree = tree != undefined && tree.specId === specId ? tree.tree : undefined;
  if (tree != undefined && tree.specId === specId && tree.failed) {
    return (
      <Callout.Root color="red" className="m-3">
        <Callout.Icon><InfoCircledIcon /></Callout.Icon>
        <Callout.Text>The talent tree for this spec could not be loaded. Try again in a moment.</Callout.Text>
      </Callout.Root>
    );
  }
  if (specTree == undefined || loadout == undefined || specId == undefined) {
    return (
      <Callout.Root color="red" className="m-3">
        <Callout.Icon><InfoCircledIcon /></Callout.Icon>
        <Callout.Text>
          No talents reported for this character. Blizzard only returns a loadout once the
          character has logged in since its talents were last changed.
        </Callout.Text>
      </Callout.Root>
    );
  }

  // A loadout names its hero talents by node rather than by hero tree, so the tree is the one
  // its nodes belong to - which also works for saved loadouts on a different hero tree.
  const heroTree = heroTreeOf(specTree, loadout.selected_hero_talents);
  const { classNodes, specNodes } = splitTree(specTree);
  const className = specTree.playable_class?.name ?? props.charClass;
  const specName = specTree.playable_specialization?.name ?? spec?.specialization?.name ?? "";
  const specIcon = (name: string) => `/Specs/${name.toLowerCase()}_${className.toLowerCase()}.png`;

  return (
    <div className="retailTalentViewer">
      <div className="retailTalentToolbar">
        {specs.length > 1 ? (
          <SegmentedControl.Root size="1" value={String(specId)} onValueChange={v => pickSpec(Number(v))}>
            {specs.map(s => (
              <SegmentedControl.Item key={s.specialization!.id} value={String(s.specialization!.id)}>
                <span className="flex items-center gap-1"
                  title={s.specialization!.id === activeSpecId ? "The spec they logged out as" : undefined}>
                  <img src={specIcon(s.specialization?.name ?? "")} width="16" height="16" alt="" />
                  {s.specialization?.name}
                  {s.specialization!.id === activeSpecId && <span className="retailTalentCurrentDot" />}
                </span>
              </SegmentedControl.Item>
            ))}
          </SegmentedControl.Root>
        ) : (
          <>
            <img src={specIcon(specName)} width="24" height="24" alt="" />
            <Text size="3" weight="bold">{specName}</Text>
          </>
        )}
        <div className="grow" />
        {loadouts.length > 1 && (
          <Select.Root size="1" value={String(index)} onValueChange={v => setPicked({ specId, index: Number(v) })}>
            <Select.Trigger variant="soft" color="gray" />
            <Select.Content>
              {loadouts.map((l, i) => (
                <Select.Item key={i} value={String(i)}>
                  Loadout {i + 1}{l.is_active ? " (current)" : ""}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        )}
        {loadout.talent_loadout_code && (
          <Button size="1" variant="soft" color="gray" title="Copy talent import string"
            onClick={() => {
              navigator.clipboard?.writeText(loadout.talent_loadout_code!).then(() => setCopied(true)).catch(() => undefined);
              setTimeout(() => setCopied(false), 1500);
            }}>
            {copied ? <CheckIcon /> : <CopyIcon />} Import string
          </Button>
        )}
      </div>
      {/* class, then hero, then spec - the order the in-game talent screen puts them in */}
      <div className="retailTalentTrees">
        {Panel(className, classNodes, loadout.selected_class_talents)}
        {Panel(heroTree?.name ?? "Hero", heroTree?.hero_talent_nodes, loadout.selected_hero_talents)}
        {Panel(specName || "Specialization", specNodes, loadout.selected_spec_talents, capstoneNodeId(specNodes))}
      </div>
    </div>
  );

  // One tree: its nodes placed on the grid Blizzard gives them, with the arrows between them,
  // under a heading that sits level with the other trees' headings.
  // `capstoneId` is the spec tree's capstone, which takes more points than Blizzard publishes
  function Panel(title: string, all?: Dragonblight.TalentNode[], loadoutPicks?: Dragonblight.LoadoutTalent[], capstoneId?: number) {
    // A handful of nodes are published with no talent on them at all, out at the edge of a tree.
    // They have nothing to draw, and counted in they would pad the panel with empty columns.
    const nodes = all?.filter(n => spellIdOf(n) != undefined);
    if (nodes == undefined || nodes.length === 0) { return null; }
    // one pick per node: a capstone's several entries summed, and the free nodes saved loadouts
    // leave out added back
    const picks = normalizePicks(nodes, loadoutPicks);

    // Rows and columns are absolute across the whole talent screen - the spec tree starts at
    // column 15, not column 1 - so each panel is shifted back to its own top-left corner.
    // Gaps inside a tree are left alone, because they are part of its shape.
    const minRow = Math.min(...nodes.map(n => n.display_row));
    const minCol = Math.min(...nodes.map(n => n.display_col));
    const width = (Math.max(...nodes.map(n => n.display_col)) - minCol) * CELL + ICON;
    const height = (Math.max(...nodes.map(n => n.display_row)) - minRow) * CELL + ICON;

    const x = (n: Dragonblight.TalentNode) => (n.display_col - minCol) * CELL;
    const y = (n: Dragonblight.TalentNode) => (n.display_row - minRow) * CELL;
    const pickOf = (n: Dragonblight.TalentNode) => picks?.find(p => p.id === n.id);
    // points the character spent. Free points are left out, since saved loadouts list them only
    // sometimes and the count would otherwise shift by one between loadouts.
    const spent = nodes.reduce((t, n) => {
      const pick = pickOf(n);
      return pick ? t + Math.max(0, pick.rank - (n.ranks?.[0]?.default_points ?? 0)) : t;
    }, 0);

    return (
      <div className="retailTalentPanel">
        <div className="retailTalentPanelHead">
          <Text size="2" weight="bold">{title}</Text>
          <Text size="1" color="gray">{spent} points</Text>
        </div>
        <div className="retailTalentPanelBody">
          <div className="retailTalentGrid" style={{ width, height }}>
            <TalentArrows width={width} height={height} icon={ICON}
              arrows={nodes.flatMap(from => (from.unlocks ?? []).flatMap(id => {
                const to = nodes.find(n => n.id === id);
                // a tree's outermost nodes unlock gates in the next tree, which this panel has no
                // position for, so those edges are simply not drawn
                if (to == undefined) { return []; }
                const taken = pickOf(from) != undefined && pickOf(to) != undefined;
                return [{
                  key: `${from.id}-${id}`,
                  x1: x(from) + ICON / 2, y1: y(from) + ICON / 2,
                  x2: x(to) + ICON / 2, y2: y(to) + ICON / 2,
                  kind: taken ? "taken" as const : "untaken" as const,
                }];
              }))} />
            {nodes.map(node => Node(node, pickOf(node), x(node), y(node), maxRankOf(node, capstoneId)))}
          </div>
        </div>
      </div>
    );
  }

  // One node: a Wowhead link that their script turns into an icon with a tooltip on hover,
  // greyed out when the character did not take it, with its points in the corner.
  function Node(node: Dragonblight.TalentNode, pick: Dragonblight.LoadoutTalent | undefined, left: number, top: number, maxRank: number) {
    const spellId = spellIdOf(node, pick);

    return (
      <div key={node.id} className="retailTalentNode" data-taken={pick != undefined ? "true" : "false"}
        style={{ left, top }}>
        {/* keyed by spell: Wowhead draws an icon into a link once and never redraws it, so a
            choice node showing a different talent in another loadout needs a new link */}
        {spellId != undefined && (
          <a key={spellId} className="retailTalentIcon" href={wowheadUrl(`spell=${spellId}`)} data-wh-rename-link="false"></a>
        )}
        {maxRank > 1 && (
          <span className="retailTalentRank">{(pick?.rank ?? 0)}/{maxRank}</span>
        )}
      </div>
    );
  }

  // the character's talents for every spec; each spec's tree is loaded once it is on screen
  async function Load() {
    setSummaryLoading(true);
    try {
      setTalents(await new Dragonblight.TalentClient().getCharacterTalents(props.server, props.charName, props.region));
    } catch {
      setTalents(undefined);
    }
    setSummaryLoading(false);
  }
};

export default RetailTalentViewer;
