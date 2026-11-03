import React, { useEffect, useState } from 'react';
import { Card, SegmentedControl, Slider } from "@radix-ui/themes";
import "./class-leaderboard-analytic.css"
import { Dragonblight } from "../../clients/Dragonblight";
import { useNavigate, useParams } from "react-router";
import { ClassColor } from '../../helpers/classColorHelper';
import { brackets } from "../../helpers/game-flavor";
import { bracketLabels, bracketSlug } from "../../helpers/solo-bracket-specs";

//these need to match SpecStatRatings on the server, which only counts these ratings
const minRating = 1500;
const maxRating = 2700;
const ratingStep = 100;

//the header and every row share these columns so they line up: name, player count, percentage
const specColumns = "grid grid-cols-[minmax(0,1fr)_4rem_4rem] gap-2 items-center";

const ClassAnalytics: React.FC = () => {
  const { URLregion, URLbracket } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [region, setRegion] = useState<string>(URLregion ?? "us");
  const [bracket, setBracket] = useState<string>(URLbracket ?? "3v3");
  const [rating, setRating] = useState<number>(1500);
  const [specStats, setSpecStats] = useState<Dragonblight.SpecRatingCounts[]>([]);

  useEffect(() => {
    setLoading(true);
    const fetchData = async () => {
      const client = new Dragonblight.LeaderboardAnalyticsClient();
      setSpecStats(await client.getSpecStatistics(region, bracket));
      setLoading(false);
    };

    fetchData().catch(console.error);
  }, [region, bracket]);

  function BracketClick(bracketName: string) {
    if (bracket !== bracketName) {
      navigate(`/class-stats/${region}/${bracketName}`, { replace: true });
      setBracket(bracketName);
    }
  }

  function RegionClick(regionName: string) {
    if (region !== regionName) {
      navigate(`/class-stats/${regionName}/${bracket}`, { replace: true });
      setRegion(regionName);
    }
  }

  const specCounts = new Map<string, { className: string; specName: string; count: number }>();
  for (const stat of specStats) {
    const count = stat.playersAtRating[rating] ?? 0;
    if (count > 0) {
      //count for a selected rating
      specCounts.set(stat.specName + " " + stat.className, { className: stat.className, specName: stat.specName, count });
    }
  }
  //sorts the specs by count descending and stores each spec in an array for the rows
  const sortedSpecs = [...specCounts.values()].sort((a, b) => b.count - a.count);
  const totalPlayers = sortedSpecs.reduce((total, s) => total + s.count, 0);

  const bracketName = brackets().find((name) => bracketSlug(name) == bracket) ?? bracket;
  const bracketLabel = bracketLabels[bracketName] ?? bracket;

  const ratingSlider = (
    <Card className="flex items-center gap-3 w-[300px] h-8 py-0 px-3 [--card-background-color:#292c31]">
      <span className="whitespace-nowrap text-sm">Min Rating: {rating}</span>
      <Slider
        min={minRating}
        max={maxRating}
        step={ratingStep}
        value={[rating]}
        disabled={loading}
        onValueChange={([value]) => setRating(value)}
      />
    </Card>
  );

  return (
    <div className="mobileOnlyFull w-[60vw] min-h-[90vh]">
      <div className="flex-col">
        <div className="flex-row justify-center items-center flex gap-3 px-0 py-3 flex-wrap">
          <div className={loading ? "div-disabled" : ""}>
            <SegmentedControl.Root
              className="w-[300px] grow-0"
              defaultValue={URLbracket ?? "3v3"}
            >
              {brackets().map((name) => (
                <SegmentedControl.Item key={name} onClick={() => BracketClick(bracketSlug(name))} value={bracketSlug(name)}>
                  {bracketLabels[name]}
                </SegmentedControl.Item>
              ))}
            </SegmentedControl.Root>
          </div>
          <div className="db-grow"></div>
          {ratingSlider}
          <div className={loading ? "div-disabled" : ""}>
            <SegmentedControl.Root
              className="w-[100px] grow-0"
              defaultValue={URLregion ?? "us"}
            >
              <SegmentedControl.Item onClick={() => RegionClick("us")} value="us">
                US
              </SegmentedControl.Item>
              <SegmentedControl.Item onClick={() => RegionClick("eu")} value="eu">
                EU
              </SegmentedControl.Item>
            </SegmentedControl.Root>
          </div>
        </div>
        <Card className="w-full [--card-background-color:#292c31]">
          <h2 className="text-center text-sm font-bold text-white pb-2">{bracketLabel} Spec Stats</h2>
          {/* px-[10px] matches a row's border plus its padding, which keeps these headers over their columns */}
          <div className={`${specColumns} px-[10px] pb-1 text-sm font-bold text-white`}>
            <span>Specialization</span>
            <span className="text-right">Players</span>
            <span className="text-right">%</span>
          </div>
          <div className="flex flex-col gap-1">
            {sortedSpecs.map((s) => {
              const percent = s.count / totalPlayers * 100;
              //sortedSpecs is highest first, so the top spec fills its whole row and the rest are sized against it
              const barWidth = s.count / sortedSpecs[0].count * 100;
              return (
                <div key={s.specName + " " + s.className} className="relative h-10 overflow-hidden rounded border-2 border-black">
                  <div
                    className="absolute inset-y-0 left-0 transition-[width] duration-300"
                    style={{ width: `${barWidth}%`, backgroundColor: ClassColor.get(s.className) }}
                  />
                  {/* the outline keeps the text readable on both the class color and the dark background */}
                  <div className={`${specColumns} relative h-full px-2 text-sm font-bold text-white [text-shadow:0_0_3px_black,0_0_3px_black]`}>
                    <span className="flex items-center gap-2 min-w-0">
                      <img
                        className="w-6 h-6 shrink-0"
                        src={`/Specs/${s.specName.toLowerCase()}_${s.className.toLowerCase()}.png`}
                        alt=""
                      />
                      <span className="truncate">{s.specName} {s.className}</span>
                    </span>
                    <span className="text-right">{s.count}</span>
                    <span className="text-right">{percent.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ClassAnalytics;
