import { Dragonblight } from "../../clients/Dragonblight";
import Talents from "../../data/talent";

//Talent compare, kept free of React so it reads (and can be tested) on its own.
//
//Blizzard's specializations call returns every spec the character has set up, not only the one
//they logged out as, and each spec carries its saved loadouts with the one currently set for it
//marked is_active. So comparing Subtlety against a character who logged out as Assassination
//needs no extra request: their Subtlety loadouts are already in the same response.

type Summary = Dragonblight.CharacterSpecializationsSummary;
type Spec = Dragonblight.CharacterSpecialization;
type Pick = Dragonblight.LoadoutTalent;
type Node = Dragonblight.TalentNode;

export interface SpecOption {
  id: number;
  name: string;
  leftActive: boolean;
  rightActive: boolean;
}

//a spec only counts as set up when it has something to compare: a loadout on retail, talents on
//MoP Classic
function hasTalents(s: Spec): boolean {
  return (s.loadouts?.length ?? 0) > 0 || (s.talents?.length ?? 0) > 0;
}

export function findSpec(summary: Summary | undefined, specId: number | undefined): Spec | undefined {
  return summary?.specializations?.find((s) => s.specialization?.id == specId && hasTalents(s));
}

//the specs both characters have talents for, in the left character's order
export function commonSpecs(left: Summary | undefined, right: Summary | undefined): SpecOption[] {
  return (left?.specializations ?? [])
    .filter((s) => hasTalents(s) && findSpec(right, s.specialization?.id) != undefined)
    .map((s) => ({
      id: s.specialization!.id,
      name: s.specialization?.name ?? "",
      leftActive: left?.active_specialization?.id == s.specialization?.id,
      rightActive: right?.active_specialization?.id == s.specialization?.id,
    }));
}

//the left character's current spec when the right has it too, then the right's, then any shared one
export function defaultSpec(options: SpecOption[]): number | undefined {
  return (options.find((o) => o.leftActive) ?? options.find((o) => o.rightActive) ?? options[0])?.id;
}

//the loadout the character has set for the spec, which is what they would play on switching to it
export function defaultLoadout(spec: Spec | undefined): number {
  const i = spec?.loadouts?.findIndex((l) => l.is_active) ?? -1;
  return i < 0 ? 0 : i;
}

// --- retail trees ---------------------------------------------------------------------------

//Each spec tree ends in one capstone talent, alone on its bottom row (Ancient Arts for
//Subtlety, Implacable for Assassination - true of all 40 retail specs). It takes up to 4 points,
//but Blizzard publishes it with a single rank, both in the talent tree and on the talent itself,
//and Wowhead's tooltip does not say either, so the maximum is the one number supplied here.
//Loadouts do record the points spent - see normalizePicks for how.
export const CAPSTONE_RANKS = 4;

//the spec tree's capstone node: the only node on its bottom row
export function capstoneNodeId(specNodes: Node[] | undefined): number | undefined {
  const nodes = (specNodes ?? []).filter((n) => n.ranks?.length);
  if (nodes.length == 0) return undefined;
  const bottom = Math.max(...nodes.map((n) => n.display_row));
  const last = nodes.filter((n) => n.display_row == bottom);
  return last.length == 1 ? last[0].id : undefined;
}

//how many points a node takes
export function maxRankOf(node: Node, capstoneId?: number): number {
  const published = node.ranks?.length ?? 1;
  return node.id == capstoneId ? Math.max(published, CAPSTONE_RANKS) : published;
}

export type NodeState = "none" | "same" | "del" | "add" | "mod";

export interface NodeDiff {
  node: Node;
  left?: Pick;
  right?: Pick;
  state: NodeState;
  //the spell to draw: the side that took it, and for a changed choice the right's pick
  spellId?: number;
  leftName?: string;
  rightName?: string;
  maxRank: number;
}

export interface TreeDiff {
  title: string;
  nodes: NodeDiff[];
  changes: NodeDiff[];
}

function choiceOf(node: Node, pick: Pick | undefined): Dragonblight.TalentNodeTooltip | undefined {
  const rank = node.ranks?.[0];
  if (rank?.choice_of_tooltips?.length) {
    return rank.choice_of_tooltips.find((t) => t.talent?.id == pick?.tooltip?.talent?.id) ?? rank.choice_of_tooltips[0];
  }
  return rank?.tooltip;
}

