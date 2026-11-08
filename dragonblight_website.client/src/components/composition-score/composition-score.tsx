import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Card, Popover } from "@radix-ui/themes";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDownIcon, UpdateIcon } from "@radix-ui/react-icons";
import { Dragonblight } from "../../clients/Dragonblight";
import { ClassColor } from "../../helpers/classColorHelper";
import { specIcon } from "../../helpers/classIconHelper";
import { GameFlavor, getFlavor } from "../../helpers/game-flavor";
import MetaCard from "./meta-card";
import RichText from "./rich-text";
import { baseWeight, CompositionScore, RowEffect, scoreComposition, SpecProfile, specsForFlavor, specSummary } from "../../helpers/composition-score";

declare const $WowheadPower: { refreshLinks: () => void };

const cardClass = "[--card-background-color:#292c31]";
const effectColors: Record<RowEffect, string> = { good: "#3fb950", neutral: "#6b7280", slightlyBad: "#e3b341", veryBad: "#e5484d" };
const baseColor = "#4dc4fd";
const ringRadius = 52;
const ringLength = 2 * Math.PI * ringRadius;
const healerSlot = 2;
const emptySlotColor = "#3a3e45";
//The URL keeps each slot's pick, like ?dps1=Death+Knight:Unholy, so a refresh or a shared link shows the same team
const slotParams = ["dps1", "dps2", "healer"];
//label | bar | value, the column layout of every breakdown line
const breakdownGrid = "mt-2 grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_2.75rem] items-start gap-x-3";
const region = "us";
const bracket = "3v3";

function scoreColor(score: number): string {
  if (score >= 55) {
    return effectColors.good;
  }
  if (score >= 40) {
    return effectColors.slightlyBad;
  }
  return effectColors.veryBad;
}

function formatPoints(points: number): string {
  if (points > 0) {
    return `+${points}`;
  }
  return `${points}`;
}

interface AddsUpPart {
  label: string;
  points: number; //points of the 0-100 score this part adds or takes away
  color: string;
  width: number; //share of the bar, in percent
  title: string; //where the points come from, shown on hover
}

//Splits the 0-100 score into what each layer adds, so the parts sum to the score in the ring.
//Each raw part is scaled the same way as the score: as a share of the best comp's raw score.
function addsUpParts(result: CompositionScore): AddsUpPart[] {
  const averageRating = (result.baseContribution / baseWeight).toFixed(1);
  const parts = [
    { label: "Spec base", raw: result.baseContribution, color: baseColor, title: `Average spec rating ${averageRating} of 100, contributes a maximum of ${Math.round(baseWeight * 100)}% to the total score.` },
    { label: "Synergy", raw: result.synergy, color: effectColors.good, title: "How well the three specs fit together, from the breakdown below" },
    { label: "Live data", raw: result.live, color: effectColors.neutral, title: "Recent 3v3 win rates" },
  ];
  const points = parts.map((part) => {
    if (result.bestRawScore <= 0) {
      return 0;
    }
    return Math.round(part.raw / result.bestRawScore * 100);
  });
  //Rounding can leave the parts a point off the score, so the largest part takes up the difference
  const difference = result.score - points.reduce((sum, value) => sum + value, 0);
  let largest = 0;
  points.forEach((value, index) => {
    if (Math.abs(value) > Math.abs(points[largest])) {
      largest = index;
    }
  });
  points[largest] += difference;
  //The bar fills up to the score, split between the parts that add points
  const added = points.filter((value) => value > 0).reduce((sum, value) => sum + value, 0);
  return parts.map((part, index) => {
    let width = 0;
    if (points[index] > 0 && added > 0) {
      width = points[index] / added * result.score;
    }
    return { label: part.label, points: points[index], color: part.color, width, title: part.title };
  });
}

