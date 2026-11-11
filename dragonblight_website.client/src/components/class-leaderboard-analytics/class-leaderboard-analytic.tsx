import React, { useEffect, useState } from 'react';
import { Card, SegmentedControl, Slider } from "@radix-ui/themes";
import "./class-leaderboard-analytic.css"
import { Dragonblight } from "../../clients/Dragonblight";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { ClassColor } from '../../helpers/classColorHelper';
import { RegionFlag } from "../ladder-controls/ladder-controls";
import { brackets } from "../../helpers/game-flavor";
import { bracketLabels, bracketSlug } from "../../helpers/solo-bracket-specs";
import CompositionsCard from "./compositions-card";
import StatCard, { StatRow } from "../stat-card/stat-card";

//these need to match SpecStatRatings on the server, which only counts these ratings
const minRating = 1500;
const maxRating = 2700;
const ratingStep = 100;


//only these brackets have teams to find. Shuffle and Blitz are solo queues, and Rated Battleground teams are too big
const compositionBrackets = ["2v2", "3v3", "5v5"];

//races have no class to take a color from, so they use the site's blue
const raceBarColor = "#4dc4fd";

const ClassAnalytics: React.FC = () => {
  const { URLregion, URLbracket } = useParams();
  const navigate = useNavigate();
  //lives in the url, so a link opens on the page it was shared from
  const [params, setParams] = useSearchParams();
  const showCompositions = params.get("view") === "compositions";
  const [loading, setLoading] = useState<boolean>(true);
  const [region, setRegion] = useState<string>(URLregion ?? "us");
  const [bracket, setBracket] = useState<string>(URLbracket ?? "3v3");
  const [rating, setRating] = useState<number>(1500);
  const [specStats, setSpecStats] = useState<Dragonblight.SpecRatingCounts[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSpec, setSelectedSpec] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const fetchData = async () => {
      const client = new Dragonblight.LeaderboardAnalyticsClient();
      setSpecStats(await client.getSpecStatistics(region, bracket));
      setLoading(false);
    };

    fetchData().catch(console.error);
  }, [region, bracket]);

  function viewQuery(): string {
    if (showCompositions) {
      return "?view=compositions";
    }
    return "";
  }

  //the bracket on screen might have no compositions, so that page opens on 3v3 instead
  function ViewClick(view: string) {
    if (view === "compositions") {
      let nextBracket = bracket;
      if (!compositionBrackets.includes(bracket)) {
        nextBracket = "3v3";
        setBracket(nextBracket);
      }
      navigate(`/class-stats/${region}/${nextBracket}?view=compositions`, { replace: true });
    } else {
      setParams({}, { replace: true });
    }
  }

  function BracketClick(bracketName: string) {
    if (bracket !== bracketName) {
      navigate(`/class-stats/${region}/${bracketName}${viewQuery()}`, { replace: true });
      setBracket(bracketName);
    }
  }

  function RegionClick(regionName: string) {
    if (region !== regionName) {
      navigate(`/class-stats/${regionName}/${bracket}${viewQuery()}`, { replace: true });
      setRegion(regionName);
    }
  }

  //clicking the selected class or spec again clears it. A selected spec may not be in the new class, so it clears too
  function ClassClick(className: string) {
    setSelectedSpec(null);
    if (selectedClass === className) {
      setSelectedClass(null);
    } else {
      setSelectedClass(className);
    }
  }

  function SpecClick(specFullName: string) {
    if (selectedSpec === specFullName) {
      setSelectedSpec(null);
    } else {
      setSelectedSpec(specFullName);
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

  const classCounts = new Map<string, number>();
  for (const s of sortedSpecs) {
    classCounts.set(s.className, (classCounts.get(s.className) ?? 0) + s.count);
  }
  const classRows: StatRow[] = [...classCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([className, count]) => ({
      name: className,
      icon: `/ClassIcons/${className}.png`,
      count,
      barColor: ClassColor.get(className),
      selected: selectedClass === className,
      onClick: () => ClassClick(className),
    }));

  const specRows: StatRow[] = sortedSpecs
    .filter(s => selectedClass === null || s.className === selectedClass)
    .map(s => {
      const specFullName = s.specName + " " + s.className;
      return {
        name: specFullName,
        icon: `/Specs/${s.specName.toLowerCase()}_${s.className.toLowerCase()}.png`,
        count: s.count,
        barColor: ClassColor.get(s.className),
        selected: selectedSpec === specFullName,
        onClick: () => SpecClick(specFullName),
      };
    });

  //the race card follows the selected spec, then the selected class, and otherwise shows everyone
  let raceTitle = "All Races";
  let raceStats = specStats;
  if (selectedSpec !== null) {
    raceTitle = selectedSpec + " Races";
    raceStats = specStats.filter(stat => stat.specName + " " + stat.className === selectedSpec);
  } else if (selectedClass !== null) {
    raceTitle = selectedClass + " Races";
    raceStats = specStats.filter(stat => stat.className === selectedClass);
  }

  const raceCounts = new Map<string, number>();
  for (const stat of raceStats) {
    //a server that hasn't been updated yet sends no races, which should leave this card empty and not crash the page
    const races = stat.racesAtRating?.[rating] ?? {};
    for (const [raceName, count] of Object.entries(races)) {
      raceCounts.set(raceName, (raceCounts.get(raceName) ?? 0) + count);
    }
  }
  const raceRows: StatRow[] = [...raceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([raceName, count]) => ({
      name: raceName,
      icon: `/RaceIcons/${raceName.toLowerCase().replace(" ", "")}-m.png`,
      count,
      barColor: raceBarColor,
    }));
  const totalRacePlayers = raceRows.reduce((total, r) => total + r.count, 0);

  //a selected class leaves only a few specs, so the race card moves up under them on wide screens instead of below the class card
  let classCardPlacement = "";
  let specCardPlacement = "min-[1200px]:col-start-2 min-[1200px]:row-start-1 min-[1200px]:row-span-2";
  let raceCardPlacement = "";
  if (selectedClass !== null) {
    classCardPlacement = "min-[1200px]:row-span-2";
    specCardPlacement = "min-[1200px]:col-start-2 min-[1200px]:row-start-1";
    raceCardPlacement = "min-[1200px]:col-start-2 min-[1200px]:row-start-2";
  }

  const bracketName = brackets().find((name) => bracketSlug(name) == bracket) ?? bracket;
  const bracketLabel = bracketLabels[bracketName] ?? bracket;

  let shownBrackets = brackets();
  if (showCompositions) {
    shownBrackets = shownBrackets.filter((name) => compositionBrackets.includes(name));
  }
  //a shared compositions link can name a bracket that has none
  let compositionBracket = bracket;
  if (!compositionBrackets.includes(bracket)) {
    compositionBracket = "3v3";
  }
  let shownBracket = bracket;
  let viewValue = "stats";
  if (showCompositions) {
    shownBracket = compositionBracket;
    viewValue = "compositions";
  }

  //the bracket picker shrinks to fit a phone, up to its full 300px
  let bracketControlClass = "w-full max-w-[300px]";
  if (loading) {
    bracketControlClass = "div-disabled " + bracketControlClass;
  }

  const ratingSlider = (
    <Card className="flex items-center gap-3 w-full max-w-[300px] h-8 py-0 px-3 [--card-background-color:#292c31]">
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
    <div className="mobileOnlyFull w-[80vw] min-h-[90vh]">
      <div className="flex-col">
        <div className="flex justify-center max-[950px]:justify-start pt-3">
          <SegmentedControl.Root className="slider-border w-full max-w-[300px]" value={viewValue} onValueChange={ViewClick}>
            <SegmentedControl.Item value="stats">Stats</SegmentedControl.Item>
            <SegmentedControl.Item value="compositions">Compositions</SegmentedControl.Item>
          </SegmentedControl.Root>
        </div>
        <div className="flex-row justify-center max-[950px]:justify-start items-center flex gap-3 px-0 py-3 flex-wrap">
          <div className={bracketControlClass}>
            <SegmentedControl.Root
              className="stats-bracket-toggle slider-border w-full grow-0"
              value={shownBracket}
            >
              {shownBrackets.map((name) => (
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
              className="slider-border w-[100px] grow-0"
              defaultValue={URLregion ?? "us"}
            >
              <SegmentedControl.Item onClick={() => RegionClick("us")} value="us">
                <RegionFlag region="us" />
              </SegmentedControl.Item>
              <SegmentedControl.Item onClick={() => RegionClick("eu")} value="eu">
                <RegionFlag region="eu" />
              </SegmentedControl.Item>
            </SegmentedControl.Root>
          </div>
        </div>
        {/* wide screens put class over race on the left and spec on the right. Narrow screens stack them with spec in the
            middle, so picking a class stays next to the specs it filters. The second row takes any spare height,
            which stops a tall spec card from pushing the race card away from the class card */}
        {showCompositions && (
          <CompositionsCard
            region={region}
            bracket={compositionBracket}
            bracketLabel={bracketLabels[compositionBracket] ?? compositionBracket}
            rating={rating}
          />
        )}
        {!showCompositions && <div className="grid grid-cols-1 gap-3 min-[1200px]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] min-[1200px]:grid-rows-[auto_1fr]">
          <StatCard title="Class Stats" nameHeader="Class" rows={classRows} total={totalPlayers} className={classCardPlacement} />
          <StatCard
            title={bracketLabel + " Spec Stats"}
            nameHeader="Specialization"
            rows={specRows}
            total={totalPlayers}
            className={specCardPlacement}
          />
          <StatCard title={raceTitle} nameHeader="Race" rows={raceRows} total={totalRacePlayers} className={raceCardPlacement} />
        </div>}
      </div>
    </div>
  );
};

export default ClassAnalytics;
