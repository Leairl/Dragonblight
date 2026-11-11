import React, { useEffect, useState } from "react";
import { Card, Flex, Heading, Popover, SegmentedControl, Table, Text } from "@radix-ui/themes";
import { CheckCircledIcon, ClockIcon, CrossCircledIcon, InfoCircledIcon, UpdateIcon } from "@radix-ui/react-icons";
import { Dragonblight } from "../../clients/Dragonblight";
import { ClassColor } from "../../helpers/classColorHelper";
import { RegionFlag } from "../ladder-controls/ladder-controls";
import StatCard, { StatRow } from "../stat-card/stat-card";
import "../class-leaderboard-analytics/class-leaderboard-analytic.css";
import { raceIcon, specDisplayName, specIcon } from "../../helpers/forever-names";

interface Ruleset {
  id: number;
  name: string;
  //what the ruleset picker shows, which has to fit five tabs into 300px
  shortName: string;
}

// Forever's rulesets, which take the place of realms. The ids are Blizzard's (from
// /data/wow/ruleset/index); US and EU use the same four.
const rulesets: Ruleset[] = [
  { id: 1, name: "PvP", shortName: "PvP" },
  { id: 2, name: "Normal", shortName: "Normal" },
  { id: 3, name: "Roleplay", shortName: "RP" },
  { id: 15, name: "Roleplay PvP", shortName: "RP-PvP" },
];

const regions = ["us", "eu"];

//races have no class to take a color from, so they use the site's blue, as on retail
const raceBarColor = "#4dc4fd";

interface FactionCounts {
  alliance: number;
  horde: number;
}

