import { useParams } from "react-router";
import { Button, Card, Flex, Heading, Skeleton, Table, Text } from "@radix-ui/themes";
import { useForeverTab } from "../forever-data";
import { pvpRankName } from "./pvp-rank";
import "./forever-pvp.css";

function ForeverPvp({ faction }: { faction?: string }) {
  const { region, characterSlug } = useParams();
  const [state, retry] = useForeverTab("pvp", region, characterSlug, {
    missing: "PvP data is not available for this character.",
    failed: "Unable to load PvP data. Please try again.",
  });

  if (!region || !characterSlug) return <p>Select a character to view PvP data.</p>;

  const data = state.status === "loaded" ? state.data : undefined;
  const maps = data?.pvp_map_statistics ?? [];

  return (
    <section className="forever-pvp-pane" aria-label="Character PvP summary" aria-busy={state.status === "loading"}>
      <Heading size="4" mb="4">PvP summary</Heading>
      {state.status === "loading" && (
        <div role="status">
          <Text as="p" size="2" color="gray" mb="3">Loading PvP data…</Text>
          <div className="forever-pvp-stats">{[0, 1].map((i) => <Skeleton key={i} height="90px" />)}</div>
        </div>
      )}
      {state.status === "error" && (
        <Flex direction="column" align="start" gap="3" role="alert">
          <Text as="p" size="2">{state.message}</Text>
          <Button variant="soft" color="gray" size="1" onClick={retry}>Retry</Button>
        </Flex>
      )}
      {state.status === "loaded" && data && (
        <>
          <div className="forever-pvp-stats">
            <Card className="border-card">
              <Text as="p" size="2" color="gray">Honorable kills</Text>
              <Heading size="6">{data.honorable_kills?.toLocaleString() ?? "—"}</Heading>
            </Card>
            <Card className="border-card">
              <Text as="p" size="2" color="gray">PvP rank</Text>
              <Heading size="6">{pvpRankName(data.pvp_rank, faction)}</Heading>
            </Card>
          </div>
          <Heading size="3" mt="5" mb="3">Battlegrounds</Heading>
          {maps.length === 0 ? <Text as="p" size="2" color="gray" role="status">No battleground results reported for this character.</Text> : (
            <Table.Root variant="surface" className="forever-pvp-table">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Battleground</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell align="right">Played</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell align="right">Won</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell align="right">Lost</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {maps.map((map, index) => (
                  <Table.Row key={map.world_map?.id ?? index}>
                    <Table.RowHeaderCell>{map.world_map?.name ?? "Unknown battleground"}</Table.RowHeaderCell>
                    <Table.Cell align="right">{map.match_statistics?.played?.toLocaleString() ?? "—"}</Table.Cell>
                    <Table.Cell align="right">{map.match_statistics?.won?.toLocaleString() ?? "—"}</Table.Cell>
                    <Table.Cell align="right">{map.match_statistics?.lost?.toLocaleString() ?? "—"}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </>
      )}
    </section>
  );
}

export default ForeverPvp;
