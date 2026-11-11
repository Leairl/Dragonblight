import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Button, Callout, Flex, Heading, Select, Skeleton, Text, TextField } from "@radix-ui/themes";
import { Dragonblight } from "../../../clients/Dragonblight";
import { filterAchievements, reportedAchievements } from "./achievement-helpers";
import AchievementCard from "./achievement-card";
import RecentAchievements from "./recent-achievements";
import "./forever-achievements.css";

type SummaryState = { status: "loading" } | { status: "loaded"; data: Dragonblight.ForeverAchievementsSummary } | { status: "error"; message: string };
type DetailResult = { key: string; rows: Dragonblight.ForeverAchievementDetails[]; complete: boolean; failed: boolean };
const pageSize = 4;
const detailBatchSize = 10;

export default function ForeverAchievements() {
  const { region, characterSlug } = useParams();
  const [state, setState] = useState<SummaryState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [detailAttempt, setDetailAttempt] = useState(0);
  const [detailResult, setDetailResult] = useState<DetailResult>();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    if (!region || !characterSlug) return;
    new Dragonblight.ForeverCharacterClient().getAchievements(region, characterSlug)
      .then((data) => {
        if (!cancelled) setState(data ? { status: "loaded", data } : { status: "error", message: "Achievement data is not available for this character." });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const code = typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
        setState({ status: "error", message: code === 404 ? "Achievement data is not available for this character." : "Unable to load achievements. Please try again." });
      });
    return () => { cancelled = true; };
  }, [region, characterSlug, attempt]);

  const summary = state.status === "loaded" ? state.data : undefined;
  const entries = reportedAchievements(summary?.achievements);
  const ids = entries.map((entry) => entry.id).sort((a, b) => a - b).join(",");
  const detailKey = `${region}/${ids}/${detailAttempt}`;
  const currentDetails = detailResult?.key === detailKey ? detailResult : undefined;
  const detailsLoading = ids !== "" && !currentDetails?.complete;

  //Definitions are needed for category filters and criterion targets. Load small sequential
  //batches, not an unbounded request per achievement; stop when the character/tab changes.
  useEffect(() => {
    if (!ids || !region) return;
    let cancelled = false;
    const client = new Dragonblight.ForeverCharacterClient();
    const numbers = ids.split(",").map(Number);
    async function load() {
      const rows: Dragonblight.ForeverAchievementDetails[] = [];
      let failed = false;
      for (let start = 0; start < numbers.length; start += detailBatchSize) {
        if (cancelled) return;
        try { rows.push(...await client.getAchievementDetails(region, numbers.slice(start, start + detailBatchSize))); }
        catch { failed = true; }
        if (cancelled) return;
        setDetailResult({ key: detailKey, rows: [...rows], complete: start + detailBatchSize >= numbers.length, failed });
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [region, ids, detailKey]);

  const details = new Map((currentDetails?.rows ?? []).map((detail) => [detail.id, detail]));
  const categories = [...new Map((currentDetails?.rows ?? []).flatMap((detail) => detail.achievement?.category
    ? [[String(detail.achievement.category.id), detail.achievement.category.name ?? "Unknown category"] as const] : [])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1]));
  const missingDetails = !!currentDetails?.complete && (currentDetails.failed || entries.some((entry) => !details.get(entry.id)?.achievement));
  const filtered = filterAchievements(entries, details, query, status, category);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * pageSize;
  const recent = [...(summary?.recent_events ?? [])].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)).slice(0, 5);

  if (!region || !characterSlug) return <p>Select a character to view achievements.</p>;
  return (
    <section className="forever-achievements-pane" aria-label="Character achievements" aria-busy={state.status === "loading"}>
      <Heading size="4" mb="4">Achievements</Heading>
      {state.status === "loading" && <div role="status"><Text as="p" size="2" mb="3" color="gray">Loading achievements…</Text>{[0, 1, 2].map((i) => <Skeleton key={i} height="110px" mb="3" />)}</div>}
      {state.status === "error" && <Flex direction="column" align="start" gap="3" role="alert">
        <Text as="p" size="2">{state.message}</Text>
        <Button size="1" variant="soft" color="gray" onClick={() => { setState({ status: "loading" }); setAttempt((value) => value + 1); }}>Retry</Button>
      </Flex>}
      {state.status === "loaded" && <>
        <Flex gap="4" wrap="wrap" mb="3">
          <Text size="2">Completed: <strong>{summary?.total_quantity?.toLocaleString() ?? "—"}</strong></Text>
          {summary?.total_points != null && summary.total_points > 0 && <Text size="2">Achievement points: {summary.total_points.toLocaleString()}</Text>}
        </Flex>
        <Text as="p" size="1" color="gray" mb="4">Only achievements reported for this character are shown. Legacy rewards are listed separately from achievement points.</Text>
        <RecentAchievements events={recent} details={details} loading={detailsLoading} />
        {entries.length === 0 ? <Text as="p" size="2" color="gray" role="status">No achievements reported for this character.</Text> : <>
          <div className="forever-achievement-filters">
            <TextField.Root aria-label="Search achievements" placeholder="Search achievements…" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
            <Select.Root value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}>
              <Select.Trigger aria-label="Achievement status" />
              <Select.Content><Select.Item value="all">All statuses</Select.Item><Select.Item value="completed">Completed</Select.Item><Select.Item value="in-progress">In progress</Select.Item><Select.Item value="unknown">Status unavailable</Select.Item></Select.Content>
            </Select.Root>
            <Select.Root value={category} disabled={detailsLoading} onValueChange={(value) => { setCategory(value); setPage(1); }}>
              <Select.Trigger aria-label="Achievement category" placeholder="All categories" />
              <Select.Content><Select.Item value="all">All categories</Select.Item>{categories.map(([id, name]) => <Select.Item key={id} value={id}>{name}</Select.Item>)}<Select.Item value="unknown">Category unavailable</Select.Item></Select.Content>
            </Select.Root>
          </div>
          {detailsLoading && <Text as="p" size="1" color="gray" mb="3" role="status">Loading achievement details and categories…</Text>}
          {missingDetails && <Callout.Root color="amber" size="1" mb="3"><Callout.Text>Some achievement details are unavailable. Reported names and completion states are still shown. <Button size="1" variant="ghost" onClick={() => setDetailAttempt((value) => value + 1)}>Retry details</Button></Callout.Text></Callout.Root>}
          {filtered.length === 0 ? <Text as="p" size="2" color="gray" role="status">{detailsLoading ? "Loading matching achievement details…" : "No achievements match your filters."}</Text> : <div className="forever-achievement-list">
            {filtered.slice(start, start + pageSize).map((entry) => <AchievementCard key={entry.id} entry={entry} detail={details.get(entry.id)} loading={detailsLoading} />)}
          </div>}
          <Flex justify="between" align="center" gap="2" wrap="wrap" mt="3">
            <Text size="1" color="gray">{filtered.length === 0 ? "0 achievements" : `${start + 1}–${Math.min(start + pageSize, filtered.length)} of ${filtered.length} achievements`}</Text>
            <Flex gap="2" align="center"><Button size="1" variant="soft" color="gray" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Previous</Button><Text size="1">{currentPage} / {pages}</Text><Button size="1" variant="soft" color="gray" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>Next</Button></Flex>
          </Flex>
        </>}
      </>}
    </section>
  );
}
