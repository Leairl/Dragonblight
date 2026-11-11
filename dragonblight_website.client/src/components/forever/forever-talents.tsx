import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CheckIcon } from "@radix-ui/react-icons";
import { Flex, SegmentedControl, Skeleton, Text } from "@radix-ui/themes";
import { Dragonblight } from "../../clients/Dragonblight";
import { specDisplayName, specIcon } from "../../helpers/forever-names";
import TapPopover from "../tap-popover/tap-popover";

const gold = "#f8b700";
const grey = "#5b5f66";

// Blizzard's trees are four columns wide and at most a handful of rows deep. A few talents in the
// data sit far outside that (Marksmanship has one at row 63, Survival a second Lightning Reflexes
// at column 170); the game doesn't show them, so neither does this page.
const treeColumns = 4;
const lastShownRow = 11;

// The talents of a tree that the game draws, and the column its four-column window starts at.
// Each tree has its own window (Beast Mastery 1-4, Marksmanship 7-10, Survival 14-17).
function shownNodes(tree: Dragonblight.ForeverTalentTreeLayout): { nodes: Dragonblight.ForeverTalentNode[]; firstColumn: number } {
  const onGrid = tree.nodes.filter((n) => n.row >= 1 && n.row <= lastShownRow);
  if (onGrid.length === 0) {
    return { nodes: [], firstColumn: 0 };
  }
  const firstColumn = Math.min(...onGrid.map((n) => n.column));
  const nodes = onGrid.filter((n) => n.column < firstColumn + treeColumns);
  return { nodes: nodes, firstColumn: firstColumn };
}

// The grid a tree is drawn on, in pixels: a talent icon's size and the space between icons.
// Always full size, so icons and tree names read the same on every screen.
interface GridSize {
  cell: number;
  gap: number;
}

const grid: GridSize = { cell: 40, gap: 12 };

// A panel is a tree (four icons and three gaps) plus 24px of padding: 220px. Three panels and
// the two 12px spaces between them need 684px of card.
const panelSpacing = 12;
const panelWidth = 4 * grid.cell + 3 * grid.gap + 24;
const threeAcrossWidth = 3 * panelWidth + 2 * panelSpacing;

// The profile layout's own breakpoint: at this window width and below, the talents card goes from
// 60% of the window to 95% (profile-equipment.css).
const oneColumnQuery = "(max-width: 800px)";

// Three trees across, as the game shows them, when the card has room for them at full size; one
// per row otherwise. The breakpoint is checked as well as the card's width: narrowing the window
// past it makes the card wider, which would otherwise flip the trees back to three across.
function threeAcross(cardWidth: number, oneColumn: boolean): boolean {
  return !oneColumn && cardWidth >= threeAcrossWidth;
}

interface TalentsResult {
  key: string;
  page?: Dragonblight.ForeverTalentsPage;
  failed: boolean;
}

// where a grid slot's icon sits, in pixels from the tree's top left corner
function cellLeft(column: number, grid: GridSize): number {
  return column * (grid.cell + grid.gap);
}
function cellTop(row: number, grid: GridSize): number {
  return row * (grid.cell + grid.gap);
}

// Points the character has in a talent, from the chosen group. The ids arrive as object keys,
// which are strings.
function rankOf(group: Dragonblight.ForeverTalentGroup | undefined, talentId: number): number {
  if (group === undefined) {
    return 0;
  }
  return group.ranks[String(talentId)] ?? 0;
}

interface GridSlot {
  row: number;
  col: number;
}

