import { FC, useState } from "react";
import { Dialog } from "@radix-ui/themes";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, TooltipProps, XAxis, YAxis } from "recharts";
import { useParams } from "react-router";
import { Dragonblight } from "../../../clients/Dragonblight";
import { CounterClockwiseClockIcon } from "@radix-ui/react-icons";


interface RatingHistoryDialogProps {
    title: string;
    bracketType: string;
    specId?: number;
}

//one point on the graph; time is a number so the gaps between points match the real time between them
interface ChartPoint {
    time: number;
    rating: number;
    change: number;
    rank: number;
    sessionWon: number;
    sessionLost: number;
}

function dayLabel(time: number): string {
    return new Date(time).toLocaleString(undefined, { month: "short", day: "numeric" });
}

function fullTimeLabel(time: number): string {
    return new Date(time).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function changeText(change: number): string {
    if (change == 0) {
        return "First Recorded";
    }
    if (change > 0) {
        return `+${change}`;
    }
    return `${change}`;
}
function sessionWinRateText(point: ChartPoint): string {
    const played = point.sessionWon + point.sessionLost;
    if (played == 0) {
        return "";
    }
    const winRate = Math.round((point.sessionWon / played) * 100);
    return `Win Rate: ${winRate}% (${point.sessionWon} - ${point.sessionLost})`;
}

function HistoryTooltip({ active, payload }: TooltipProps<number, string>) {
    if (!active || !payload || payload.length == 0) {
        return null;
    }
    const point = payload[0].payload as ChartPoint;
    return (
        <div className="rating-history-tooltip">
            <div className="rating-history-tooltip-time">{fullTimeLabel(point.time)}</div>
            <div>Rating: <b>{point.rating}</b> ({changeText(point.change)})</div>
            <div>Rank: {point.rank}</div>
            <div>{sessionWinRateText(point)}</div>
        </div>
    );
}
const RatingHistoryDialog: FC<RatingHistoryDialogProps> = (props) => {
    const { region, server, characterName } = useParams();
    const [history, setHistory] = useState<Dragonblight.RatingHistoryPoint[]>();
    const [failed, setFailed] = useState<boolean>(false);

    //only fetched when the popup opens, so loading a profile doesn't request every bracket's history
    async function onOpenChange(open: boolean) {
        if (!open) {
            return;
        }
        setHistory(undefined);
        setFailed(false);
        try {
            const client = new Dragonblight.PvpStatClient();
            const slug = server?.replace(" ", "-");
            setHistory(await client.getRatingHistory(slug, characterName, region, props.bracketType, props.specId));
        } catch {
            setFailed(true);
        }
    }

    const points: ChartPoint[] = (history ?? []).map((p, index, all) => {
        //the first point has nothing before it, so it stays at 0 - 0
        let sessionWon = 0;
        let sessionLost = 0;
        if (index > 0) {
            sessionWon = p.won - all[index - 1].won;
            sessionLost = p.lost - all[index - 1].lost;
        }
        return {
            time: new Date(p.recordedAt).getTime(),
            rating: p.rating,
            change: p.change,
            rank: p.rank,
            sessionWon: sessionWon,
            sessionLost: sessionLost,
        };
    });

    function getBody() {
        if (failed) {
            return <p className="rating-history-message">Could not load the rating history.</p>;
        }
        if (!history) {
            return <p className="rating-history-message">Loading...</p>;
        }
        if (points.length == 0) {
            return <p className="rating-history-message">No history recorded for this bracket yet.</p>;
        }
        return (
            <div className="rating-history-chart">
                <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={points} margin={{ top: 100, right: 16, bottom: 4, left: 0 }}>
                        <CartesianGrid stroke="#ffffff14" vertical={false} />
                        <XAxis dataKey="time" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={dayLabel} stroke="#8f857c" fontSize={11} tickLine={false} />
                        <YAxis domain={["dataMin - 20", "dataMax + 20"]} stroke="#8f857c" fontSize={11} tickLine={false} width={44} />
                        <Tooltip content={<HistoryTooltip />} position={{ y: 0 }} animationDuration={150} />
                        <Line dataKey="rating" stroke="rgb(250, 158, 53)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 5 }} isAnimationActive={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        );
    }

    return (
        <Dialog.Root onOpenChange={onOpenChange}>
            <Dialog.Trigger>
                <button type="button" className="rating-history-button" aria-label="Rating history" title="Rating history">
                    <CounterClockwiseClockIcon width={20} height={20} />
                </button>
            </Dialog.Trigger>
            <Dialog.Content maxWidth="760px">
                <Dialog.Title>{props.title} Rating History</Dialog.Title>
                {getBody()}
                <Dialog.Close>
                    <button type="button" className="rating-history-button">Close</button>
                </Dialog.Close>
            </Dialog.Content>
        </Dialog.Root>
    );
};

export default RatingHistoryDialog;