// Totals each key's counts across the groups, highest first.
function countBy(groups: Dragonblight.ForeverStatsGroup[], key: (g: Dragonblight.ForeverStatsGroup) => string): [string, number][] {
  const counts = new Map<string, number>();
  for (const g of groups) {
    const k = key(g);
    counts.set(k, (counts.get(k) ?? 0) + g.count);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

// One region and faction cell of the faction table. A dash when nobody has been counted.
function CountCell(props: { counts: FactionCounts | undefined; faction: "alliance" | "horde" }) {
  if (props.counts === undefined) {
    return <Table.Cell justify="center"><Text color="gray">—</Text></Table.Cell>;
  }
  const total = props.counts.alliance + props.counts.horde;
  const count = props.counts[props.faction];
  let percent = 0;
  if (total > 0) {
    percent = Math.round((count / total) * 1000) / 10;
  }
  return (
    <Table.Cell justify="center">
      {count.toLocaleString()} <Text color="gray">({percent}%)</Text>
    </Table.Cell>
  );
}

function FactionHeader(props: { region: string; faction: "Alliance" | "Horde" }) {
  let color = "#4a90e2";
  if (props.faction === "Horde") {
    color = "#c0392b";
  }
  return (
    <Table.ColumnHeaderCell justify="center">
      <Flex align="center" justify="center" gap="1">
        <img src={`/Factions/${props.faction}.png`} alt="" height="18px" width="18px" style={{ maxHeight: "18px", maxWidth: "18px" }} />
        <span style={{ color: color }}>{props.region.toUpperCase()} {props.faction}</span>
      </Flex>
    </Table.ColumnHeaderCell>
  );
}

// "13 min ago", for when the sample was last counted
function timeAgo(when: Date, now: number): string {
  const minutes = Math.floor((now - when.getTime()) / 60000);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hr ago`;
  }
  return when.toLocaleDateString();
}

// One of the three numbers under the page title
function SummaryTile(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-gray-800 bg-black/30 px-3 py-2 min-w-0">
      <Text size="1" color="gray">{props.label}</Text>
      {props.children}
    </div>
  );
}

// The badge beside the title: whether the sample is complete, still filling in, or unavailable
function SyncBadge(props: { state: "loading" | "failed" | "counting" | "syncing" | "current" }) {
  let label = "Loading";
  let colorClass = "text-gray-300 border-gray-700 bg-black/30";
  let icon = <UpdateIcon className="animate-spin" />;
  if (props.state === "failed") {
    label = "Unavailable";
    colorClass = "text-red-300 border-red-900 bg-red-950/40";
    icon = <CrossCircledIcon />;
  } else if (props.state === "counting") {
    label = "First count running";
    colorClass = "text-amber-300 border-amber-900 bg-amber-950/40";
    icon = <UpdateIcon className="animate-spin" />;
  } else if (props.state === "syncing") {
    label = "Syncing";
    colorClass = "text-amber-300 border-amber-900 bg-amber-950/40";
    icon = <UpdateIcon className="animate-spin" />;
  } else if (props.state === "current") {
    label = "Up to date";
    colorClass = "text-green-300 border-green-900 bg-green-950/40";
    icon = <CheckCircledIcon />;
  }
  return (
    <span className={"inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-sm " + colorClass}>
      {icon}
      {label}
    </span>
  );
}

// WoW: Forever's ruleset stats: Horde and Alliance on each ruleset, then the class, spec and
// race cards the retail and classic Stats page has. Blizzard publishes no population figures,
// so everything here is counted from a sample that ForeverStatsJob builds on the server: the
// guilds of characters searched on Dragonblight, and everyone level 10+ in them.
// Route: /forever/stats
function ForeverStats() {
  const [summary, setSummary] = useState<Dragonblight.ForeverStatsSummary>();
  const [failed, setFailed] = useState(false);
  const [region, setRegion] = useState("us");
  // "all" or a ruleset id
  const [rulesetFilter, setRulesetFilter] = useState("all");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSpec, setSelectedSpec] = useState<string | null>(null);

  useEffect(() => {
    new Dragonblight.ForeverStatsClient()
      .getStats()
      .then(setSummary)
      .catch((error) => {
        console.error(error);
        setFailed(true);
      });
  }, []);

  const loading = summary === undefined && !failed;

  // keeps "Updated N min ago" current while the page stays open
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  // spec names as players know them, so the cards, filters and icons all use the same one
  const allGroups = (summary?.groups ?? []).map((g) => ({ ...g, specName: specDisplayName(g.specName) }));

  // ---- the faction table: every ruleset, both regions, ignoring the filters below it ----
  const factionCounts = new Map<string, FactionCounts>();
  for (const g of allGroups) {
    const key = `${g.region}-${g.rulesetId}`;
    let counts = factionCounts.get(key);
    if (counts === undefined) {
      counts = { alliance: 0, horde: 0 };
      factionCounts.set(key, counts);
    }
    if (g.faction === "ALLIANCE") {
      counts.alliance += g.count;
    } else if (g.faction === "HORDE") {
      counts.horde += g.count;
    }
  }

  // ---- the class, spec and race cards: the chosen region and ruleset ----
  const shownGroups = allGroups.filter(
    (g) => g.region === region && (rulesetFilter === "all" || String(g.rulesetId) === rulesetFilter)
  );
  const totalCharacters = shownGroups.reduce((total, g) => total + g.count, 0);

  function ClassClick(className: string) {
    setSelectedSpec(null);
    if (selectedClass === className) {
      setSelectedClass(null);
    } else {
      setSelectedClass(className);
    }
  }

  function SpecClick(specFullName: string) {
    if (selectedSpec === specFullName) {
      setSelectedSpec(null);
    } else {
      setSelectedSpec(specFullName);
    }
  }

  const classRows: StatRow[] = countBy(shownGroups, (g) => g.className).map(([className, count]) => ({
    name: className,
    icon: `/ClassIcons/${className}.png`,
    count,
    barColor: ClassColor.get(className),
    selected: selectedClass === className,
    onClick: () => ClassClick(className),
  }));

  // characters who haven't spent a talent point have no spec, so they sit out of this card only
  const specGroups = shownGroups.filter(
    (g) => g.specName !== "" && (selectedClass === null || g.className === selectedClass)
  );
  const specTotal = shownGroups.filter((g) => g.specName !== "").reduce((total, g) => total + g.count, 0);
  const specRows: StatRow[] = countBy(specGroups, (g) => `${g.specName}|${g.className}`).map(([key, count]) => {
    const [specName, className] = key.split("|");
    const specFullName = `${specName} ${className}`;
    return {
      name: specFullName,
      icon: specIcon(specName, className),
      count,
      barColor: ClassColor.get(className),
      selected: selectedSpec === specFullName,
      onClick: () => SpecClick(specFullName),
    };
  });

  //the race card follows the selected spec, then the selected class, and otherwise shows everyone
  let raceTitle = "All Races";
  let raceGroups = shownGroups;
  if (selectedSpec !== null) {
    raceTitle = selectedSpec + " Races";
    raceGroups = shownGroups.filter((g) => `${g.specName} ${g.className}` === selectedSpec);
  } else if (selectedClass !== null) {
    raceTitle = selectedClass + " Races";
    raceGroups = shownGroups.filter((g) => g.className === selectedClass);
  }
  const raceRows: StatRow[] = countBy(raceGroups, (g) => g.raceName).map(([raceName, count]) => ({
    name: raceName,
    icon: raceIcon(raceName),
    count,
    barColor: raceBarColor,
  }));
  const totalRaceCharacters = raceRows.reduce((total, r) => total + r.count, 0);

  //as on retail: a selected class leaves only a few specs, so the race card moves up under them on wide screens
  let classCardPlacement = "";
  let specCardPlacement = "min-[1200px]:col-start-2 min-[1200px]:row-start-1 min-[1200px]:row-span-2";
  let raceCardPlacement = "";
  if (selectedClass !== null) {
    classCardPlacement = "min-[1200px]:row-span-2";
    specCardPlacement = "min-[1200px]:col-start-2 min-[1200px]:row-start-1";
    raceCardPlacement = "min-[1200px]:col-start-2 min-[1200px]:row-start-2";
  }

  let rulesetLabel = "All";
  const chosenRuleset = rulesets.find((r) => String(r.id) === rulesetFilter);
  if (chosenRuleset !== undefined) {
    rulesetLabel = chosenRuleset.name;
  }

  // ---- the summary at the top: sync state, when it was counted, and the three tiles ----
  // the server sends a null updatedAt until the first count finishes
  const counted = summary !== undefined && Boolean(summary.updatedAt);
  let syncState: "loading" | "failed" | "counting" | "syncing" | "current" = "loading";
  if (failed) {
    syncState = "failed";
  } else if (summary !== undefined && !counted) {
    syncState = "counting";
  } else if (counted && summary.specsPending > 0) {
    // a newly crawled guild is counted from its roster first; its specs follow a few minutes later
    syncState = "syncing";
  } else if (counted) {
    syncState = "current";
  }

  let updatedText = "";
  if (counted && summary.updatedAt) {
    updatedText = "Updated " + timeAgo(new Date(summary.updatedAt), now);
  }

  let charactersText = "—";
  let guildsText = "—";
  let specsPercentText = "—";
  let specsPendingText = "";
  let specsBarWidth = 0;
  if (counted) {
    charactersText = summary.characters.toLocaleString();
    guildsText = summary.guilds.toLocaleString();
    let resolved = 100;
    if (summary.characters > 0) {
      resolved = Math.floor(((summary.characters - summary.specsPending) / summary.characters) * 100);
    }
    specsPercentText = `${resolved}%`;
    specsBarWidth = resolved;
    if (summary.specsPending > 0) {
      specsPendingText = `· ${summary.specsPending.toLocaleString()} pending`;
    }
  }

  let controlClass = "w-full max-w-[300px]";
  if (loading) {
    controlClass = "div-disabled " + controlClass;
  }

  return (
    <div className="mobileOnlyFull w-[80vw] min-h-[90vh]">
      <div className="flex flex-col gap-3">
        <Card className="[--card-background-color:#292c31]">
          <Flex direction="column" gap="3" className="p-1">
            <Flex justify="between" align="start" gap="3" wrap="wrap">
              <Flex direction="column" gap="1">
                <Heading size="5">WoW Forever Player Population</Heading>
                <Text size="2" color="gray">Sampled from guild rosters.</Text>
              </Flex>
              <Flex align="center" gap="3" wrap="wrap">
                <SyncBadge state={syncState} />
                {updatedText !== "" && (
                  <Flex align="center" gap="1">
                    <ClockIcon className="text-gray-400" />
                    <Text size="2" color="gray">{updatedText}</Text>
                  </Flex>
                )}
              </Flex>
            </Flex>

            <div className="grid grid-cols-3 gap-2 max-[700px]:grid-cols-1">
              <SummaryTile label="Characters sampled">
                <Text size="5" weight="bold">{charactersText}</Text>
              </SummaryTile>
              <SummaryTile label="Guilds scanned">
                <Text size="5" weight="bold">{guildsText}</Text>
              </SummaryTile>
              <SummaryTile label="Specs resolved">
                <Flex align="baseline" gap="2">
                  <Text size="5" weight="bold">{specsPercentText}</Text>
                  {specsPendingText !== "" && <Text size="1" color="gray">{specsPendingText}</Text>}
                </Flex>
                <div className="mt-1 h-0.5 w-full rounded-full bg-gray-800 overflow-hidden">
                  <div className="h-full rounded-full bg-[#4dc4fd] transition-[width] duration-300" style={{ width: `${specsBarWidth}%` }} />
                </div>
              </SummaryTile>
            </div>

            <div className="border-t border-gray-800 pt-3">
              <Flex gap="2" align="start">
                <InfoCircledIcon className="mt-0.5 flex-none text-gray-400" />
                <Text size="2" color="gray">
                  Blizzard doesn't publish Forever population figures. This is a sample of every level 10+ character
                  Dragonblight has seen in a guild, and it grows as more characters are searched.{" "}
                  <Popover.Root>
                    <Popover.Trigger>
                      <button type="button" className="cursor-pointer text-[#4dc4fd] underline underline-offset-2">
                        How this is counted
                      </button>
                    </Popover.Trigger>
                    <Popover.Content size="2" maxWidth="420px">
                      <Flex direction="column" gap="2">
                        <Text size="2" weight="bold">How this is counted</Text>
                        <Text size="2">
                          Each character searched on Dragonblight brings in their guild. Every member level 10 or higher
                          on that guild's roster is counted, under the guild's ruleset.
                        </Text>
                        <Text size="2">
                          A character's spec is the talent tree they have the most points in. Rosters are counted first and
                          specs are filled in a few minutes later, which is when the badge says Syncing. Characters
                          Blizzard's API has no profile for are counted without a spec.
                        </Text>
                        <Text size="2">
                          The sample is refreshed every hour, and a newly searched character's guild is added straight away.
                          Characters not seen in 30 days drop out.
                        </Text>
                      </Flex>
                    </Popover.Content>
                  </Popover.Root>
                </Text>
              </Flex>
            </div>
          </Flex>
        </Card>

        <Card className="[--card-background-color:#292c31]">
          <Flex direction="column" gap="2" className="p-1">
            <Heading size="4">Horde and Alliance by ruleset</Heading>
            <div className="overflow-x-auto">
              <Table.Root size="1">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Ruleset</Table.ColumnHeaderCell>
                    {regions.flatMap((r) => [
                      <FactionHeader key={r + "-alliance"} region={r} faction="Alliance" />,
                      <FactionHeader key={r + "-horde"} region={r} faction="Horde" />,
                    ])}
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {rulesets.map((ruleset) => (
                    <Table.Row key={ruleset.id}>
                      <Table.RowHeaderCell>{ruleset.name}</Table.RowHeaderCell>
                      {regions.flatMap((r) => {
                        const counts = factionCounts.get(`${r}-${ruleset.id}`);
                        return [
                          <CountCell key={r + "-alliance"} counts={counts} faction="alliance" />,
                          <CountCell key={r + "-horde"} counts={counts} faction="horde" />,
                        ];
                      })}
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </div>
          </Flex>
        </Card>

        <div className="flex-row justify-center max-[950px]:justify-start items-center flex gap-3 px-0 flex-wrap">
          <div className={controlClass}>
            <SegmentedControl.Root
              className="stats-bracket-toggle slider-border w-full grow-0"
              value={rulesetFilter}
              onValueChange={(value) => {
                setRulesetFilter(value);
                setSelectedClass(null);
                setSelectedSpec(null);
              }}
            >
              <SegmentedControl.Item value="all">All</SegmentedControl.Item>
              {rulesets.map((ruleset) => (
                <SegmentedControl.Item key={ruleset.id} value={String(ruleset.id)}>
                  {ruleset.shortName}
                </SegmentedControl.Item>
              ))}
            </SegmentedControl.Root>
          </div>
          <div className="db-grow"></div>
          <div className={loading ? "div-disabled" : ""}>
            <SegmentedControl.Root
              className="slider-border w-[100px] grow-0"
              value={region}
              onValueChange={(value) => {
                setRegion(value);
                setSelectedClass(null);
                setSelectedSpec(null);
              }}
            >
              <SegmentedControl.Item value="us">
                <RegionFlag region="us" />
              </SegmentedControl.Item>
              <SegmentedControl.Item value="eu">
                <RegionFlag region="eu" />
              </SegmentedControl.Item>
            </SegmentedControl.Root>
          </div>
        </div>

        {/* the same grid as retail: class over race on the left, spec on the right */}
        <div className="grid grid-cols-1 gap-3 min-[1200px]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] min-[1200px]:grid-rows-[auto_1fr]">
          <StatCard
            title="Class Stats"
            nameHeader="Class"
            rows={classRows}
            total={totalCharacters}
            className={classCardPlacement}
            emptyText="No characters counted yet"
          />
          <StatCard
            title={rulesetLabel + " Spec Stats"}
            nameHeader="Specialization"
            rows={specRows}
            total={specTotal}
            className={specCardPlacement}
            emptyText="No characters counted yet"
          />
          <StatCard
            title={raceTitle}
            nameHeader="Race"
            rows={raceRows}
            total={totalRaceCharacters}
            className={raceCardPlacement}
            emptyText="No characters counted yet"
          />
        </div>
      </div>
    </div>
  );
}

export default ForeverStats;
