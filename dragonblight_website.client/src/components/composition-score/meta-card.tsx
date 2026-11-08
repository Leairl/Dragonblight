import React from "react";
import { Card } from "@radix-ui/themes";
import { Dragonblight } from "../../clients/Dragonblight";
import { ClassColor } from "../../helpers/classColorHelper";
import { GameFlavor } from "../../helpers/game-flavor";
import { SpecProfile } from "../../helpers/composition-score";
import { latestTuning, TuningDirection, tuningFor } from "../../helpers/tuning-notes";

const directionColors: Record<TuningDirection, string> = { Buff: "#3fb950", Nerf: "#e5484d", Mixed: "#e3b341", "PvE only": "#9ca3af" };

function formatTime(value: string | undefined): string {
  if (!value) {
    return "";
  }
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

//Win rates come from the 3v3 activity still kept, which only goes back about half a day, and tuning from
//the latest Blizzard post. The page fetches the win rates, since the score's live data uses them too. Tuning doesn't change the score yet.
const MetaCard: React.FC<{ team: SpecProfile[]; flavor: GameFlavor; winRates?: Dragonblight.SpecWinRates; loading: boolean; className?: string }> = (props) => {
  const winRates = props.winRates;
  const loading = props.loading;
  const tuning = latestTuning(props.flavor);

  function winRateCell(spec: SpecProfile): React.ReactNode {
    if (loading) {
      return "…";
    }
    const found = winRates?.specs.find((s) => s.className === spec.className && s.specName === spec.specName);
    if (!found || found.wins + found.losses === 0) {
      return <span className="text-gray-500">No games</span>;
    }
    const games = found.wins + found.losses;
    return (
      <span title={`${found.wins} wins, ${found.losses} losses from ${found.players} players`}>
        <span className="font-semibold text-white">{(found.wins / games * 100).toFixed(1)}%</span>
        <span className="text-xs text-gray-400"> · {games} games</span>
      </span>
    );
  }

  function tuningCell(spec: SpecProfile): React.ReactNode {
    if (!tuning) {
      return <span className="text-gray-500">No notes yet</span>;
    }
    const note = tuningFor(tuning, spec.className, spec.specName);
    if (!note) {
      return <span className="text-gray-400">No change</span>;
    }
    return (
      <span title={note.changes.join("\n")}>
        <span className="font-semibold" style={{ color: directionColors[note.direction] }}>{note.direction}</span>
        <span className="block text-xs text-gray-400">{note.changes[0]}</span>
      </span>
    );
  }

  let windowText = "No 3v3 US activity is stored right now.";
  if (winRates?.from) {
    windowText = `From 3v3 US activity, ${formatTime(winRates.from)} to ${formatTime(winRates.to)}.`;
  }

  return (
    <Card className={props.className}>
      <div className="p-2">
        <h2 className="mb-1 font-bold text-white">Meta this week</h2>
        <p className="mb-2 text-xs text-gray-400">
          {windowText} Each team game counts once per player. Win rates feed the score's live data, pulled toward 50% when there are few games; tuning doesn't change it yet.
        </p>
        <table className="w-full table-fixed text-left text-sm">
          <thead className="text-gray-300">
            <tr className="border-b border-black">
              <th className="w-[34%] py-2 font-semibold">Spec</th>
              <th className="w-[28%] py-2 font-semibold">Recent win rate</th>
              <th className="py-2 font-semibold">Latest tuning</th>
            </tr>
          </thead>
          <tbody>
            {props.team.map((spec, slot) => (
              <tr key={slot} className="border-b border-black/40 align-top">
                <td className="py-2 pr-2 font-semibold" style={{ color: ClassColor.get(spec.className) }}>{spec.specName} {spec.className}</td>
                <td className="py-2 pr-2 text-gray-300">{winRateCell(spec)}</td>
                <td className="py-2 text-gray-300">{tuningCell(spec)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {tuning && (
          <p className="mt-2 text-xs text-gray-400">
            Tuning from{" "}
            <a className="text-[#4dc4fd] hover:underline" href={tuning.url} target="_blank" rel="noopener noreferrer">{tuning.title}</a>
            , live {tuning.liveDate}.
          </p>
        )}
      </div>
    </Card>
  );
};

export default MetaCard;