//the pick's own spell first: it names the spell the character actually has, which is not always
//the one the static tree lists for that talent
export function spellIdOf(node: Node, pick?: Pick): number | undefined {
  return pick?.tooltip?.spell_tooltip?.spell?.id ?? choiceOf(node, pick)?.spell_tooltip?.spell?.id;
}

function nameOf(node: Node, pick: Pick | undefined): string | undefined {
  if (pick == undefined) return undefined;
  return pick.tooltip?.talent?.name ?? choiceOf(node, pick)?.talent?.name;
}

//A choice node is one talent out of two; the loadout names the one taken. Picking the other one,
//or spending a different number of points, is a change to a node both characters took.
function samePick(node: Node, l: Pick, r: Pick): boolean {
  const isChoice = (node.ranks?.[0]?.choice_of_tooltips?.length ?? 0) > 0;
  return l.rank == r.rank && (!isChoice || l.tooltip?.talent?.id == r.tooltip?.talent?.id);
}

//A loadout's picks, one per node, with everything the loadout data leaves implicit filled in.
//
//A capstone node is listed once per rank-spell, all under the same node id: Ancient Arts at 4/4
//comes back as three entries of rank 1, 2 and 1. Its points are their sum - checked against the
//import strings of every saved loadout of two characters across all three Rogue specs, where the
//sum matched on every node. Reading only the first entry is what showed every capstone as 1/4.
//The merged pick keeps the entry whose talent the tree lists for the node, so its icon and
//tooltip are the base talent's rather than one rank's add-on.
//
//Some nodes are free: the game grants them to everyone in the spec (default_points on the node),
//like the first node of each hero tree or a spec's starting class talent. Blizzard's saved
//loadouts leave them out - only the loadout a character is using right now sometimes lists them -
//so they are added back. Without this a free node shows as "removed" whenever one side's loadout
//happens to list it and the other's does not.
//
//`picks` undefined means the loadout does not use this tree at all, and nothing is granted.
export function normalizePicks(nodes: Node[] | undefined, picks: Pick[] | undefined): Pick[] | undefined {
  if (picks == undefined) return undefined;
  const byId = new Map(nodes?.map((n) => [n.id, n]));
  const merged = new Map<number, Pick>();
  for (const p of picks) {
    const seen = merged.get(p.id);
    if (!seen) {
      merged.set(p.id, p);
      continue;
    }
    const treeTalent = byId.get(p.id)?.ranks?.[0]?.tooltip?.talent?.id;
    const base = p.tooltip?.talent?.id == treeTalent && seen.tooltip?.talent?.id != treeTalent ? p : seen;
    merged.set(p.id, { ...base, rank: seen.rank + p.rank });
  }
  for (const n of nodes ?? []) {
    if (!merged.has(n.id) && (n.ranks?.[0]?.default_points ?? 0) > 0) {
      merged.set(n.id, { id: n.id, rank: n.ranks![0].default_points! });
    }
  }
  return [...merged.values()];
}

//`capstoneId` is passed for the spec tree, whose capstone takes more points than Blizzard says
export function diffTree(
  title: string,
  all: Node[] | undefined,
  leftPicks?: Pick[],
  rightPicks?: Pick[],
  capstoneId?: number
): TreeDiff {
  //a few nodes are published with no talent on them at all; there is nothing to draw or compare
  const nodes = (all ?? []).filter((n) => spellIdOf(n) != undefined);
  leftPicks = normalizePicks(nodes, leftPicks);
  rightPicks = normalizePicks(nodes, rightPicks);
  const diffs = nodes.map((node): NodeDiff => {
    const left = leftPicks?.find((p) => p.id == node.id);
    const right = rightPicks?.find((p) => p.id == node.id);
    const state: NodeState =
      left && right ? (samePick(node, left, right) ? "same" : "mod") : left ? "del" : right ? "add" : "none";
    return {
      node,
      left,
      right,
      state,
      spellId: spellIdOf(node, right ?? left),
      leftName: nameOf(node, left),
      rightName: nameOf(node, right),
      maxRank: maxRankOf(node, capstoneId),
    };
  });
  return {
    title,
    nodes: diffs,
    //listed in the tree's reading order, top row first
    changes: diffs
      .filter((d) => d.state == "del" || d.state == "add" || d.state == "mod")
      .sort((a, b) => a.node.display_row - b.node.display_row || a.node.display_col - b.node.display_col),
  };
}

