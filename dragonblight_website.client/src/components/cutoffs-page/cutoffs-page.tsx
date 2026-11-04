import { FC, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Card, Heading, SegmentedControl, Table } from "@radix-ui/themes";
import { Dragonblight } from "../../clients/Dragonblight";
import { SoloSpecIcon } from "../../helpers/solo-bracket-specs";
import { TitleColors, cleanTitle } from "../../helpers/ratingTierHelper";
import "./cutoffs-page.css";
import { ClassColor } from "../../helpers/classColorHelper";
import ClassFilter, { all_classes } from "../class-filter/class-filter";
import EstimateDialog from "../cutoffs/estimate-dialog";


//Blizzard's bracket types as the headings read them; a type not listed shows as Blizzard sends it
const bracketNames: Record<string, string> = {
  ARENA_2v2: "2v2",
  ARENA_3v3: "3v3",
  ARENA_5v5: "5v5",
  BATTLEGROUNDS: "Rated Battlegrounds",
  SHUFFLE: "Solo Shuffle",
  BLITZ: "Blitz",
};

//one table row: a reward, with the other faction's title folded in when Blizzard lists it twice
interface CutoffRow {
  reward: Dragonblight.PvpSeasonRewardWithRank;
  titles: string[];
}


//where a bracket's table goes on the page, in bracketNames' order rather than the order Blizzard sends them
function bracketPosition(type: string): number {
  const position = Object.keys(bracketNames).indexOf(type);
  if (position == -1) {
    return Object.keys(bracketNames).length;
  }
  return position;
}

//the ladder a bracket's rewards are earned on, the same names the server saves estimates under
function bracketLadder(type: string): string {
  return type.replace("ARENA_", "").replace("BATTLEGROUNDS", "rbg");
}

//RBG lists one title per faction, and only the faction differs: "Hero of the Alliance: Venomous"
function rowTitle(row: CutoffRow): string {
  const alliance = row.titles.find((t) => t.startsWith("Hero of the Alliance"));
  const hasHorde = row.titles.some((t) => t.startsWith("Hero of the Horde"));
  if (alliance != undefined && hasHorde) {
    return "Hero of the Alliance / Horde" + alliance.slice("Hero of the Alliance".length);
  }
  return row.titles.join(" / ");
}

