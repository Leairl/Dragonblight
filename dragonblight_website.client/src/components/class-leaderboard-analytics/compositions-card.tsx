import React, { useEffect, useState } from "react";
import { Card, Skeleton } from "@radix-ui/themes";
import { Dragonblight } from "../../clients/Dragonblight";
import { ClassColor } from "../../helpers/classColorHelper";
import { specIcon } from "../../helpers/classIconHelper";
import { specsForFlavor } from "../../helpers/composition-score";
import { getFlavor } from "../../helpers/game-flavor";

const compositionColumns = "grid grid-cols-[1.5rem_minmax(0,1fr)_3.5rem_3.5rem] gap-2 items-center";
const barColor = "#4dc4fd33";
const shownCompositions = 25;

//Healers always go last. In 2v2 the damage specs share one group, and in bigger teams casters and other
//ranged specs go before melee. Tanks and anything unknown sit with melee.
function roleOrder(spec: Dragonblight.CompositionSpec, teamSize: number): number {
  const profile = specsForFlavor(getFlavor()).find((s) => s.className === spec.className && s.specName === spec.specName);
  if (profile?.role === "Healer") {
    return 2;
  }
  if (profile?.role === "Ranged DPS" && teamSize > 2) {
    return 1;
  }
  return 0;
}

//Compared by character code rather than locale, so specs in the same role read in ASCII order
function compareAscii(a: string, b: string): number {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

function sortSpecs(specs: Dragonblight.CompositionSpec[]): Dragonblight.CompositionSpec[] {
  return [...specs].sort((a, b) =>
    roleOrder(a, specs.length) - roleOrder(b, specs.length) || compareAscii(a.specName, b.specName) || compareAscii(a.className, b.className));
}

interface CompositionsCardProps {
  region: string;
  bracket: string;
  bracketLabel: string;
  rating: number;
}

//The team compositions played by the most different teams at a rating over the last week. Teams are worked
//out from players gaining the same record between ladder syncs, so these are estimates rather than Blizzard's data.
const CompositionsCard: React.FC<CompositionsCardProps> = (props) => {
  const [compositions, setCompositions] = useState<Dragonblight.CompositionCounts[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    new Dragonblight.LeaderboardAnalyticsClient()
      .getCompositions(props.region, props.bracket)
      .then((result) => {
        if (!cancelled) {
          setCompositions(result ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCompositions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [props.region, props.bracket]);

  const rows = compositions
    .map((composition) => ({ specs: sortSpecs(composition.specs), count: composition.countsAtRating[props.rating] ?? 0 }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <Card className="w-full self-start [--card-background-color:#292c31]">
      <h2 className="text-center text-sm font-bold text-white">Most Popular {props.bracketLabel} Compositions</h2>
      <p className="text-center text-xs text-gray-400 pb-2">
        Different teams over the last 7 days, estimated from players with matching results between ladder syncs
      </p>
      <div className={`${compositionColumns} px-[10px] pb-1 text-sm font-bold text-white`}>
        <span>#</span>
        <span>Composition</span>
        <span className="text-right">Teams</span>
        <span className="text-right">%</span>
      </div>
      {loading && [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="mb-1" height="40px" width="100%" />)}
      {!loading && rows.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-4">
          No compositions seen at this rating yet. They build up as the ladders sync.
        </p>
      )}
      {!loading && (
        <div className="flex flex-col gap-1">
          {rows.slice(0, shownCompositions).map((row, index) => (
            <div
              key={row.specs.map((s) => s.specName + s.className).join()}
              className="relative overflow-hidden rounded border-2 border-black"
            >
              <div
                className="absolute inset-y-0 left-0 transition-[width] duration-300"
                style={{ width: `${row.count / rows[0].count * 100}%`, backgroundColor: barColor }}
              />
              <div className={`${compositionColumns} relative min-h-10 px-2 py-1 text-sm font-bold text-white`}>
                <span>{index + 1}</span>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
                  {row.specs.map((spec, specIndex) => (
                    <span
                      key={specIndex}
                      className="flex items-center gap-1"
                      title={`${spec.specName} ${spec.className}`}
                      style={{ color: ClassColor.get(spec.className) }}
                    >
                      <img className="w-6 h-6 shrink-0" src={specIcon(spec.className, spec.specName)} alt="" />
                      {spec.specName}
                    </span>
                  ))}
                </span>
                <span className="text-right">{row.count}</span>
                <span className="text-right">{(row.count / total * 100).toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default CompositionsCard;
