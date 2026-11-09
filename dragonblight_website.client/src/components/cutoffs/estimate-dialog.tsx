import { FC, ReactElement, useState } from "react";
import { Dialog, Flex, SegmentedControl, Table } from "@radix-ui/themes";
import * as Avatar from "@radix-ui/react-avatar";
import { useNavigate } from "react-router";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Dragonblight } from "../../clients/Dragonblight";
import { ClassColor } from "../../helpers/classColorHelper";
import { TitleColors } from "../../helpers/ratingTierHelper";
import { realmDisplayName } from "../../helpers/realmNameHelper";
import { classIcon, specIcon } from "../../helpers/classIconHelper";
import { isBlitzBracket, isShuffleBracket } from "../../helpers/solo-bracket-specs";
import { MobileDetailRow, MobileDetailsDialog } from "../ladder-controls/ladder-controls";
import { getFlavor } from "../../helpers/game-flavor";

//a character needs this many wins in the season to be able to earn the title
function requiredWins(bracket: string): number {
  if (getFlavor() === "classic" || isShuffleBracket(bracket) || isBlitzBracket(bracket)) {
    return 50;
  }
  return 150;
}

interface EstimateDialogProps {
  region: string;
  title: string;
  estimate: Dragonblight.EstimatedCutoff;
  //what opens the popup, when it shouldn't be the graph button
  trigger?: ReactElement;
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

//one sync's details in a row above the graph: Blizzard's cutoff, plus the estimate and how its spots split in that view
function EstimateReadout({ point, showEstimate }: { point: ChartPoint; showEstimate: boolean }) {
  return (
    <div className="estimate-readout">
      <span className="estimate-readout-time">{point.time}</span>
      {showEstimate && <span>Estimated: <b>{point.estimated}</b> - Top {point.rank}</span>}
      <span>Blizzard Cutoff: {point.cutoff}</span>
      {showEstimate && <span>{point.spots} Spots + {point.alts} Alts</span>}
    </div>
  );
}

function roleText(entry: Dragonblight.EstimateInsideEntry): string {
  if (entry.isAlt) {
    return `Alt of ${entry.mainName}`;
  }
  return "Main";
}

//alts don't take a spot, so they read quieter than the mains
function rowClass(entry: Dragonblight.EstimateInsideEntry): string {
  if (entry.isAlt) {
    return "estimate-alt";
  }
  return "";
}

//the same icons as the rankings table, and a character without a synced profile shows the unknown one
function raceIcon(entry: Dragonblight.EstimateInsideEntry): string {
  if (!entry.raceName) {
    return "/unknown.png";
  }
  let genderSuffix = "-m";
  if (entry.gender == "Female") {
    genderSuffix = "-f";
  }
  return `/RaceIcons/${entry.raceName.toLowerCase().replace(" ", "")}${genderSuffix}.png`;
}

//ratings at or above the cutoff being looked at get the title's color
function PlayerRow({ entry, title, ratingCutoff, region, bracket }: { entry: Dragonblight.EstimateInsideEntry; title: string; ratingCutoff: number; region: string; bracket: string }) {
  const navigate = useNavigate();
  const winsNeeded = requiredWins(bracket) - entry.won;
  let ratingClass = "";
  if (entry.rating >= ratingCutoff) {
    ratingClass = TitleColors(title) + " text-shadow-md text-shadow-black";
  }
  return (
    <Table.Row
      className={"hover:bg-gray-200/20 cursor-pointer " + rowClass(entry)}
      onClick={() => navigate(`/profile/${region}/${entry.realm}/${entry.name}`)}
    >
      <Table.Cell>{entry.rank}</Table.Cell>
      <Table.Cell>
        <Flex>
          {[raceIcon(entry), classIcon(entry.className), specIcon(entry.className, entry.specName)].map((icon, index) => (
            <Avatar.Root key={index} className="h-[23px] w-[23px] mr-1">
              <Avatar.Image src={icon} />
              <Avatar.Fallback />
            </Avatar.Root>
          ))}
          <span style={{ color: ClassColor.get(entry.className) }}>{entry.name}</span>
        </Flex>
      </Table.Cell>
      <Table.Cell className="desktopOnly">{realmDisplayName(entry.realm)}</Table.Cell>
      <Table.Cell className={"desktopOnly " + ratingClass}>{entry.rating}</Table.Cell>
      <Table.Cell className="desktopOnly text-green-300">{entry.won}</Table.Cell>
      <Table.Cell className="desktopOnly text-red-300">{entry.lost}</Table.Cell>
      <Table.Cell className="desktopOnly">{roleText(entry)}</Table.Cell>
      <Table.Cell className="desktopOnly">
        {winsNeeded > 0 && <span className="cutoff-player-flag">Needs {winsNeeded} wins</span>}
      </Table.Cell>
      {/* the popup's clicks still reach this row through React, and the row opens the profile */}
      <Table.Cell className="mobileOnly" onClick={(event) => event.stopPropagation()}>
        <MobileDetailsDialog region={region} realm={entry.realm} characterName={entry.name}>
          <MobileDetailRow label="Rank">{entry.rank}</MobileDetailRow>
          <MobileDetailRow label="Rating" valueClassName={ratingClass}>{entry.rating}</MobileDetailRow>
          <MobileDetailRow label="Player">{entry.name}</MobileDetailRow>
          <MobileDetailRow label="Class">
            <span style={{ color: ClassColor.get(entry.className) }}>{entry.className}</span>
          </MobileDetailRow>
          <MobileDetailRow label="Spec">{entry.specName}</MobileDetailRow>
          <MobileDetailRow label="Server">{realmDisplayName(entry.realm)}</MobileDetailRow>
          <MobileDetailRow label="Wins" valueClassName="text-green-300">{entry.won}</MobileDetailRow>
          <MobileDetailRow label="Losses" valueClassName="text-red-300">{entry.lost}</MobileDetailRow>
          <MobileDetailRow label="Spot">{roleText(entry)}</MobileDetailRow>
          {winsNeeded > 0 && (
            <MobileDetailRow label="Title" valueClassName="cutoff-player-flag">Needs {winsNeeded} wins</MobileDetailRow>
          )}
        </MobileDetailsDialog>
      </Table.Cell>
    </Table.Row>
  );
}

const EstimateDialog: FC<EstimateDialogProps> = (props) => {
  const [detail, setDetail] = useState<Dragonblight.EstimateDetail>();
  const [hoveredIndex, setHoveredIndex] = useState<number>();
  const [view, setView] = useState<string>("original");

  //only fetched when the popup opens, so the cards stay one request
  async function onOpenChange(open: boolean) {
    if (!open) {
      return;
    }
    setView("original");
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

  const showEstimate = view === "estimated";

  //every sync records the cutoff, but it only moves when Blizzard updates it, so that graph keeps just those syncs
  let chartPoints = points.filter((p, index) => index == 0 || p.cutoff != points[index - 1].cutoff);
  let description = "";
  //each view lists the characters inside its own cutoff
  let players = detail?.qualifiedAtCutoff ?? [];
  let ratingCutoff = props.estimate.ratingCutoff;
  if (showEstimate) {
    chartPoints = points;
    description = "";
    players = detail?.estimate?.inside ?? [];
    ratingCutoff = detail?.estimate?.estimatedRating ?? props.estimate.estimatedRating;
  }

  //the row above the graph shows the latest point until one is hovered, so it always has something to show
  const shownPoint = chartPoints[hoveredIndex ?? chartPoints.length - 1];

  //points only show on hover, but a line needs two points to draw, so a lone point would otherwise be invisible
  let lonePointDot: false | { r: number } = false;
  if (chartPoints.length == 1) {
    lonePointDot = { r: 4 };
  }

  return (
    <Dialog.Root onOpenChange={onOpenChange}>
      <Dialog.Trigger>
        {props.trigger ?? (
          <button type="button" className="cutoff-estimate-button cutoff-estimate-open" aria-label="Cutoff graph" title="Cutoff graph">
            <svg width="20" height="20" viewBox="0 0 25 25" fill="none" aria-hidden>
              <path d="M5.5 5V19.5H20M7.5 16L11.5 11.5L15.5 14L19.5 8.5" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </button>
        )}
      </Dialog.Trigger>
      <Dialog.Content maxWidth={{ initial: "95vw", md: "75vw" }}>
        <Dialog.Title className={"text-shadow-md text-shadow-black " + TitleColors(props.title)}>{props.title}</Dialog.Title>
        <Dialog.Description size="2" color="gray">
          {description}
        </Dialog.Description>

        <SegmentedControl.Root className="estimate-view-toggle" value={view} onValueChange={setView}>
          <SegmentedControl.Item value="original">Original</SegmentedControl.Item>
          <SegmentedControl.Item value="estimated">Estimated</SegmentedControl.Item>
        </SegmentedControl.Root>

        <div className="estimate-chart">
          {shownPoint && <EstimateReadout point={shownPoint} showEstimate={showEstimate} />}
          <ResponsiveContainer width="100%" height={380}>
            <LineChart
              data={chartPoints}
              margin={{ top: 12, right: 16, bottom: 4, left: 0 }}
              onMouseMove={(state) => setHoveredIndex(state.activeTooltipIndex)}
              onMouseLeave={() => setHoveredIndex(undefined)}
            >
              <CartesianGrid stroke="#ffffff14" vertical={false} />
              <XAxis dataKey="time" stroke="#8f857c" fontSize={11} tickLine={false} />
              <YAxis domain={["dataMin - 10", "dataMax + 10"]} stroke="#8f857c" fontSize={11} tickLine={false} width={44} />
              {/* draws nothing itself, but Recharts only shows the hovered point when a Tooltip is present */}
              <Tooltip content={() => null} />
              {showEstimate && (
                <Line name="Estimated" dataKey="estimated" stroke="rgb(250, 158, 53)" strokeWidth={2} dot={lonePointDot} activeDot={{ r: 5 }} isAnimationActive={false} />
              )}
              {!showEstimate && (
                <Line name="Blizzard cutoff" dataKey="cutoff" stroke="#5d87d6" strokeWidth={2} dot={lonePointDot} activeDot={{ r: 5 }} isAnimationActive={false} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <Table.Root variant="ghost" size="1" className="estimate-table">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Rank</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Character</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell className="desktopOnly">Realm</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell className="desktopOnly">Rating</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell className="desktopOnly">Wins</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell className="desktopOnly">Losses</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell className="desktopOnly">Spot</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell className="desktopOnly"></Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell className="mobileOnly">Details</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {players.map((entry) => (
              <PlayerRow key={entry.characterId} entry={entry} title={props.title} ratingCutoff={ratingCutoff} region={props.region} bracket={props.estimate.bracket} />
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
