import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Button, Card, ChevronDownIcon, DataList, Heading, Skeleton, Text } from "@radix-ui/themes";
import * as Accordion from "@radix-ui/react-accordion";
import { Dragonblight } from "../../../clients/Dragonblight";
import { statGroups, StatRow } from "./stat-groups";
import "./forever-character-stats.css";

type StatsState =
  | { status: "loading" }
  | { status: "loaded"; data: Dragonblight.ForeverCharacterStatistics }
  | { status: "error"; message: string };

function StatRows({ rows }: { rows: StatRow[] }) {
  return (
    <DataList.Root size="1">
      {rows.map((row) => (
        <DataList.Item key={row.label}>
          <DataList.Label minWidth="85px">{row.label}</DataList.Label>
          <DataList.Value className={row.boosted ? "green_text" : undefined}>{row.value}</DataList.Value>
        </DataList.Item>
      ))}
    </DataList.Root>
  );
}

function ForeverCharacterStats() {
  const { region, characterSlug } = useParams();
  const [state, setState] = useState<StatsState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  //Keep mounted across tabs, keyed by character, independently of the paperdoll request.
  useEffect(() => {
    let cancelled = false;
    if (!region || !characterSlug) return;
    new Dragonblight.ForeverCharacterClient().getStats(region, characterSlug)
      .then((data) => {
        if (!cancelled) setState(data
          ? { status: "loaded", data }
          : { status: "error", message: "Stats are not available for this character." });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const status = typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
        setState({ status: "error", message: status === 404
          ? "Stats are not available for this character."
          : "Unable to load stats. Please try again." });
      });
    return () => { cancelled = true; };
  }, [region, characterSlug, attempt]);

  if (!region || !characterSlug) return null;
  const groups = state.status === "loaded" ? statGroups(state.data) : [];
  const hasStats = groups.some((group) => group.rows.some((row) => row.value !== "—"));

  return (
    <aside className="forever-character-stats" aria-label="Character stats" aria-busy={state.status === "loading"}>
      {state.status === "loading" && (
        <div className="forever-stats-skeleton" role="status" aria-label="Loading stats">
          {[120, 180, 180, 48, 48, 48].map((height, index) => <Skeleton key={index} height={`${height}px`} mb="3" />)}
        </div>
      )}
      {state.status === "error" && (
        <Card className="border-card" role="alert">
          <Heading size="2" mb="2">Stats</Heading>
          <Text as="p" size="2" mb="3">{state.message}</Text>
          <Button variant="soft" color="gray" size="1" onClick={() => {
            setState({ status: "loading" });
            setAttempt((value) => value + 1);
          }}>Retry</Button>
        </Card>
      )}
      {state.status === "loaded" && (!hasStats ? (
        <Card className="border-card"><Text size="2" role="status">No stats reported for this character.</Text></Card>
      ) : (
        <Accordion.Root type="multiple" className="forever-stat-cards">
          {groups.map((group) => group.collapsible ? (
            <Card className="border-card forever-stat-dropdown" key={group.title}>
              <Accordion.Item value={group.title}>
                <Accordion.Header>
                  <Accordion.Trigger className="forever-stat-trigger">
                    <Text size="2" weight="bold">{group.title}</Text>
                    <ChevronDownIcon aria-hidden />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="forever-stat-content"><StatRows rows={group.rows} /></Accordion.Content>
              </Accordion.Item>
            </Card>
          ) : (
            <Card className="border-card" key={group.title}>
              <Heading size="2" mb="2">{group.title}</Heading>
              <StatRows rows={group.rows} />
            </Card>
          ))}
        </Accordion.Root>
      ))}
    </aside>
  );
}

export default ForeverCharacterStats;
