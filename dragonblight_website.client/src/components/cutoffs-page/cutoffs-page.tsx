import { FC, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Heading, SegmentedControl, Table } from "@radix-ui/themes";
import { Dragonblight } from "../../clients/Dragonblight";
import { SoloSpecIcon } from "../../helpers/solo-bracket-specs";
import { TitleColors, cleanTitle } from "../../helpers/ratingTierHelper";
import "./cutoffs-page.css";
import { ClassColor } from "../../helpers/classColorHelper";


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


const CutoffsPage: FC = () => {
  const { URLregion } = useParams();
  const region = URLregion ?? "us";
  const navigate = useNavigate();
  const [rewards, setRewards] = useState<Dragonblight.PvpSeasonRewardWithRank[]>([]);
  //spec id -> class name, which a rewaard doesn't crry but the spec icon needs
  const [specClass, setSpecClass] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    const client = new Dragonblight.PvpLeaderboardClient();
    client.getPvPRewards(region).then((r) => setRewards(r ?? [])).catch(() => setRewards([]));
    client.getLadderBrackets(region).then((ladders) =>
      setSpecClass(new Map((ladders ?? [])
        .filter((ladder) => ladder.specId != null)
        .map((ladder) => [ladder.specId!, ladder.className ?? ""] as [number, string])))
    );
  }, [region]);

  //bracket type -> its rows, in the order Blizzard sends the brackets
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
  const shuffleTitle = soloSorted.find(([, s]) => s.shuffle)?.[1].shuffle?.titles[0];
  const blitzTitle = soloSorted.find(([, s]) => s.blitz)?.[1].blitz?.titles.join(" / ");

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
    <div className="flex flex-col px-4 py-3 min-w-[900px]">
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
      {[...tables].filter(([type]) => !soloTypes.includes(type)).map(([type, rows]) => (
        <section key={type} className="w-full mb-6">
          <Heading size="4" className="mb-2">{bracketNames[type] ?? type}</Heading>
          <Table.Root variant="surface" size="1">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Title</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="end">Rating Cutoff</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="end">Ranks</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {sortByClassnameAndCutoff([...rows], false).map((row) => (
                <Table.Row key={`${row.reward.rating_cutoff}-${row.titles[0]}`}>
                  <Table.Cell className={"title-shadow w-[460px] " + TitleColors(row.titles[0])}>{row.titles.join(" / ")}</Table.Cell>
                  <Table.Cell justify="end">{row.reward.rating_cutoff}</Table.Cell>
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
          <div className="solo-heading-row">
            {shuffleTitle && (
              <span className="title-pill title-pill--shuffle">
                <span className="title-pill-label title-shadow font-bold ">Shuffle:</span>
                <span className={"title-shadow " + TitleColors(shuffleTitle)}>{shuffleTitle}</span>
              </span>
            )}
            {blitzTitle && (
              <span className="title-pill title-pill--blitz">
                <span className="title-pill-label title-shadow font-bold ">Blitz:</span>
                <span className={"title-shadow " + TitleColors(blitzTitle)}>{blitzTitle}</span>
              </span>
            )}
          </div>
          <Table.Root variant="surface" size="1">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Spec</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="end" className="shuffle-col group-start">Shuffle Cutoff</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="end" className="shuffle-col">Shuffle Ranks</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="end" className="blitz-col group-start">Blitz Cutoff</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="end" className="blitz-col">Blitz Ranks</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {soloSorted.map(([specId, { shuffle, blitz }]) => {
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
                    <Table.Cell justify="end" className="shuffle-col group-start">{shuffle?.reward.rating_cutoff ?? "–"}</Table.Cell>
                    <Table.Cell justify="end" className="shuffle-col">{shuffle ? `1 - ${shuffle.reward.rank}` : ""}</Table.Cell>
                    <Table.Cell justify="end" className="blitz-col group-start">{blitz?.reward.rating_cutoff ?? "–"}</Table.Cell>
                    <Table.Cell justify="end" className="blitz-col">{blitz ? `1 - ${blitz.reward.rank}` : ""}</Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>

        </section>
      )}

      <p className="cutoffs-footnote">
        Titles are displayed once per bracket; rating cutoffs and rank ranges vary by specialization.
      </p>
    </div>
  );

};

export default CutoffsPage;