const CutoffsPage: FC = () => {
  const { URLregion } = useParams();
  const region = URLregion ?? "us";
  const navigate = useNavigate();
  const [rewards, setRewards] = useState<Dragonblight.PvpSeasonRewardWithRank[]>([]);
  //spec id -> class name, which a rewaard doesn't crry but the spec icon needs
  const [specClass, setSpecClass] = useState<Map<number, string>>(new Map());
  //"shuffle:spec id" -> that spec's ladder, which is what an estimate is saved under
  const [specLadders, setSpecLadders] = useState<Map<string, string>>(new Map());
  const [estimates, setEstimates] = useState<Dragonblight.EstimatedCutoff[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([all_classes]);

  useEffect(() => {
    const client = new Dragonblight.PvpLeaderboardClient();
    client.getPvPRewards(region).then((r) => setRewards(r ?? [])).catch(() => setRewards([]));
    //the ratings still show without an estimate, they just can't be opened
    client.getEstimatedCutoffs(region).then((e) => setEstimates(e ?? [])).catch(() => setEstimates([]));
    client.getLadderBrackets(region).then((ladders) => {
      const perSpec = (ladders ?? []).filter((ladder) => ladder.specId != null);
      setSpecClass(new Map(perSpec.map((ladder) => [ladder.specId!, ladder.className ?? ""] as [number, string])));
      setSpecLadders(new Map(perSpec.map((ladder) => [`${ladder.ladder}:${ladder.specId}`, ladder.slug] as [string, string])));
    });
  }, [region]);

  //bracket type -> its rows
  const tables = new Map<string, CutoffRow[]>();
  for (const reward of rewards) {
    const type = reward.bracket?.type ?? "";
    const rows = tables.get(type) ?? [];
    const title = cleanTitle(reward.achievement?.name);
    //Blitz and RBG list each reward once per faction with the same cutoff: Marshal and Warlord share a row
    const twin = rows.find((row) =>
      // checking the one we are on vs the one we already saved in tables
      row.reward.specialization?.id === reward.specialization?.id &&
      row.reward.rating_cutoff === reward.rating_cutoff);
    // pushes it on the same row because row is reading from rows which is reading the previously saved list
    if (twin) {
      if (!twin.titles.includes(title)) twin.titles.push(title);
    } else {
      rows.push({ reward, titles: [title] });
    }
    tables.set(type, rows);
  }
  const soloTypes = ["SHUFFLE", "BLITZ"];
  //spec id -> that spec's Shuffle and Blitz rows, so each spec reads across one line
  const soloSpecs = new Map<number, { shuffle?: CutoffRow; blitz?: CutoffRow }>();
  for (const row of tables.get("SHUFFLE") ?? []) {
    soloSpecs.set(row.reward.specialization?.id ?? 0, { shuffle: row });
  }
  for (const row of tables.get("BLITZ") ?? []) {
    const id = row.reward.specialization?.id ?? 0;
    //keeps the Shuffle half if the spec already has one
    soloSpecs.set(id, { ...soloSpecs.get(id), blitz: row });
  }
  //grouped by class; within a class the specs keep Blizzard's order
  const soloSorted = [...soloSpecs].sort(([a], [b]) =>
    (specClass.get(a) ?? "").localeCompare(specClass.get(b) ?? ""));
  //every spec in a bracket earns the same title, so it is shown once above the table
  //only the specs of the picked classes; the title pills above still read from every spec
  const soloShown = selectedClasses.includes(all_classes)
    ? soloSorted
    : soloSorted.filter(([specId]) => selectedClasses.includes(specClass.get(specId) ?? ""));
  const shuffleTitle = soloSorted.find(([, s]) => s.shuffle)?.[1].shuffle?.titles[0];
  const blitzTitle = soloSorted.find(([, s]) => s.blitz)?.[1].blitz?.titles.join(" / ");

  //Glows in the title's color, and opens the ladder's original and estimated cutoffs when it has any.
  //An estimate keeps the cutoff from its last sync, so it can be behind a reward Blizzard has since
  //moved, which is why the achievement counts as a match too.
  function ratingCell(ladder: string | undefined, row: CutoffRow) {
    const color = TitleColors(row.titles[0]) ?? "";
    const estimate = estimates.find((e) => e.bracket == ladder
      && (e.achievementId == row.reward.achievement?.id || e.ratingCutoff == row.reward.rating_cutoff));
    if (estimate == undefined) {
      return <span className={"cutoff-rating-glow " + color}>{row.reward.rating_cutoff}</span>;
    }
    return (
      <EstimateDialog
        region={region}
        title={rowTitle(row)}
        estimate={estimate}
        trigger={
          <button type="button" className={"cutoff-rating-glow cutoff-rating-open " + color}>
            {row.reward.rating_cutoff}
          </button>
        }
      />
    );
  }

  function className(row: CutoffRow): string {
    return specClass.get(row.reward.specialization?.id ?? -1) ?? "";
  }

  function sortByClassnameAndCutoff(rows: CutoffRow[], hasSpecs: boolean) {
    return rows.sort((a, b) => {
      if (hasSpecs) {
        return className(a).localeCompare(className(b))
      }
      return b.reward.rating_cutoff - a.reward.rating_cutoff
    }
    )
  }
  return (
    <div className="cutoffs-wrap flex flex-col px-4 py-3">

      <header className="cutoffs-header">
        <div>
          <h1 className="cutoffs-title">Season Title Cutoffs</h1>
          <p className="cutoffs-subtitle">Rank thresholds for competitive PvP titles</p>
        </div>
        <SegmentedControl.Root className="w-[100px]" value={region}>
          <SegmentedControl.Item value="us" onClick={() => navigate("/cutoffs/us", { replace: true })}>US</SegmentedControl.Item>
          <SegmentedControl.Item value="eu" onClick={() => navigate("/cutoffs/eu", { replace: true })}>EU</SegmentedControl.Item>
        </SegmentedControl.Root>
      </header>

      {/* 3v3, RBG (and classic's tiers): one bar per title */}
      {[...tables].filter(([type]) => !soloTypes.includes(type)).sort(([a], [b]) => bracketPosition(a) - bracketPosition(b)).map(([type, rows]) => (
        <section key={type} className="w-full mb-6">
          <Heading size="4" className="mb-2">{bracketNames[type] ?? type}</Heading>
          <Table.Root variant="surface" size="1" className="cutoff-bracket-table">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Title</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="end" className="cutoff-rating-col">Rating Cutoff</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="end" className="cutoff-ranks-col">Ranks</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {sortByClassnameAndCutoff([...rows], false).map((row) => (
                <Table.Row key={`${row.reward.rating_cutoff}-${row.titles[0]}`}>
                  <Table.Cell className={"title-shadow cutoff-title-cell " + TitleColors(row.titles[0])}>{rowTitle(row)}</Table.Cell>
                  <Table.Cell justify="end">{ratingCell(bracketLadder(type), row)}</Table.Cell>
                  <Table.Cell justify="end">1 - {row.reward.rank}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </section>
      ))}


      {soloSorted.length > 0 && (
        <section className="w-full mb-6">
          <div className="solo-heading-row">
            <Heading size="4">Solo Shuffle &amp; Blitz</Heading>
          </div>
          <div className="solo-title-cards">
            {shuffleTitle && (
              <Card className="solo-title-card">
                <span className="title-pill-label title-shadow font-bold ">Shuffle:</span>
                <span className={"title-shadow " + TitleColors(shuffleTitle)}>{shuffleTitle}</span>
              </Card>
            )}
            {blitzTitle && (
              <Card className="solo-title-card">
                <span className="title-pill-label title-shadow font-bold ">Blitz:</span>
                <span className={"title-shadow " + TitleColors(blitzTitle)}>{blitzTitle}</span>
              </Card>
            )}
          </div>
          <ClassFilter region={region} showSpecs={false} onChange={(classes) => setSelectedClasses(classes)} />
          <Table.Root variant="surface" size="1">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Spec</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="center" className="shuffle-col group-start">
                  <span className="label-full">Shuffle Cutoff</span>
                  <span className="label-short">Shuffle</span>
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="center" className="shuffle-col">
                  <span className="label-full">Shuffle Ranks</span>
                  <span className="label-short">Spots</span>
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="center" className="blitz-col group-start">
                  <span className="label-full">Blitz Cutoff</span>
                  <span className="label-short">Blitz</span>
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="center" className="blitz-col">
                  <span className="label-full">Blitz Ranks</span>
                  <span className="label-short">Spots</span>
                </Table.ColumnHeaderCell>

              </Table.Row>
            </Table.Header>
            <Table.Body>
              {soloShown.map(([specId, { shuffle, blitz }]) => {
                //either half carries the spec's name; a spec might only have one
                const spec = (shuffle ?? blitz)?.reward.specialization;
                const specClassName = specClass.get(specId) ?? "";
                return (
                  <Table.Row key={specId}>
                    <Table.Cell style={{
                      color: `${ClassColor.get(
                        specClassName
                        ?? "black"
                      )}`,
                    }}>
                      {spec?.name && specClassName && (
                        <img
                          className="inline h-5 w-5 mr-2"
                          src={SoloSpecIcon({ slug: "", className: specClassName, specName: spec.name, specId })}
                          alt=""
                        />
                      )}
                      {spec?.name} {specClassName}
                    </Table.Cell>
                    <Table.Cell justify="center" className="shuffle-col group-start">{shuffle ? ratingCell(specLadders.get(`shuffle:${specId}`), shuffle) : "–"}</Table.Cell>
                    <Table.Cell justify="center" className="shuffle-col ranks-col">{shuffle ? `1 - ${shuffle.reward.rank}` : ""}</Table.Cell>
                    <Table.Cell justify="center" className="blitz-col group-start">{blitz ? ratingCell(specLadders.get(`blitz:${specId}`), blitz) : "–"}</Table.Cell>
                    <Table.Cell justify="center" className="blitz-col ranks-col">{blitz ? `1 - ${blitz.reward.rank}` : ""}</Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>

        </section>
      )}

      {/* only Shuffle and Blitz have per spec cutoffs, and MoP has neither */}
      {soloSorted.length > 0 && (
        <p className="cutoffs-footnote">
          Titles are displayed once per bracket; rating cutoffs and rank ranges vary by specialization.
        </p>
      )}
    </div>
  );

};

export default CutoffsPage;
