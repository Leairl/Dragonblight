import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { Badge, Button, Flex, Heading, Progress, Skeleton, Text, TextField } from "@radix-ui/themes";
import { collectionIcons, loadCollectionIcons, useForeverTab } from "../forever-data";
import { CollectionEntry, CollectionKind, collectionProgress, filterEntries, mountEntries, petEntries, qualityColor, toyEntries } from "./collection-helpers";
import "./forever-collections.css";

function CollectionIcon({ src, pending }: { src?: string; pending: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const source = failed || (!pending && !src) ? "/unknown.png" : src;
  return (
    <span className="forever-collection-icon">
      {!loaded && <Skeleton width="36px" height="36px" />}
      {source && <img src={source} alt="" loading="lazy" style={{ opacity: loaded ? 1 : 0 }}
        onLoad={() => setLoaded(true)} onError={() => { setFailed(true); setLoaded(false); }} />}
    </span>
  );
}

function SummaryTile({ label, collected, total }: { label: string; collected: number; total?: number }) {
  const progress = collectionProgress(collected, total);
  return (
    <div className="forever-collection-tile">
      <Text as="div" size="1" color="gray">{label}</Text>
      <Text as="div" size="5" weight="bold">
        {collected.toLocaleString()}
        {progress && <Text size="2" weight="regular" color="gray"> / {progress.max.toLocaleString()}</Text>}
      </Text>
      {progress && <Progress aria-label={`${label} collected`} aria-valuetext={`${collected} of ${progress.max}`}
        value={progress.value} max={progress.max} size="1" mt="2" />}
    </div>
  );
}

// Pictures for one kind of collectible. They're static and shared by every character, so they're
// cached for the session, and one the server couldn't find is asked for again next time the tab opens.
function useCollectionIcons(kind: CollectionKind, region: string | undefined, entries: CollectionEntry[]) {
  const ids = useMemo(() => [...new Set(entries.map((entry) => entry.id))].sort((a, b) => a - b).join(","), [entries]);
  const key = `${region}/${ids}`;
  const [done, setDone] = useState<string>();
  useEffect(() => {
    if (!region || !ids) return;
    let cancelled = false;
    loadCollectionIcons(kind, region, ids.split(",").map(Number)).then(() => {
      if (!cancelled) setDone(key);
    });
    return () => { cancelled = true; };
  }, [kind, region, ids, key]);
  const settled = done === key;
  const icon = (id: number) => (region ? collectionIcons[kind].get(region, id)?.icon : undefined);
  const pending = !!ids && !settled && !ids.split(",").every((id) => icon(Number(id)));
  return { icon, pending };
}

function CollectionSection({ title, empty, entries, filtered, kind, region }: {
  title: string; empty: string; entries: CollectionEntry[]; filtered: CollectionEntry[];
  kind: CollectionKind; region: string;
}) {
  const { icon, pending } = useCollectionIcons(kind, region, entries);
  return (
    <section className="forever-collection-section" aria-label={title}>
      <Heading as="h3" size="3" mb="2">{title} <Text size="2" color="gray" weight="regular">({entries.length})</Text></Heading>
      {entries.length === 0 ? <Text as="p" size="2" color="gray">{empty}</Text>
        : filtered.length === 0 ? <Text as="p" size="2" color="gray">No matches.</Text> : (
          <ul className="forever-collection-list">
            {filtered.map((entry) => (
              <li key={entry.key} className={entry.muted ? "forever-collection-row is-muted" : "forever-collection-row"}>
                <CollectionIcon src={icon(entry.id)} pending={pending} />
                <span className="forever-collection-text">
                  <Text as="div" size="2" weight="medium" color={qualityColor(entry.quality)} className="forever-collection-name">{entry.name}</Text>
                  {entry.detail && <Text as="div" size="1" color="gray">{entry.detail}</Text>}
                </span>
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}

export default function ForeverCollections() {
  const { region, characterSlug } = useParams();
  const [state, retry] = useForeverTab("collections", region, characterSlug, {
    missing: "Collection data is not available for this character.",
    failed: "Unable to load collections. Please try again.",
  });
  const [query, setQuery] = useState("");

  const data = state.status === "loaded" ? state.data : undefined;
  const mounts = useMemo(() => mountEntries(data?.mounts), [data]);
  const pets = useMemo(() => petEntries(data?.pets), [data]);
  const toys = useMemo(() => toyEntries(data?.toys), [data]);
  const appearanceSlots = data?.appearanceSlots ?? [];
  const appearances = appearanceSlots.reduce((sum, slot) => sum + slot.count, 0);

  if (!region || !characterSlug) return <p>Select a character to view collections.</p>;
  return (
    <section className="forever-collections-pane" aria-label="Character collections" aria-busy={state.status === "loading"}>
      <Heading size="4" mb="4">Collections</Heading>
      {state.status === "loading" && (
        <div role="status">
          <Text as="p" size="2" color="gray" mb="3">Loading collections…</Text>
          <div className="forever-collection-tiles">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height="72px" />)}</div>
          <Skeleton height="160px" mt="4" />
        </div>
      )}
      {state.status === "error" && (
        <Flex direction="column" align="start" gap="3" role="alert">
          <Text as="p" size="2">{state.message}</Text>
          <Button variant="soft" color="gray" size="1" onClick={retry}>Retry</Button>
        </Flex>
      )}
      {state.status === "loaded" && data && <>
        <div className="forever-collection-tiles">
          <SummaryTile label="Mounts" collected={mounts.length} total={data.totals?.mounts} />
          <SummaryTile label="Pets" collected={pets.length} total={data.totals?.pets} />
          <SummaryTile label="Toys" collected={toys.length} total={data.totals?.toys} />
          <SummaryTile label="Appearances" collected={appearances} />
        </div>
        <Text as="p" size="1" color="gray" mb="4">Totals count everything in Forever's game data, including items not yet obtainable.</Text>
        {mounts.length + pets.length + toys.length > 0 && (
          <TextField.Root aria-label="Filter collections" placeholder="Filter mounts, pets and toys…" value={query}
            onChange={(event) => setQuery(event.target.value)} mb="4" />
        )}
        <div className="forever-collection-sections">
          <CollectionSection title="Mounts" empty="No mounts collected." entries={mounts} filtered={filterEntries(mounts, query)} kind="mount" region={region} />
          <CollectionSection title="Pets" empty="No pets collected." entries={pets} filtered={filterEntries(pets, query)} kind="pet" region={region} />
          <CollectionSection title="Toys" empty="No toys collected." entries={toys} filtered={filterEntries(toys, query)} kind="toy" region={region} />
        </div>
        <section className="forever-collection-section" aria-label="Appearances">
          <Heading as="h3" size="3" mb="2">Appearances by slot</Heading>
          {appearanceSlots.length === 0 ? <Text as="p" size="2" color="gray">No appearances collected.</Text> : (
            <ul className="forever-appearance-slots">
              {appearanceSlots.map((slot) => (
                <li key={slot.type || slot.name} className={slot.count === 0 ? "is-muted" : undefined}>
                  <Text size="2">{slot.name}</Text>
                  <Badge color="gray" variant="soft">{slot.count.toLocaleString()}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </>}
    </section>
  );
}
