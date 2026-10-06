import React, { FC, ReactElement, useEffect, useState } from "react";
import { Dragonblight } from "../../../clients/Dragonblight";
import { useParams } from "react-router";
import { Card, Heading, Skeleton } from "@radix-ui/themes";
import "./profile-rating.css";
import { brackets, getFlavor } from "../../../helpers/game-flavor";
import { RatingTier, RetailTiers } from "../../../helpers/ratingTierHelper";

interface ProfileRatingProps {
  // Arrives after the ratings, so a Gladiator title can appear a moment after the card.
  achievements?: Dragonblight.CharacterAchievementsSummary;
  characterNotFound?: boolean;
}

const ProfileRating: FC<ProfileRatingProps> = ({ achievements, characterNotFound }) => {
  // pulls dictionary of keys from pvp bracket
  const [characterRatings, setcharacterRatings] = useState<
    Dragonblight.CharacterPvpBracketStatistics[]
  >(); //calls schema from argentponywarcraft client
  const [loading, setLoading] = useState<boolean>();
  const [rewards, setRewards] = useState<
    Dragonblight.PvpSeasonRewardWithRank[]
  >();
  const [seasonStart, setSeasonStart] = useState<Date | null>();
  const { region, server, characterName } = useParams();

  async function CutoffData() {
    const DragonblightClient = new Dragonblight.PvpLeaderboardClient();
    if (getFlavor() === "retail") {
      // Only the retail Gladiator check needs it; failing leaves it null, which turns the check off.
      DragonblightClient.getSeasonStart(region)
        .then(setSeasonStart)
        .catch(() => setSeasonStart(null));
    }
    setRewards(await DragonblightClient.getPvPRewards(region));
    setLoading(false);
  }

  //activates useEffect from change in region / server / charactername (when we load new character data)
  //pulls all pvpbracket data from blizzard (or redis) and placing inside of data
  useEffect(() => {
    setLoading(true);
    const CharacterRatingClient = new Dragonblight.PvpStatClient(); //talking to controller
    const slug = server?.replace(" ", "-");
    CharacterRatingClient.getPvPCurrentRating(slug, characterName, region).then(
      //saves data from get controller
      (data) => {
        setcharacterRatings(data); //updates characterRatings data
        CutoffData();
      }
    );
  }, [region, server, characterName]);

  // Blizzard's retail season rewards hold the live rank 1 cutoff: one reward for 3v3,
  // one per faction for RBG, none for 2v2. Undefined while rewards are loading.
  function getRank1Reward(bracket: string, faction?: string) {
    return bracketRewards(bracket)?.find(
      (r) => !r.faction?.type || r.faction.type === faction
    );
  }

  function getRetailTier(
    bracket: string,
    current_rating: number,
    faction?: string
  ): RatingTier | undefined {
    const rank1 = getRank1Reward(bracket, faction);
    if (rank1 && current_rating >= rank1.rating_cutoff) {
      return {
        // "Venomous Gladiator: Midnight Season 2" -> "Venomous Gladiator"
        title: rank1.achievement?.name?.split(":")[0] ?? "Rank 1",
        label: "Predicted Title:",
        text: "text-orange-500",
        border: "border-orange-500 border-2",
      };
    }
    const tier = RetailTiers.find(([minimum]) => current_rating >= minimum)?.[1];
    if (tier?.title === "Elite" && bracket === "ARENA_3v3" && hasSeasonGladiator()) {
      return { ...tier, title: "Gladiator" };
    }
    return tier;
  }

  // Every season has its own "Gladiator: <season>" achievement, so the one earned since
  // the current season began is this season's. The "Venomous Gladiator" rank 1 title
  // doesn't match the prefix. Dates arrive as ISO strings despite the generated Date type.
  function hasSeasonGladiator(): boolean {
    if (!seasonStart) return false;
    const start = new Date(seasonStart).getTime();
    return (
      achievements?.achievements?.some(
        (a) =>
          a.achievement?.name?.startsWith("Gladiator: ") &&
          a.completed_timestamp &&
          new Date(a.completed_timestamp).getTime() >= start
      ) ?? false
    );
  }

  // The title line under a card, label included, or "" when the rating earns none.
  function getTitleLine(
    bracket: string,
    current_rating: number,
    faction?: string
  ): string {
    if (getFlavor() === "retail") {
      const tier = getRetailTier(bracket, current_rating, faction);
      return tier ? `${tier.label} ${tier.title}` : "";
    }
    const title = getTitle(bracket, current_rating);
    return title ? `Predicted Title: ${title}` : "";
  }

  function getBracketColor(
    bracket: string,
    current_rating: number,
    faction?: string
  ): string | undefined {
    if (getFlavor() === "retail") {
      return getRetailTier(bracket, current_rating, faction)?.text ?? "text-stone-100";
    }
    const title = getTitle(bracket, current_rating);
    if (title?.endsWith(" Gladiator")) {
      return "text-yellow-600";
    }
    if (title?.startsWith("Gladiator") || title?.startsWith("Hero of the Faction")) {
      return "text-purple-500	";
    }
    if (title?.startsWith("Duelist")) {
      return "text-blue-500";
    }
    if (title?.startsWith("Rival")) {
      return "text-green-500";
    }
    if (title?.startsWith("Challenger")) {
      return "text-neutral-500";
    }
    if (title?.startsWith("")) {
      return "text-stone-100";
    }
  }

  // isolates rewards for a specific bracket, or returns [] when rewards are not yet loaded.
  function bracketRewards(bracket: string) {
    return rewards?.filter((r) => {
      return (
        r.bracket?.type?.includes(bracket) ||
        (r.bracket?.type?.includes("BATTLEGROUNDS") && bracket == "rbg")
      );
    });
  }

  function getTitle(
    bracket: string,
    current_rating: number
  ): string | undefined {
    // The best title is the reached reward with the highest cutoff, whatever order
    // the rewards arrive in.
    let best: Dragonblight.PvpSeasonRewardWithRank | undefined;
    for (const bracketReward of bracketRewards(bracket) ?? []) {
      if (
        current_rating >= bracketReward.rating_cutoff &&
        bracketReward.rating_cutoff > (best?.rating_cutoff ?? -1)
      )
        best = bracketReward;
    }
    return (
      best?.achievement?.name
        ?.replace(/ - Season [0-9][0-9]/, "")
        .replace(/: Season [0-9][0-9]/, "")
        .replace("[DNT] ", "") ?? ""
    );
  }

  function getCardBorder(
    bracket: string,
    current_rating: number,
    faction?: string
  ): string | undefined {
    if (getFlavor() === "retail") {
      // Below Combatant the card keeps its default border.
      return getRetailTier(bracket, current_rating, faction)?.border ?? "";
    }
    const title = getTitle(bracket, current_rating);

    if (title?.endsWith(" Gladiator")) {
      return "border-yellow-600 border-2";
    }
    if (title?.startsWith("Gladiator") || title?.startsWith("Hero of the Faction")) {
      return "border-purple-500 border-2";
    }
    if (title?.startsWith("Duelist")) {
      return "border-blue-500 border-2";
    }
    if (title?.startsWith("Rival")) {
      return "border-green-500 border-2";
    }
    if (title?.startsWith("Challenger")) {
      return "border-neutral-500 border-2";
    }
    if (title?.startsWith("")) {
      return "border-stone-100 border-2";
    }
  }

  return (
    <div className={characterNotFound ? "page-container not-found" : "page-container"}>
      <div>{loading && getSkeletons()}</div>
      <div>{!loading && getRatings()}</div>
    </div>
  );

  function getSkeleton(i: number) {
    return (
      <div className="rating-card" key={"GetRating" + i}>
        <Skeleton
          className={
            i == 0 || i == 2
              ? "mt-5 mb-3 h-20 mobile-padding rating-padding"
              : "mt-5 mb-3 h-20 rating-padding"
          }
          key={"SkeletonRating" + i}
        >
          <Card></Card>
        </Skeleton>
      </div>
    );
  }
  function getSkeletons() {
    const SkeletonCards = [];
    for (let i = 0; i < 4; i++) {
      SkeletonCards.push(getSkeleton(i));
    }
    return (
      <div className="flex-wrap flex flex-row width-60vw">{SkeletonCards}</div>
    );
  }

  function getRatingCard(
    BracketStatistics: Dragonblight.CharacterPvpBracketStatistics | null,
    index: number
  ): ReactElement {
    //connects specific bracket data into card, set to type ReactElement with tsx code inside return
    return (
      <div className="pb-10 pt-4 rating-card" key={"GetRating" + index}>
        <Card
          className={
            getCardBorder(
              BracketStatistics?.bracket?.type ?? "",
              BracketStatistics?.rating ?? 0,
              BracketStatistics?.faction?.type
            ) +
            " " +
            (index == 0 || index == 2
              ? "mt-5 mb-3 mobile-padding rating-padding"
              : "mt-5 mb-3 rating-padding")
          }
        >
          <div>
            <div
              className={
                getBracketColor(
                  BracketStatistics?.bracket?.type ?? "",
                  BracketStatistics?.rating ?? 0,
                  BracketStatistics?.faction?.type
                ) +
                " " +
                "font-bold text-3xl flex justify-center"
              }
            >
              {BracketStatistics?.rating ? BracketStatistics?.rating : "0"}
            </div>
          </div>
          <Heading size="3" className="text-center">
            {" "}
            {/* results arrive in brackets() order, which differs per flavor */}
            {brackets()[index]?.replace("rbg", "RBG")}
          </Heading>
        </Card>
        <div className="flex justify-center text-sm">
          <span className="text-green-300">
            {BracketStatistics?.season_match_statistics?.won}
          </span>{" "}
          &nbsp;{BracketStatistics?.season_match_statistics?.played != null ? "-" : " "}&nbsp;{" "}
          <span className="text-red-300">
            {BracketStatistics?.season_match_statistics?.lost}
          </span>
        </div>
        <span className="text-xs italic justify-center">
          {getTitleLine(
            BracketStatistics?.bracket?.type ?? "",
            BracketStatistics?.rating ?? 0,
            BracketStatistics?.faction?.type
          )}
        </span>
      </div>
    );
  }
  //loops through each character rating (remember: characterratings is updated every time the user looks up a character, and has character data from controller)
  function getRatings() {
    const RatingCards: ReactElement[] = [];
    if (characterRatings) {
      // [{2v2}, {3v3}, {5v5}, {rbg}] - characterratings is being updated by setcharacterratings, which is communicating with the controller to call a character's bracket ratings.
      characterRatings.forEach((BracketStatistics, index) => {
        //characterRatings[0] = {2v2}, characterRatings[1] = {3v3}, doing for each loop with each element inside of characterratings
        RatingCards.push(getRatingCard(BracketStatistics, index)); // RatingCards[0] = {div+card+div}, pushes element data we are looking for into ratingcards
      });
    }
    return (
      <div className="flex-wrap flex flex-row width-60vw">{RatingCards}</div>
    );
  }
};
export default ProfileRating;
