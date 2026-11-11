import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { Button, Callout, Flex, Heading, Select, Skeleton, Text, TextField } from "@radix-ui/themes";
import { Dragonblight } from "../../../clients/Dragonblight";
import { achievementDetails, loadAchievementDetails, useForeverTab } from "../forever-data";
import { filterAchievements, reportedAchievements } from "./achievement-helpers";
import AchievementCard from "./achievement-card";
import RecentAchievements from "./recent-achievements";
import "./forever-achievements.css";

type DetailResult = { key: string; complete: boolean; failed: boolean };
const pageSize = 4;
const noDetails = new Map<number, Dragonblight.ForeverAchievementDetails>();

export default function ForeverAchievements() {
  const { region, characterSlug } = useParams();
  const [state, retry] = useForeverTab("achievements", region, characterSlug, {
    missing: "Achievement data is not available for this character.",
    failed: "Unable to load achievements. Please try again.",
  });
  // Legacy Points come from their own request; the tab works without them if it fails
  const [legacy] = useForeverTab("legacy", region, characterSlug, { missing: "", failed: "" });
  const [detailAttempt, setDetailAttempt] = useState(0);
  const [detailResult, setDetailResult] = useState<DetailResult>();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);

  const summary = state.status === "loaded" ? state.data : undefined;
  const entries = useMemo(() => reportedAchievements(summary?.achievements), [summary]);
  const recent = useMemo(() => [...(summary?.recent_events ?? [])].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)).slice(0, 5), [summary]);
  const ids = useMemo(() => [...new Set([...entries.map((entry) => entry.id), ...recent.flatMap((event) => event.achievement ? [event.achievement.id] : [])])]
    .sort((a, b) => a - b).join(","), [entries, recent]);
  //What is on screen first: the recent panel and the first page in the default order.
  const firstIds = useMemo(() => [...recent.flatMap((event) => event.achievement ? [event.achievement.id] : []),
    ...filterAchievements(entries, noDetails, "", "all", "all").slice(0, pageSize).map((entry) => entry.id)].join(","), [entries, recent]);
  const detailKey = `${region}/${ids}/${detailAttempt}`;
  const currentDetails = detailResult?.key === detailKey ? detailResult : undefined;

  //Definitions are static and shared by every character, so they are cached for the session. Load the
  //visible ones first, then the rest of the list in one request; stop when the character/tab changes.
  useEffect(() => {
    if (!ids || !region) return;
    let cancelled = false;
    const all = ids.split(",").map(Number);
    const first = firstIds ? firstIds.split(",").map(Number) : [];
    async function load() {
      let failed = false;
      if (first.some((id) => !achievementDetails.get(region!, id))) {
        const head = await loadAchievementDetails(region!, first);
        if (cancelled) return;
        failed = head.failed;
        setDetailResult({ key: detailKey, complete: false, failed });
      }
      const rest = await loadAchievementDetails(region!, all);
      if (cancelled) return;
      setDetailResult({ key: detailKey, complete: true, failed: failed || rest.failed });
    }
    void load();
    return () => { cancelled = true; };
  }, [region, ids, firstIds, detailKey]);

  //Rows come from the session cache; detailResult only changes to say more of them have arrived.
  const details = useMemo(() => {
    const rows = new Map<number, Dragonblight.ForeverAchievementDetails>();
    if (!region || !ids) return rows;
    for (const id of ids.split(",").map(Number)) {
      const row = achievementDetails.get(region, id);
      if (row) rows.set(id, row);
    }
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- currentDetails marks new rows in the cache
  }, [region, ids, currentDetails]);
  const allCached = ids !== "" && ids.split(",").every((id) => details.has(Number(id)));
  const detailsComplete = allCached || !!currentDetails?.complete;
  const detailsLoading = ids !== "" && !detailsComplete;
  const categories = useMemo(() => [...new Map([...details.values()].flatMap((detail) => detail.achievement?.category
    ? [[String(detail.achievement.category.id), detail.achievement.category.name ?? "Unknown category"] as const] : [])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1])), [details]);
  const missingDetails = detailsComplete && (!!currentDetails?.failed || entries.some((entry) => !details.get(entry.id)?.achievement));
  const filtered = useMemo(() => filterAchievements(entries, details, query, status, category), [entries, details, query, status, category]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * pageSize;

  if (!region || !characterSlug) return <p>Select a character to view achievements.</p>;
  return (
    <section className="forever-achievements-pane" aria-label="Character achievements" aria-busy={state.status === "loading"}>
      <Heading size="4" mb="4">Achievements</Heading>
      {state.status === "loading" && <div role="status"><Text as="p" size="2" mb="3" color="gray">Loading achievements…</Text>{[0, 1, 2].map((i) => <Skeleton key={i} height="110px" mb="3" />)}</div>}
      {state.status === "error" && <Flex direction="column" align="start" gap="3" role="alert">
        <Text as="p" size="2">{state.message}</Text>
        <Button size="1" variant="soft" color="gray" onClick={retry}>Retry</Button>
      </Flex>}
      {state.status === "loaded" && <>
        <Flex gap="4" wrap="wrap" mb="3">
          <Text size="2">Completed: <strong>{summary?.total_quantity?.toLocaleString() ?? "—"}</strong></Text>
          {summary?.total_points != null && summary.total_points > 0 && <Text size="2">Achievement points: {summary.total_points.toLocaleString()}</Text>}
          {legacy.status === "loaded" && legacy.data.total > 0 && (
            <Text size="2">Legacy Points: <strong>{legacy.data.earned.toLocaleString()}</strong> / {legacy.data.total.toLocaleString()}</Text>
          )}
        </Flex>
        <Text as="p" size="1" color="gray" mb="4">Only achievements reported for this character are shown. Legacy Points count the account's completed achievements that award them; points spent aren't in Blizzard's data.</Text>
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
