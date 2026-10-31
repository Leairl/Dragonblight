import React, { FC, ReactElement, useEffect, useState } from "react";
import { Dragonblight } from "../../../clients/Dragonblight";
import { useParams } from "react-router";
import { Card, Heading, Separator, Skeleton, HoverCard, DataList } from "@radix-ui/themes";
import "./profile-rating.css";
import { brackets, getFlavor } from "../../../helpers/game-flavor";
import { bestReward, ratingColor, RatingTier, RetailTiers } from "../../../helpers/ratingTierHelper";
import { SoloSpecIcon } from "../../../helpers/solo-bracket-specs";
import { progressPropDefs } from "@radix-ui/themes/components/progress.props";


interface ProfileRatingProps {
  // Arrives after the ratings, so a Gladiator title can appear a moment after the card.
  achievements?: Dragonblight.CharacterAchievementsSummary;
  characterNotFound?: boolean;
  characterClass: string | undefined;
  characterFaction: string | undefined;
  rewards: Dragonblight.PvpSeasonRewardWithRank[] | [];
}

const ProfileRating: FC<ProfileRatingProps> = ({ achievements, characterNotFound, characterClass, characterFaction, rewards}) => {
  // pulls dictionary of keys from pvp bracket
  const [characterRatings, setcharacterRatings] = useState<
    Dragonblight.CharacterPvpBracketStatistics[]
  >(); //calls schema from argentponywarcraft client
  const [loading, setLoading] = useState<boolean>();
  const [seasonStart, setSeasonStart] = useState<Date | null>();
  const { region, server, characterName } = useParams();
  const [soloMode, setSoloMode] = useState<"shuffle" | "blitz">("shuffle");

  async function CutoffData() {
    const DragonblightClient = new Dragonblight.PvpLeaderboardClient();
    if (getFlavor() === "retail") {
      // Only the retail Gladiator check needs it; failing leaves it null, which turns the check off.
      DragonblightClient.getSeasonStart(region)
        .then(setSeasonStart)
        .catch(() => setSeasonStart(null));
    }
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


  function getRetailTier(bracket: string, current_rating: number, specId?: number): RatingTier | undefined {
    const rank1 = bestReward(rewards, bracket, current_rating, specId, characterFaction);
    if (rank1 && current_rating >= rank1.rating_cutoff) {
      return {
        // "Venomous Gladiator: Midnight Season 2" -> "Venomous Gladiator"
        title: rank1.achievement?.name?.split(":")[0] ?? "Rank 1",
        label: "Predicted Title:",
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
    specId?: number
  ): string {
    if (getFlavor() === "retail") {
      const tier = getRetailTier(bracket, current_rating, specId);
      return tier ? `${tier.label} ${tier.title}` : "";
    }
    const reward = bestReward(rewards, bracket, current_rating, specId, characterFaction);
    const title = reward?.achievement?.name?.split(":")[0];
    return title ? `Predicted Title: ${title}` : "";
  }

  // isolates rewards for a specific bracket, or returns [] when rewards are not yet loaded.
  function bracketRewards(bracket: string, specId?: number) {
    return rewards?.filter((r) => {
      if (specId !== undefined && r.specialization?.id !== specId) {
        return false;
      }
      return (
        r.bracket?.type?.includes(bracket) ||
        (r.bracket?.type?.includes("BATTLEGROUNDS") && bracket == "rbg")
      );
    });
  }

  return (
    <div className={characterNotFound ? "page-container not-found" : "page-container"}>
      <div className="w-full">{loading || characterNotFound ? getSkeletons() : getRatings()}</div>
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
    for (let i = 0; i < 3; i++) {
      SkeletonCards.push(getSkeleton(i));
    }
    return (
      <div className="flex flex-wrap flex-row justify-end w-full">{SkeletonCards}</div>
    );
  }

  function getRatingCard(BracketStatistics: Dragonblight.CharacterPvpBracketStatistics | null, index: number): ReactElement {
    const stats = (BracketStatistics?.specialization?.id != null ? BracketStatistics?.season_round_statistics : undefined)
      ?? BracketStatistics?.season_match_statistics;
    const winRate = stats?.played ? `${Math.round(((stats.won ?? 0) / stats.played) * 100)}%` : "-";
    return (
      <div className={"pb-10 rating-card"} key={"GetRating" + index}>

        <Card className="rating-padding border-card">
          <Heading size="3" className="text-center">
            {BracketStatistics?.specialization?.name && characterClass && (
              <img
                className="rating-spec-icon"
                src={SoloSpecIcon({
                  slug: "",
                  className: characterClass,
                  specName: BracketStatistics.specialization.name,
                  specId: BracketStatistics.specialization.id ?? 0,
                })}
                alt={BracketStatistics.specialization.name}
              />
            )}

            {" "}
            {!BracketStatistics?.specialization?.name && brackets()[index]?.replace("rbg", "RBG")}
          </Heading>
          <div>
            <div
              className={ratingColor(rewards,
                BracketStatistics?.bracket?.type ?? "",
                BracketStatistics?.rating ?? 0,
                BracketStatistics?.specialization?.id) +
                " " +
                "font-bold text-3xl flex justify-center text-shadow-md text-shadow-black"

              }
            >
              {BracketStatistics?.rating ? BracketStatistics?.rating : "0"}
            </div>
          </div>
          {BracketStatistics?.rating ? (
            <HoverCard.Root openDelay={150} closeDelay={100}>
              <HoverCard.Trigger>
                {/* the win-loss line opens the popup */}
                <button className="flex justify-center text-sm cursor-pointer hover:opacity-80">
                  <span className="text-green-300">{stats?.won ?? 0}</span>
                  &nbsp;-&nbsp;
                  <span className="text-red-300">{stats?.lost ?? 0}</span>
                </button>
              </HoverCard.Trigger>
              <HoverCard.Content size="1" side="bottom" align="center">
                <DataList.Root size="1">
                  <DataList.Item>
                    <DataList.Label>Wins</DataList.Label>
                    <DataList.Value className="text-green-300">{stats?.won ?? 0}</DataList.Value>
                  </DataList.Item>
                  <DataList.Item>
                    <DataList.Label>Losses</DataList.Label>
                    <DataList.Value className="text-red-300">{stats?.lost ?? 0}</DataList.Value>
                  </DataList.Item>
                  <DataList.Item>
                    <DataList.Label>Win rate</DataList.Label>
                    <DataList.Value>{winRate}</DataList.Value>
                  </DataList.Item>
                </DataList.Root>
              </HoverCard.Content>
            </HoverCard.Root>
          ) : (
            ""
          )}
          {/* mt-auto fills all space vertically from the top, pushing the prediction text to the bottom */}
          <span className="text-xs italic mt-auto text-center">
            {getTitleLine(
              BracketStatistics?.bracket?.type ?? "",
              BracketStatistics?.rating ?? 0,
              BracketStatistics?.specialization?.id
            )}
          </span>
        </Card>
      </div>
    );
  }
  //loops through each character rating (remember: characterratings is updated every time the user looks up a character, and has character data from controller)
  function getRatings() {
    const RatingCards: ReactElement[] = [];
    const ShuffleCards: ReactElement[] = [];
    const BlitzCards: ReactElement[] = [];
    if (characterRatings) {

      characterRatings.sort((a, b) => a?.bracket?.type?.localeCompare(b?.bracket?.type ?? "") ?? 0); //sorts characterRatings by bracket name, so the order is always the same
      // [{2v2}, {3v3}, {5v5}, {rbg}] - characterratings is being updated by setcharacterratings, which is communicating with the controller to call a character's bracket ratings.
      characterRatings.forEach((BracketStatistics, index) => {
        if (BracketStatistics?.bracket?.type?.startsWith("SHUFFLE")) {
          ShuffleCards.push(getRatingCard(BracketStatistics, index));
        }
        else if (BracketStatistics?.bracket?.type?.startsWith("BLITZ")) {
          BlitzCards.push(getRatingCard(BracketStatistics, index));
        }
        else {
          RatingCards.push(getRatingCard(BracketStatistics, index));
        }
      })
    }

    return (
      <div className="flex-wrap flex flex-col items-end">
        <div className="flex-wrap flex flex-row ">{RatingCards}</div>
        {(ShuffleCards.length > 0 || BlitzCards.length > 0) && (
          <div className="flex flex-col items-center">
            <Card className="rating-titles">
              <button
                type="button"
                className={"rating-section-title" + (soloMode === "shuffle" ? " active" : "")}
                onClick={() => setSoloMode("shuffle")}
              >
                Shuffle
              </button>
              <Separator orientation="vertical" className="rating-titles-separator" />
              <button
                type="button"
                className={"rating-section-title" + (soloMode === "blitz" ? " active" : "")}
                onClick={() => setSoloMode("blitz")}
              >
                Blitz
              </button>
            </Card>
            {/* switches to shuffle or blitz depending on what is the active useState for soloMode */}
            <div className="flex-wrap flex flex-row">
              {soloMode === "shuffle" ? ShuffleCards : BlitzCards}
            </div>
          </div>
        )}
      </div>
    );
  }
};
export default ProfileRating;
