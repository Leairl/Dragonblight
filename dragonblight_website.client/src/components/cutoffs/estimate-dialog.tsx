import { FC, useState } from "react";
import { Dialog, Table } from "@radix-ui/themes";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, TooltipProps, XAxis, YAxis } from "recharts";
import { Dragonblight } from "../../clients/Dragonblight";
import { realmDisplayName } from "../../helpers/realmNameHelper";

interface EstimateDialogProps {
  region: string;
  title: string;
  estimate: Dragonblight.EstimatedCutoff;
}

//one point on the graph, flattened from a history point
interface ChartPoint {
  time: string;
  estimated: number;
  cutoff: number;
  rank: number;
  spots: number;
  alts: number;
}

function syncLabel(time: Date | string): string {
  return new Date(time).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric" });
}

function roleText(entry: Dragonblight.EstimateInsideEntry): string {
  if (entry.isAlt) {
    return `Alt of ${entry.mainName}`;
  }
  return "Main";
}

function rowClass(entry: Dragonblight.EstimateInsideEntry): string {
  if (entry.isAlt) {
    return "estimate-alt";
  }
  return "";
}

//the hovered sync: both lines plus the rank and how the spots split
function EstimateTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length == 0) {
    return null;
  }
  const point = payload[0].payload as ChartPoint;
  return (
    <div className="estimate-tooltip">
      <div className="estimate-tooltip-time">{point.time}</div>
      <div>Estimated: <b>{point.estimated}</b> - Top {point.rank} </div>
      <div>Blizzard Cutoff: {point.cutoff}</div>
      <div>{point.spots} Spots + {point.alts} Alts</div>
    </div>
  );
}

const EstimateDialog: FC<EstimateDialogProps> = (props) => {
  const [detail, setDetail] = useState<Dragonblight.EstimateDetail>();

  //only fetched when the popup opens, so the cards stay one request
  async function onOpenChange(open: boolean) {
    if (!open) {
      return;
    }
    const client = new Dragonblight.PvpLeaderboardClient();
    setDetail(await client.getEstimateDetail(props.region, props.estimate.bracket, props.estimate.achievementId));
  }

  const points: ChartPoint[] = (detail?.history ?? []).map((p) => ({
    time: syncLabel(p.time),
    estimated: p.estimatedRating,
    cutoff: p.ratingCutoff,
    rank: p.estimatedRank,
    spots: p.spots,
    alts: p.altsInside,
  }));

  return (
    <Dialog.Root onOpenChange={onOpenChange}>
      <Dialog.Trigger>
        <button className="cutoff-estimate-button">Est.</button>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="760px">
        <Dialog.Title>{props.title}</Dialog.Title>
        <Dialog.Description size="2" color="gray">
          The estimated cutoff after every ladder sync, counting one spot per battle.net account.
        </Dialog.Description>

        <div className="estimate-chart">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={points} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="#ffffff14" vertical={false} />
              <XAxis dataKey="time" stroke="#8f857c" fontSize={11} tickLine={false} />
              <YAxis domain={["dataMin - 10", "dataMax + 10"]} stroke="#8f857c" fontSize={11} tickLine={false} width={44} />
              <Tooltip content={<EstimateTooltip />} />
              <Legend />
              <Line name="Estimated" dataKey="estimated" stroke="rgb(250, 158, 53)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 5 }} isAnimationActive={false} />
              <Line name="Blizzard cutoff" dataKey="cutoff" type="stepAfter" stroke="#5d87d6" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <Table.Root variant="surface" size="1" className="estimate-table">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Rank</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Character</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Realm</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Rating</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Spot</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {(detail?.estimate?.inside ?? []).map((entry) => (
              <Table.Row key={entry.characterId} className={rowClass(entry)}>
                <Table.Cell>{entry.rank}</Table.Cell>
                <Table.Cell>{entry.name}</Table.Cell>
                <Table.Cell>{realmDisplayName(entry.realm)}</Table.Cell>
                <Table.Cell>{entry.rating}</Table.Cell>
                <Table.Cell>{roleText(entry)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>

        <Dialog.Close>
          <button className="cutoff-estimate-button estimate-close">Close</button>
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default EstimateDialog;