//An empty slot shows a placeholder until a spec is picked
const SpecPicker: React.FC<{ options: SpecProfile[]; selected?: SpecProfile; slotLabel: string; onSelect: (spec: SpecProfile) => void }> = (props) => {
  const [open, setOpen] = useState(false);
  const classNames = [...new Set(props.options.map((s) => s.className))].sort();
  const selected = props.selected;
  let borderColor = emptySlotColor;
  let icon = <div className="h-10 w-10 shrink-0 rounded border border-black bg-[#17191c]" />;
  let placeholder = "Choose a damage spec";
  if (props.slotLabel === "Healer") {
    placeholder = "Choose a healer";
  }
  let title = <div className="truncate font-bold text-gray-400">{placeholder}</div>;
  let subtitle = props.slotLabel;
  let buttonLabel = `Choose ${props.slotLabel}`;
  if (selected !== undefined) {
    borderColor = ClassColor.get(selected.className) ?? emptySlotColor;
    icon = <img className="h-10 w-10 shrink-0 rounded border border-black" src={specIcon(selected.className, selected.specName)} alt="" />;
    title = (
      <div className="truncate font-bold" style={{ color: ClassColor.get(selected.className) }}>
        {selected.specName} {selected.className}
      </div>
    );
    if (props.slotLabel !== selected.role) {
      subtitle = `${props.slotLabel} · ${selected.role}`;
    }
    buttonLabel = `Change ${props.slotLabel}`;
  }
  return (
    <Card className={`${cardClass} border-l-[3px]!`} style={{ borderLeftColor: borderColor }}>
      <div className="flex items-center gap-3">
        {icon}
        <div className="min-w-0 flex-1">
          {title}
          <div className="text-xs text-gray-300">{subtitle}</div>
        </div>
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger>
            <button
              type="button"
              aria-label={buttonLabel}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded border border-black bg-[#3a3e45] text-white hover:bg-[#4a4f57]"
            >
              <UpdateIcon />
            </button>
          </Popover.Trigger>
          <Popover.Content size="1" className="max-h-[60vh] w-[320px] max-w-[90vw] overflow-y-auto bg-[#292c31]!">
            {classNames.map((className) => (
              <div key={className} className="mb-2">
                <div className="mb-1 text-xs font-bold" style={{ color: ClassColor.get(className) }}>{className}</div>
                <div className="flex flex-wrap gap-1">
                  {props.options.filter((s) => s.className === className).map((spec) => (
                    <button
                      key={spec.specName}
                      type="button"
                      className="flex cursor-pointer items-center gap-1 rounded border border-black bg-[#3a3e45] px-2 py-1 text-xs text-white hover:bg-[#4a4f57]"
                      onClick={() => {
                        props.onSelect(spec);
                        setOpen(false);
                      }}
                    >
                      <img className="h-5 w-5" src={specIcon(spec.className, spec.specName)} alt="" />
                      {spec.specName}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </Popover.Content>
        </Popover.Root>
      </div>
    </Card>
  );
};

//One collapsible section of the "why this comp works" card
const DetailSection: React.FC<{ value: string; title: string; children: React.ReactNode }> = (props) => {
  return (
    <Accordion.Item value={props.value} className="border-t border-black">
      <Accordion.Header className="flex">
        <Accordion.Trigger className="group flex flex-1 cursor-pointer items-center justify-between py-2 text-left font-bold text-white">
          {props.title}
          <ChevronDownIcon className="transition-transform duration-300 group-data-[state=open]:rotate-180" aria-hidden />
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content className="AccordionContent">{props.children}</Accordion.Content>
    </Accordion.Item>
  );
};

//The score, breakdown and cards for a full team: two damage specs and a healer
const ScoreResults: React.FC<{
  team: SpecProfile[];
  specs: SpecProfile[];
  flavor: GameFlavor;
  winRates?: Dragonblight.SpecWinRates;
  winRatesLoading: boolean;
}> = (props) => {
  const team = props.team;
  const specs = props.specs;
  const flavor = props.flavor;
  const result = scoreComposition(team, flavor, props.winRates?.specs);
  //Live data is shown in the breakdown and the meta card, so it stays out of both bullet lists
  const goodRows = result.rows.filter((row) => row.effect === "good" && row.label !== "Live data");
  //General points are always shown. The ones that name specific spells and teammates sit behind a details button.
  //Points that open with a spec's name come first, then the team-wide ones
  const specLabels = specs.map((s) => `${s.specName} ${s.className}`);
  //A named comp's explanation says more than "can line up heavy burst windows together", so it takes that bullet's place
  const namedComp = result.namedComp;
  const namedCompReplacesBurst = namedComp !== undefined && goodRows.some((row) => row.label === "Double burst" && !row.specific);
  const generalRows = goodRows.filter((row) => !row.specific).map((row) => {
    if (row.label === "Double burst" && namedComp !== undefined) {
      return { ...row, reason: namedComp.reason, bullets: [namedComp.reason] };
    }
    return row;
  });
  //Otherwise the named comp's explanation goes first in "more on why it works"
  let namedCompDetail: string | undefined;
  if (namedComp !== undefined && !namedCompReplacesBurst) {
    namedCompDetail = namedComp.reason;
  }
  const strengths = [
    ...generalRows.filter((row) => specLabels.some((label) => row.reason.startsWith(label))),
    ...generalRows.filter((row) => !specLabels.some((label) => row.reason.startsWith(label))),
  ];
  const strengthDetails = goodRows.filter((row) => row.specific);
  //Kept here rather than inside the accordion, so opening a section re-renders the page and Wowhead finds its links
  const [openSections, setOpenSections] = useState<string[]>([]);
  const warnings = result.rows.filter((row) => (row.effect === "slightlyBad" || row.effect === "veryBad") && row.label !== "Live data");
  //The breakdown lists rows from most helpful to most harmful, with the zero-point rows folded into one line
  //Rows about one class's own strengths count toward the score but aren't listed as attributes
  const attributeRows = result.rows.filter((row) => !row.classBenefit);
  const scoredRows = attributeRows.filter((row) => row.points !== 0).sort((a, b) => b.points - a.points);
  const neutralRows = attributeRows.filter((row) => row.points === 0);
  const [showNeutral, setShowNeutral] = useState(false);
  let neutralState = "closed";
  if (showNeutral) {
    neutralState = "open";
  }
  const addsUp = addsUpParts(result);
  //A named comp from the glossary replaces the plain shape, like "Double melee", under the tier
  let compName = result.archetype;
  if (result.namedComp !== undefined) {
    compName = result.namedComp.name;
  }

  //Wowhead's script only finds the buff links when told to, so it runs after every render
  useEffect(() => {
    $WowheadPower.refreshLinks();
  });

  return (
    <>
      <div className="mb-4 flex flex-col gap-3">
        <Card className={cardClass}>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 p-1">
            <div className="flex shrink-0 items-center gap-3">
              <div className="relative h-[96px] w-[96px] shrink-0">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
                  <circle cx="60" cy="60" r={ringRadius} fill="none" stroke="#17191c" strokeWidth="9" />
                  <circle
                    cx="60"
                    cy="60"
                    r={ringRadius}
                    fill="none"
                    stroke={scoreColor(result.score)}
                    strokeWidth="9"
                    strokeDasharray={`${ringLength * result.score / 100} ${ringLength}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <span className="text-3xl font-bold leading-none">{result.score}</span>
                  <span className="text-xs text-gray-300">/ 100</span>
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-lg font-bold text-white">Tier {result.tier}</div>
                <div className="text-sm text-gray-300">{compName}</div>
                {result.category && (
                  <div className="mt-1 inline-block rounded border border-[#e5484d] px-2 py-0.5 text-xs font-bold text-[#ff8b8e]">{result.category}</div>
                )}
              </div>
            </div>
            <div className="min-w-[220px] flex-1">
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">How it adds up</h3>
              <div className="mt-1 flex h-2 overflow-hidden rounded-sm bg-[#17191c]">
                {addsUp.map((part) => (
                  <div key={part.label} className="h-full transition-[width] duration-300" style={{ width: `${part.width}%`, backgroundColor: part.color }} />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-300">
                {addsUp.map((part) => (
                  <span key={part.label} title={part.title}><span style={{ color: part.color }}>■</span> {part.label} {formatPoints(part.points)}</span>
                ))}
                <span className="font-bold text-white">= {result.score} / 100</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className={cardClass}>
          <div className="p-2">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <h2 className="font-bold text-white">Score breakdown</h2>
              <div className="flex flex-wrap gap-x-3 text-xs text-gray-300">
                <span><span style={{ color: effectColors.good }}>●</span> Helps</span>
                <span><span style={{ color: effectColors.slightlyBad }}>●</span> Slightly hurts</span>
                <span><span style={{ color: effectColors.veryBad }}>●</span> Badly hurts</span>
              </div>
            </div>

            <h3 className="mt-3 text-xs font-bold uppercase tracking-wide text-gray-400">Spec base scores</h3>
            {result.specScores.map(({ spec, baseScore }, index) => (
              <div key={index} className={breakdownGrid}>
                <span className="truncate text-xs font-bold" style={{ color: ClassColor.get(spec.className) }}>{spec.specName} {spec.className}</span>
                <div className="h-2 overflow-hidden rounded-sm bg-[#17191c]">
                  <div className="h-full transition-[width] duration-300" style={{ width: `${baseScore}%`, backgroundColor: baseColor }} />
                </div>
                <span className="text-right text-xs text-gray-300">{baseScore.toFixed(1)}</span>
              </div>
            ))}

            <h3 className="mt-4 text-xs font-bold uppercase tracking-wide text-gray-400">Synergy</h3>
            {scoredRows.map((row) => (
              <div key={row.label} className={`${breakdownGrid} border-b border-black/40 pb-2`}>
                <span className="text-xs font-bold text-white">{row.label}</span>
                <div className="min-w-0">
                  <div className="h-2 overflow-hidden rounded-sm bg-[#17191c]">
                    <div
                      className="h-full transition-[width] duration-300"
                      style={{ width: `${Math.min(100, Math.abs(row.points) * 10)}%`, backgroundColor: effectColors[row.effect] }}
                    />
                  </div>
                  {row.detail !== "" && (
                    <div className="mt-2.5 text-xs text-gray-300"><RichText text={row.detail} specs={specs} /></div>
                  )}
                </div>
                <span className="text-right text-xs font-bold" style={{ color: effectColors[row.effect] }}>{formatPoints(row.points)}</span>
              </div>
            ))}
            {neutralRows.length > 0 && (
              <button
                type="button"
                aria-expanded={showNeutral}
                className="group mt-3 flex cursor-pointer items-center gap-1 text-left text-xs text-gray-400 hover:text-gray-200"
                data-state={neutralState}
                onClick={() => setShowNeutral(!showNeutral)}
              >
                <ChevronDownIcon className="-rotate-90 transition-transform duration-300 group-data-[state=open]:rotate-0" aria-hidden />
                {neutralRows.length} neutral factors (0): {neutralRows.map((row) => row.label).join(", ")}
              </button>
            )}
            {showNeutral && neutralRows.map((row) => (
              <div key={row.label} className={breakdownGrid}>
                <span className="text-xs font-bold text-white">{row.label}</span>
                <span className="text-xs text-gray-300"><RichText text={row.reason} specs={specs} /></span>
                <span className="text-right text-xs font-bold" style={{ color: effectColors[row.effect] }}>{formatPoints(row.points)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2">
        <MetaCard team={team} flavor={flavor} winRates={props.winRates} loading={props.winRatesLoading} className={cardClass} />

        <Card className={cardClass}>
          <div className="p-1 text-sm text-gray-200">
            <h2 className="mb-2 font-bold text-white">Why this comp works</h2>
            {strengths.length === 0 && strengthDetails.length === 0 && namedCompDetail === undefined && <p>Nothing stands out as a strength for this composition.</p>}
            <ul className="ml-5 list-disc space-y-1">
              {strengths.flatMap((row) => row.bullets.map((bullet, index) => <li key={`${row.label}-${index}`}><RichText text={bullet} specs={specs} /></li>))}
            </ul>
            <Accordion.Root type="multiple" value={openSections} onValueChange={setOpenSections} className="mt-3">
              {(strengthDetails.length > 0 || namedCompDetail !== undefined) && (
                <DetailSection value="details" title="More on why it works">
                  <ul className="ml-5 list-disc space-y-1">
                    {namedCompDetail !== undefined && <li><RichText text={namedCompDetail} specs={specs} /></li>}
                    {strengthDetails.flatMap((row) => row.bullets.map((bullet, index) => <li key={`${row.label}-${index}`}><RichText text={bullet} specs={specs} /></li>))}
                  </ul>
                </DetailSection>
              )}
              {warnings.length > 0 && (
                <DetailSection value="warnings" title="Watch out for">
                  <ul className="ml-5 list-disc space-y-1">
                    {warnings.flatMap((row) => row.bullets.map((bullet, index) => <li key={`${row.label}-${index}`}><RichText text={bullet} specs={specs} /></li>))}
                  </ul>
                </DetailSection>
              )}
              <DetailSection value="specs" title="What each spec brings">
                <ul className="ml-5 list-disc space-y-1">
                  {team.map((spec, slot) => (
                    <li key={slot}><span style={{ color: ClassColor.get(spec.className) }}>{spec.specName} {spec.className}:</span> <RichText text={specSummary(spec)} specs={specs} /></li>
                  ))}
                </ul>
              </DetailSection>
            </Accordion.Root>
          </div>
        </Card>
      </div>
    </>
  );
};

//Pick two damage specs and a healer to see how the composition scores. The rules are in helpers/composition-score.ts.
//The last slot only offers healers, so a team always has exactly one. Every slot starts empty, and the score shows
//once all three are picked.
function CompositionScoreContent() {
  const flavor = getFlavor();
  const specs = specsForFlavor(flavor);
  const damageSpecs = specs.filter((s) => s.role !== "Healer");
  const healerSpecs = specs.filter((s) => s.role === "Healer");
  const [params, setParams] = useSearchParams();
  //A pick only counts if it names a spec the slot offers on this flavor, so an old or edited link just leaves the slot empty
  const team = slotParams.map((param, slot) => {
    const value = params.get(param);
    if (value === null) {
      return undefined;
    }
    return slotOptions(slot).find((s) => `${s.className}:${s.specName}` === value);
  });
  const [winRates, setWinRates] = useState<Dragonblight.SpecWinRates>();
  const [winRatesLoading, setWinRatesLoading] = useState(true);
  const picked = team.filter((spec): spec is SpecProfile => spec !== undefined);

  //Recent 3v3 win rates feed the score's live data and the meta card
  useEffect(() => {
    let cancelled = false;
    new Dragonblight.LeaderboardAnalyticsClient()
      .getSpecWinRates(region, bracket)
      .then((data) => {
        if (!cancelled) {
          setWinRates(data ?? undefined);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWinRates(undefined);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setWinRatesLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [flavor]);

  //replace keeps each pick out of the back button's history
  function selectSpec(slot: number, spec: SpecProfile) {
    const next = new URLSearchParams(params);
    next.set(slotParams[slot], `${spec.className}:${spec.specName}`);
    setParams(next, { replace: true });
  }

  function slotLabel(slot: number): string {
    if (slot === healerSlot) {
      return "Healer";
    }
    return `DPS ${slot + 1}`;
  }

  function slotOptions(slot: number): SpecProfile[] {
    if (slot === healerSlot) {
      return healerSpecs;
    }
    return damageSpecs;
  }

  let results = (
    <Card className={cardClass}>
      <p className="p-2 text-sm text-gray-300">Pick two damage specs and a healer to see how they score.</p>
    </Card>
  );
  if (picked.length === team.length) {
    results = <ScoreResults team={picked} specs={specs} flavor={flavor} winRates={winRates} winRatesLoading={winRatesLoading} />;
  }

  return (
    <div className="w-[95vw] max-w-[1100px] pb-5">
      <h1 className="text-2xl font-bold text-white">Composition Viability Score</h1>
      <p className="mb-4 text-sm text-gray-300">
        Pick two damage specs and a healer to score how well they work together in 3v3. This is an estimate from spec ratings and synergy, adjusted a little by recent 3v3 win rates.
      </p>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {team.map((spec, slot) => (
          <SpecPicker key={slot} options={slotOptions(slot)} selected={spec} slotLabel={slotLabel(slot)} onSelect={(next) => selectSpec(slot, next)} />
        ))}
      </div>

      {results}
    </div>
  );
}

//Comp Score is retail only for now. MoP Classic's spec table hasn't been tuned, so the page says so instead.
//This sits outside the page itself, which uses hooks that can't be skipped.
function CompositionScorePage() {
  if (getFlavor() !== "retail") {
    return (
      <div className="w-[95vw] max-w-[1100px] pb-5">
        <h1 className="text-2xl font-bold text-white">Composition Viability Score</h1>
        <Card className={`${cardClass} mt-4`}>
          <p className="p-2 text-sm text-gray-300">The composition score isn't available for MoP Classic yet. Switch to Retail to use it.</p>
        </Card>
      </div>
    );
  }
  return <CompositionScoreContent />;
}

export default CompositionScorePage;