// The line and arrowhead from a prerequisite to the talent it unlocks: straight down when they
// share a column, straight across when they share a row, otherwise across then down, as the game
// draws it. Both are SVG point lists.
function arrowShape(from: GridSlot, to: GridSlot, grid: GridSize): { line: string; head: string } {
  const half = grid.cell / 2;
  const cellSize = grid.cell;
  if (from.col === to.col) {
    const x = cellLeft(from.col, grid) + half;
    const startY = cellTop(from.row, grid) + cellSize;
    const endY = cellTop(to.row, grid);
    return {
      line: `${x},${startY} ${x},${endY - 6}`,
      head: `${x - 5},${endY - 7} ${x + 5},${endY - 7} ${x},${endY - 1}`,
    };
  }
  if (from.row === to.row) {
    const y = cellTop(from.row, grid) + half;
    if (to.col < from.col) {
      const startX = cellLeft(from.col, grid);
      const endX = cellLeft(to.col, grid) + cellSize;
      return {
        line: `${startX},${y} ${endX + 7},${y}`,
        head: `${endX + 7},${y - 5} ${endX + 7},${y + 5} ${endX + 1},${y}`,
      };
    }
    const startX = cellLeft(from.col, grid) + cellSize;
    const endX = cellLeft(to.col, grid);
    return {
      line: `${startX},${y} ${endX - 7},${y}`,
      head: `${endX - 7},${y - 5} ${endX - 7},${y + 5} ${endX - 1},${y}`,
    };
  }
  const y = cellTop(from.row, grid) + half;
  let startX = cellLeft(from.col, grid) + cellSize;
  if (to.col < from.col) {
    startX = cellLeft(from.col, grid);
  }
  const x = cellLeft(to.col, grid) + half;
  const endY = cellTop(to.row, grid);
  return {
    line: `${startX},${y} ${x},${y} ${x},${endY - 6}`,
    head: `${x - 5},${endY - 7} ${x + 5},${endY - 7} ${x},${endY - 1}`,
  };
}

// A prerequisite arrow, gold once the prerequisite is maxed
function Arrow(props: { from: GridSlot; to: GridSlot; lit: boolean; grid: GridSize }) {
  let color = grey;
  if (props.lit) {
    color = gold;
  }
  const shape = arrowShape(props.from, props.to, props.grid);
  return (
    <g>
      <polyline points={shape.line} fill="none" stroke={color} strokeWidth={3} />
      <polygon points={shape.head} fill={color} />
    </g>
  );
}

// One talent: its icon in its slot, lit and ranked when taken, greyed when not, with what it
// does on hover or tap.
function TalentIcon(props: { node: Dragonblight.ForeverTalentNode; rank: number; row: number; col: number; grid: GridSize }) {
  const n = props.node;
  const taken = props.rank > 0;
  let borderColor = grey;
  let imageClass = "w-full h-full rounded-[3px] grayscale opacity-45";
  if (taken) {
    borderColor = gold;
    imageClass = "w-full h-full rounded-[3px]";
  }

  const badgeClass = "absolute -bottom-2 -right-2 min-w-[18px] rounded-[3px] border bg-black px-1 text-center text-[11px] font-bold leading-[16px]";

  let current = n.rankDescriptions[0] ?? "";
  if (taken) {
    current = n.rankDescriptions[props.rank - 1] ?? "";
  }
  let next = "";
  if (taken && props.rank < n.maxRank) {
    next = n.rankDescriptions[props.rank] ?? "";
  }

  return (
    <div className="absolute" style={{ left: cellLeft(props.col, props.grid), top: cellTop(props.row, props.grid), width: props.grid.cell, height: props.grid.cell }}>
      <TapPopover
        side="top"
        passThrough
        triggerClassName="block w-full h-full cursor-default"
        contentClassName="max-w-[280px]"
        trigger={
          <div className="relative w-full h-full rounded-[5px] border-2 bg-black" style={{ borderColor: borderColor }}>
            {n.icon !== "" && <img src={n.icon} alt={n.name} className={imageClass} />}
            {taken && (
              <span className={badgeClass} style={{ borderColor: gold, color: gold }}>
                {props.rank}
              </span>
            )}
          </div>
        }
      >
        <Flex direction="column" gap="1">
          <Text size="2" weight="bold">{n.name}</Text>
          <Text size="1" color="gray">Rank {props.rank}/{n.maxRank}</Text>
          {current !== "" && <Text size="2">{current}</Text>}
          {next !== "" && (
            <>
              <Text size="1" color="gray" className="mt-1">Next rank:</Text>
              <Text size="2">{next}</Text>
            </>
          )}
        </Flex>
      </TapPopover>
    </div>
  );
}

