import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Badge, Button, Card, Flex, Heading, Progress, Skeleton, Text, TextField } from "@radix-ui/themes";
import { Dragonblight } from "../../../clients/Dragonblight";
import { filterReputations, reputationColor, reputationProgress } from "./reputation-helpers";
import "./forever-reputations.css";

type ReputationState =
  | { status: "loading" }
  | { status: "loaded"; data: Dragonblight.ForeverReputationsSummary }
  | { status: "error"; message: string };

function ReputationCard({ entry }: { entry: Dragonblight.ForeverReputation }) {
  const name = entry.faction?.name ?? "Unknown faction";
  const standing = entry.standing;
  const progress = reputationProgress(standing);
  const color = reputationColor(standing?.tier);
  return (
    <Card className="border-card forever-reputation-card">
      <Flex justify="between" align="start" gap="2" wrap="wrap" mb="3">
        <Heading size="2">{name}</Heading>
        <Badge color={color}>{standing?.name ?? "Standing unavailable"}</Badge>
      </Flex>
      {progress ? (
        <>
          <Text as="p" size="2" color="gray">
            {standing?.value?.toLocaleString()} / {progress.max.toLocaleString()}
          </Text>
          <Progress
            aria-label={`${name} reputation`}
            aria-valuetext={`${standing?.name ?? "Reputation"}: ${standing?.value} of ${progress.max}`}
            value={progress.value}
            max={progress.max}
            color={color}
            size="2"
            mt="2"
          />
        </>
      ) : <Text as="p" size="2" color="gray">Progress unavailable.</Text>}
    </Card>
  );
}

function ForeverReputations() {
  const { region, characterSlug } = useParams();
  const [state, setState] = useState<ReputationState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");

  //The parent mounts only this tab and keys it by character. Ignore answers after leaving it.
  useEffect(() => {
    let cancelled = false;
    if (!region || !characterSlug) return;
    new Dragonblight.ForeverCharacterClient().getReputations(region, characterSlug)
      .then((data) => {
        if (!cancelled) setState(data
          ? { status: "loaded", data }
          : { status: "error", message: "Reputation data is not available for this character." });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const status = typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
        setState({ status: "error", message: status === 404
          ? "Reputation data is not available for this character."
          : "Unable to load reputations. Please try again." });
      });
    return () => { cancelled = true; };
  }, [region, characterSlug, attempt]);

  if (!region || !characterSlug) return <p>Select a character to view reputations.</p>;
  const reputations = state.status === "loaded" ? state.data.reputations ?? [] : [];
  const filtered = filterReputations(reputations, query);

  return (
    <section className="forever-reputations-pane" aria-label="Character reputations" aria-busy={state.status === "loading"}>
      <Heading size="4" mb="4">Reputations</Heading>
      {state.status === "loading" && (
        <div role="status">
          <Text as="p" size="2" color="gray" mb="3">Loading reputations…</Text>
          <div className="forever-reputations-grid">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height="110px" />)}</div>
        </div>
      )}
      {state.status === "error" && (
        <Flex direction="column" align="start" gap="3" role="alert">
          <Text as="p" size="2">{state.message}</Text>
          <Button variant="soft" color="gray" size="1" onClick={() => {
            setState({ status: "loading" });
            setAttempt((value) => value + 1);
          }}>Retry</Button>
        </Flex>
      )}
      {state.status === "loaded" && (reputations.length === 0 ? (
        <Text as="p" size="2" color="gray" role="status">No reputations reported for this character.</Text>
      ) : (
        <>
          <TextField.Root aria-label="Filter reputations" placeholder="Filter by faction or standing" value={query} onChange={(event) => setQuery(event.target.value)} mb="4" />
          {filtered.length === 0 ? <Text as="p" size="2" color="gray" role="status">No reputations match your filter.</Text> : (
            <div className="forever-reputations-grid">
              {filtered.map((entry, index) => <ReputationCard key={entry.faction?.id ?? index} entry={entry} />)}
            </div>
          )}
        </>
      ))}
    </section>
  );
}

export default ForeverReputations;