//The class and spec node lists also carry every hero tree's nodes. Left in, the spec tree draws
//several hero trees stacked on each other, so they are taken out; hero trees get their own panel.
export function splitTree(tree: Dragonblight.TalentTree) {
  const heroIds = new Set((tree.hero_talent_trees ?? []).flatMap((h) => h.hero_talent_nodes?.map((n) => n.id) ?? []));
  const notHero = (n: Node) => !heroIds.has(n.id);
  return {
    classNodes: tree.class_talent_nodes?.filter(notHero),
    specNodes: tree.spec_talent_nodes?.filter(notHero),
  };
}

//A loadout names its hero talents by node, not its hero tree, so the tree is the one those nodes
//belong to.
export function heroTreeOf(tree: Dragonblight.TalentTree, picks: Pick[] | undefined): Dragonblight.HeroTalentTree | undefined {
  const ids = new Set(picks?.map((p) => p.id));
  let best: Dragonblight.HeroTalentTree | undefined;
  let bestCount = 0;
  for (const h of tree.hero_talent_trees ?? []) {
    const count = h.hero_talent_nodes?.filter((n) => ids.has(n.id)).length ?? 0;
    if (count > bestCount) {
      best = h;
      bestCount = count;
    }
  }
  return best;
}

// --- PvP talents ----------------------------------------------------------------------------

export interface PvpPick {
  id: number;
  name?: string;
  spellId?: number;
  changed: boolean;
}

function pvpPicks(spec: Spec | undefined) {
  return (spec?.pvp_talent_slots ?? [])
    .slice()
    .sort((a, b) => a.slot_number - b.slot_number)
    .map((s) => s.selected)
    .filter((s) => s?.talent != undefined)
    .map((s) => ({ id: s!.talent!.id, name: s!.talent!.name, spellId: s!.spell_tooltip?.spell?.id }));
}

//PvP talent slots are interchangeable, so the same talents in different slots are not a change
export function diffPvp(left: Spec | undefined, right: Spec | undefined) {
  const l = pvpPicks(left);
  const r = pvpPicks(right);
  const lIds = new Set(l.map((p) => p.id));
  const rIds = new Set(r.map((p) => p.id));
  return {
    left: l.map((p): PvpPick => ({ ...p, changed: !rIds.has(p.id) })),
    right: r.map((p): PvpPick => ({ ...p, changed: !lIds.has(p.id) })),
  };
}

// --- MoP Classic ----------------------------------------------------------------------------

//MoP talents are one pick out of three on each of six tiers
export const CLASSIC_TIER_LEVELS = [15, 30, 45, 60, 75, 90];

export interface ClassicTierDiff {
  tier: number;
  level: number;
  left?: Dragonblight.TalentSelection;
  right?: Dragonblight.TalentSelection;
  changed: boolean;
}

//The tier a talent sits on, from the client's talent table. A pick's own tier_index can't be
//trusted on MoP: it is 0 on every pick and the picks come in no tier order, so matching on it finds
//only whichever is listed first. Each spell in the table belongs to one tier of one class, so the
//spell alone is enough to place a pick.
const TIER_BY_SPELL = new Map(Talents.map((t) => [t.SpellID, t.TierID]));

function classicTier(t: Dragonblight.TalentSelection): number {
  return TIER_BY_SPELL.get(t.spell_tooltip?.spell?.id ?? 0) ?? t.tier_index;
}

export function diffClassic(left: Spec | undefined, right: Spec | undefined): ClassicTierDiff[] {
  return CLASSIC_TIER_LEVELS.map((level, tier) => {
    const l = left?.talents?.find((t) => classicTier(t) == tier);
    const r = right?.talents?.find((t) => classicTier(t) == tier);
    return { tier, level, left: l, right: r, changed: (l?.talent?.id ?? 0) != (r?.talent?.id ?? 0) };
  });
}