// One spec's tree: its icon, name and points spent, then its talents on the grid with the
// arrows between them. Columns are shifted so the tree's own first column is 0, and every tree
// gets the same number of rows so the three panels line up.
function TalentTree(props: {
  tree: Dragonblight.ForeverTalentTreeLayout;
  group: Dragonblight.ForeverTalentGroup | undefined;
  className: string;
  rows: number;
  grid: GridSize;
}) {
  const specName = specDisplayName(props.tree.specName);
  const shown = shownNodes(props.tree);
  const nodes = shown.nodes;
  const firstColumn = shown.firstColumn;
  const spent = nodes.reduce((total, n) => total + rankOf(props.group, n.talentId), 0);
  const byNode = new Map(nodes.map((n) => [n.nodeId, n]));
  const width = treeColumns * props.grid.cell + (treeColumns - 1) * props.grid.gap;
  const height = props.rows * props.grid.cell + (props.rows - 1) * props.grid.gap;

  return (
    <div className="flex flex-col items-center gap-4 rounded-md border border-gray-800 bg-black/30 px-3 pt-3 pb-5">
      <Flex align="center" gap="2" className="self-stretch border-b border-gray-800 pb-3">
        <div className="relative">
          <img
            src={specIcon(specName, props.className)}
            alt=""
            className="h-9 w-9 rounded-full border-2 border-gray-600"
            onError={(e) => {
              if (!e.currentTarget.src.endsWith("/unknown.png")) {
                e.currentTarget.src = "/unknown.png";
              }
            }}
          />
          <span className="absolute -bottom-1 -right-2 rounded-[3px] border border-gray-600 bg-black px-1 text-[11px] font-bold">{spent}</span>
        </div>
        <Text size="3" weight="bold" className="ml-2 whitespace-nowrap">{props.tree.specName}</Text>
      </Flex>
      <div className="relative" style={{ width: width, height: height }}>
        <svg className="absolute inset-0 pointer-events-none" width={width} height={height}>
          {nodes.flatMap((n) =>
            n.lockedBy.map((prerequisiteId) => {
              const prerequisite = byNode.get(prerequisiteId);
              if (prerequisite === undefined) {
                return null;
              }
              const lit = rankOf(props.group, prerequisite.talentId) >= prerequisite.maxRank;
              return (
                <Arrow
                  key={`${prerequisiteId}-${n.nodeId}`}
                  from={{ row: prerequisite.row - 1, col: prerequisite.column - firstColumn }}
                  to={{ row: n.row - 1, col: n.column - firstColumn }}
                  lit={lit}
                  grid={props.grid}
                />
              );
            })
          )}
        </svg>
        {nodes.map((n) => (
          <TalentIcon key={n.nodeId} node={n} rank={rankOf(props.group, n.talentId)} row={n.row - 1} col={n.column - firstColumn} grid={props.grid} />
        ))}
      </div>
    </div>
  );
}

