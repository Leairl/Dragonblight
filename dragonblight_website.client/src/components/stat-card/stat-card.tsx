import React from "react";
import { Card } from "@radix-ui/themes";

// One card of bars, as the retail and classic Stats page draws them: a title, a header row, and
// one bar per class, spec or race, sized against the top row. Shared with the Forever stats page.

//the header and every row share these columns so they line up: name, player count, percentage
const statColumns = "grid grid-cols-[minmax(0,1fr)_3.5rem_3.5rem] gap-2 items-center";

export interface StatRow {
  name: string;
  icon: string;
  count: number;
  barColor?: string;
  selected?: boolean;
  onClick?: () => void;
}

interface StatCardProps {
  title: string;
  nameHeader: string;
  //highest count first, so the top row fills its whole width and the rest are sized against it
  rows: StatRow[];
  //what the percentages are out of, which can be more than the rows add up to when they are filtered
  total: number;
  className?: string;
  //shown when there are no rows; retail and classic filter by rating, Forever doesn't
  emptyText?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, nameHeader, rows, total, className, emptyText }) => {
  let shownEmptyText = "No players at this rating";
  if (emptyText !== undefined) {
    shownEmptyText = emptyText;
  }
  return (
    <Card className={`w-full self-start [--card-background-color:#292c31] ${className ?? ""}`}>
      <h2 className="text-center text-sm font-bold text-white pb-2">{title}</h2>
      {/* px-[10px] matches a row's border plus its padding, which keeps these headers over their columns */}
      <div className={`${statColumns} px-[10px] pb-1 text-sm font-bold text-white`}>
        <span>{nameHeader}</span>
        <span className="text-right">Players</span>
        <span className="text-right">%</span>
      </div>
      {rows.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-4">{shownEmptyText}</p>
      )}
      <div className="flex flex-col gap-1">
        {rows.map((row) => {
          const barWidth = row.count / rows[0].count * 100;
          const percent = row.count / total * 100;

          let borderColor = "border-black";
          if (row.selected) {
            borderColor = "border-white";
          }
          const rowClass = `relative block w-full h-10 overflow-hidden rounded border-2 text-left ${borderColor}`;

          const rowContent = (
            <>
              <div
                className="absolute inset-y-0 left-0 transition-[width] duration-300"
                style={{ width: `${barWidth}%`, backgroundColor: row.barColor }}
              />
              {/* the outline keeps the text readable on both the bar color and the dark background */}
              <div className={`${statColumns} relative h-full px-2 text-sm font-bold text-white [text-shadow:0_0_3px_black,0_0_3px_black]`}>
                <span className="flex items-center gap-2 min-w-0">
                  {/* an icon that doesn't exist, like a race new to Forever, falls back to the unknown icon */}
                  <img
                    className="w-6 h-6 shrink-0"
                    src={row.icon}
                    alt=""
                    onError={(e) => {
                      if (!e.currentTarget.src.endsWith("/unknown.png")) {
                        e.currentTarget.src = "/unknown.png";
                      }
                    }}
                  />
                  <span className="truncate" title={row.name}>{row.name}</span>
                </span>
                <span className="text-right">{row.count}</span>
                <span className="text-right">{percent.toFixed(1)}%</span>
              </div>
            </>
          );

          if (row.onClick) {
            return (
              <button
                key={row.name}
                type="button"
                className={`${rowClass} cursor-pointer`}
                aria-pressed={row.selected}
                onClick={row.onClick}
              >
                {rowContent}
              </button>
            );
          }
          return <div key={row.name} className={rowClass}>{rowContent}</div>;
        })}
      </div>
    </Card>
  );
};

export default StatCard;
