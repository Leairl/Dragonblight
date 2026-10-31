import { FC, use, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { Card, ChevronDownIcon, Skeleton } from "@radix-ui/themes";
import { Dragonblight } from "../../../clients/Dragonblight";
import { ClassColor } from "../../../helpers/classColorHelper";
import { formerNames, realmDisplayName } from "../../../helpers/realmNameHelper";
import { retailTier, bestReward, ratingColor, RankOneColor } from "../../../helpers/ratingTierHelper";
import { flavorHref, brackets as flavorBrackets } from "../../../helpers/game-flavor";
import { SoloSpecIcon } from "../../../helpers/solo-bracket-specs";
import "./profile-alts.css";

interface profileAltProps {
    rewards: Dragonblight.PvpSeasonRewardWithRank[] | [];
}
const ProfileAlts: FC<profileAltProps> = (props) => {
  const [alts, setAlts] = useState<Dragonblight.GetAltsResponse[]>();
  const [loading, setLoading] = useState<boolean>(true);
  const [sortBracket, setSortBracket] = useState<string | null>(null);
  const { region, server, characterName } = useParams();

  const rewardBracket: Record<string, string> = {
    "2v2": "ARENA_2v2",
    "3v3": "ARENA_3v3",
    "5v5": "ARENA_5v5",
    rbg: "BATTLEGROUNDS",
    shuffle: "SHUFFLE",
    blitz: "BLITZ",
  };

  //same pattern as the other profile panes: refetch whenever the looked up character changes
  useEffect(() => {
    if (region == null || server == null || characterName == null) {
      return;
    }
    setLoading(true);
    const AltClient = new Dragonblight.AltClient();
    const slug = server?.replace(" ", "-");
    //how it gets bracket data for character
    AltClient.getAlts(slug, characterName, region)
      .then((data) => {
        setAlts(data);
        setLoading(false);
      })
      .catch(() => {
        setAlts([]);
        setLoading(false);
      });
  },
    [region, server, characterName]);

  const soloLadders: string[] = flavorBrackets().filter((b) => b === "shuffle" || b === "blitz");
  const brackets = flavorBrackets().filter((b) => !soloLadders.includes(b));

  function sortRating(alt: Dragonblight.GetAltsResponse, bracket: string): number {
    if (!soloLadders.includes(bracket)) {
      return alt.ratings?.[bracket] ?? 0;
    }
    const specs = alt.soloRatings?.filter((soloRating) => soloRating.ladder === bracket) ?? [];
    let best = 0;
    for (const spec of specs) {
      best = Math.max(best, spec.rating ?? 0);
    }
    return best;
  }
  let sortedAlts = alts ?? [];
  if (sortBracket) {
    // makes a copy of the alts array and sorts them by max
    sortedAlts = [...sortedAlts];
    sortedAlts.sort((alt1, alt2) => sortRating(alt2, sortBracket) - sortRating(alt1, sortBracket));
  }

  const gridStyle = {
    gridTemplateColumns: `minmax(220px, 2fr) repeat(${flavorBrackets().length}, minmax(70px, 1fr))`,

  };
  return (
    <div className="alt-pane">
      <p className="alt-intro">
        Other characters on this Battle.net account.
      </p>
      {loading && getSkeletons()}
      {!loading && alts?.length === 0 && (
        <p className="alt-empty">
          No known alts among the characters we have indexed.
        </p>
      )}
      {!loading && (
        <div className="alt-cards">
          {alts && alts.length > 0 && (
            <div className="alt-grid alt-grid-header" style={gridStyle}>
              <span>Character</span>
              {/* loops through each bracket and if we click a bracket itll set
              that bracket to sortBracket which will compare each alts rating until it is
              ordered by descending.
              */}
              {[...brackets, ...soloLadders].map((bracket) => (
                <button
                  key={bracket}
                  className={`alt-sort ${sortBracket === bracket ? "alt-sort-active" : ""}`}
                  onClick={() => setSortBracket(sortBracket === bracket ? null : bracket)}
                >
                  {bracket.toUpperCase()}{sortBracket === bracket && (
                    <span className="chevron-icon">
                    <ChevronDownIcon
                    aria-hidden />
                    </span>)}

                </button>
              ))}
            </div>
          )}
          {sortedAlts?.map(getAltCard)}
        </div>
      )}
    </div>
  );
  function getRatingCell(bracket: string, rating: number | undefined) {
    const color = ratingColor(props.rewards, rewardBracket[bracket], rating);
    return (
      <span className="alt-cell alt-rating" key={bracket}>
        {rating ?
          (
            <span className={color}>{rating}</span>
          ) : (
            <span className="alt-none">–</span>
          )}
      </span>
    );
  }

  function getSoloRatings(alt: Dragonblight.GetAltsResponse, ladder: string, label: string) {
    const specs = alt.soloRatings?.filter((s) => s.ladder === ladder) ?? [];
    if (specs.length === 0) {
      return <span className="alt-cell alt-none" key={ladder}>–</span>;
    }

    return (
      <div className="alt-cell alt-solo-cell" key={ladder}>
        {/* loops through specs for solo and checks the highest tier for that characters rating in that spec bracket*/}
        {specs.map((s) => {
          const color = ratingColor(props.rewards, rewardBracket[ladder], s.rating, s.specId);
          return (
            <span className="alt-rating" key={s.slug} title={`${s.specName} · ${label}`}>
              <img className="alt-spec-icon" src={SoloSpecIcon(s)} alt={s.specName} />
              <span className={color}>{s.rating}</span>
            </span>
          );
        })}
      </div>
    );
  }


  function getAltCard(alt: Dragonblight.GetAltsResponse, index: number) {
    return (
      <Card className="alt-card border-card" key={"Alt" + index}>
        <div className="alt-grid" style={gridStyle}>
          <div className="alt-cell">
            <Link to={`/profile/${region}/${alt.realm}/${alt.name}`}>
              <div className="alt-head">
                <img
                  src={`/ClassIcons/${alt.classchar}.png`}
                  height="25px"
                  width="25px"
                  style={{ maxHeight: "25px", maxWidth: "25px" }}
                  alt={alt.classchar ?? ""}
                ></img>
                <span
                  className="alt-name"
                  style={{ color: ClassColor.get(alt.classchar ?? "") }}
                >
                  {alt.name}
                </span>
                <span className="alt-realm">{realmDisplayName(alt.realm)}</span>
              </div>
            </Link>
            {alt.previousNames?.length > 0 && (
              <div className="alt-former">{formerNames(alt.previousNames, alt.realm)}</div>
            )}
            <span className="alt-spec">{alt.spec}</span>
          </div>
          {brackets.map((b) => getRatingCell(b, alt.ratings?.[b]))}
          {soloLadders.map((l) => getSoloRatings(alt, l, l === "shuffle" ? "Solo Shuffle" : "Blitz"))}
        </div>

      </Card>
    );
  }

  function getSkeletons() {
    const skeletons = [];
    for (let i = 0; i < 3; i++) {
      skeletons.push(
        <Skeleton key={"AltSkeleton" + i} className="alt-card h-20">
          <Card></Card>
        </Skeleton>
      );
    }
    return <div className="alt-cards">{skeletons}</div>;
  }
};

export default ProfileAlts;