// The talents tab of a WoW: Forever character page: the class's three trees as the game draws
// them, with Primary and Secondary tabs for characters with dual spec, opening on the group the
// character is using.
function ForeverTalents(props: { region: string; characterSlug: string; className: string }) {
  const requestKey = `${props.region}/${props.characterSlug}`;
  const [result, setResult] = useState<TalentsResult>();
  const [chosenGroup, setChosenGroup] = useState<{ key: string; index: number }>();
  // the card's width, which decides how big the trees are drawn
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardSize, setCardSize] = useState({ width: 0, oneColumn: window.matchMedia(oneColumnQuery).matches });

  // The card changes width whenever the window does, and it jumps from 60% to 95% of the window
  // at the breakpoint, so its resize is also when to check which side of the breakpoint the window
  // is on. Listening for the media query's own change event missed resizes in DevTools' device
  // emulation, leaving three columns at 767px.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (card === null) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      setCardSize({
        width: entries[0].contentRect.width,
        oneColumn: window.matchMedia(oneColumnQuery).matches,
      });
    });
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    new Dragonblight.ForeverCharacterClient()
      .getTalents(props.region, props.characterSlug)
      .then((page) => {
        if (cancelled) return;
        setResult({ key: requestKey, page: page, failed: false });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error(error);
        setResult({ key: requestKey, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [props.region, props.characterSlug, requestKey]);

  let page: Dragonblight.ForeverTalentsPage | undefined = undefined;
  let failed = false;
  if (result !== undefined && result.key === requestKey) {
    page = result.page;
    failed = result.failed;
  }

  let treeColumnsStyle: React.CSSProperties = { gridTemplateColumns: "minmax(0, 1fr)" };
  if (threeAcross(cardSize.width, cardSize.oneColumn)) {
    treeColumnsStyle = { gridTemplateColumns: "repeat(3, minmax(0, 1fr))" };
  }

  // the measured element is always rendered, so the width is known before the trees arrive
  return (
    <div ref={cardRef}>
      <TalentsContent
        page={page}
        failed={failed}
        groupIndex={groupIndexFor(page, chosenGroup, requestKey)}
        onChooseGroup={(index) => setChosenGroup({ key: requestKey, index: index })}
        className={props.className}
        grid={grid}
        treeColumnsStyle={treeColumnsStyle}
      />
    </div>
  );
}

// the group shown: the one picked for this character, or else the one they're using
function groupIndexFor(
  page: Dragonblight.ForeverTalentsPage | undefined,
  chosenGroup: { key: string; index: number } | undefined,
  requestKey: string
): number {
  if (page === undefined) {
    return 0;
  }
  if (chosenGroup !== undefined && chosenGroup.key === requestKey && chosenGroup.index < page.groups.length) {
    return chosenGroup.index;
  }
  const activeIndex = page.groups.findIndex((g) => g.isActive);
  if (activeIndex < 0) {
    return 0;
  }
  return activeIndex;
}

// What the talents tab shows inside the measured card: loading, a failure, or the trees.
function TalentsContent(props: {
  page: Dragonblight.ForeverTalentsPage | undefined;
  failed: boolean;
  groupIndex: number;
  onChooseGroup: (index: number) => void;
  className: string;
  grid: GridSize;
  treeColumnsStyle: React.CSSProperties;
}) {
  const page = props.page;
  if (props.failed) {
    return <Text color="gray">Couldn't load this character's talents. Try again in a minute.</Text>;
  }
  if (page === undefined) {
    return (
      <div className="grid gap-3" style={props.treeColumnsStyle}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height="420px"></Skeleton>
        ))}
      </div>
    );
  }
  if (page.trees.length === 0) {
    return <Text color="gray">Blizzard didn't return this class's talent trees. Try again later.</Text>;
  }

  const group = page.groups[props.groupIndex];

  // the deepest of the three trees sets every panel's height, so they line up
  const shownRows = page.trees.flatMap((t) => shownNodes(t).nodes.map((n) => n.row));
  let lastRow = 1;
  if (shownRows.length > 0) {
    lastRow = Math.max(...shownRows);
  }
  const unspentNote = page.groups.length === 0;

  return (
    <Flex direction="column" gap="3">
      {page.groups.length > 1 && (
        <SegmentedControl.Root
          className="w-[250px]"
          value={String(props.groupIndex)}
          onValueChange={(value) => props.onChooseGroup(Number(value))}
        >
          {page.groups.map((g, i) => {
            let label = "Primary";
            if (i > 0) {
              label = "Secondary";
            }
            return (
              <SegmentedControl.Item key={i} value={String(i)}>
                <Flex align="center" gap="1">
                  {label}
                  {g.isActive && <CheckIcon />}
                </Flex>
              </SegmentedControl.Item>
            );
          })}
        </SegmentedControl.Root>
      )}
      {unspentNote && <Text size="2" color="gray">This character hasn't spent any talent points.</Text>}
      <div className="grid gap-3" style={props.treeColumnsStyle}>
        {page.trees.map((tree) => (
          <TalentTree
            key={tree.specId}
            tree={tree}
            group={group}
            className={props.className}
            rows={lastRow}
            grid={props.grid}
          />
        ))}
      </div>
    </Flex>
  );
}

export default ForeverTalents;
