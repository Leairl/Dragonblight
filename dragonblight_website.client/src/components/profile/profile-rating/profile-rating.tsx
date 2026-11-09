import { FC, ReactElement, useEffect, useState } from "react";
import { Dragonblight } from "../../../clients/Dragonblight";
import { useParams } from "react-router";
import { Card, Heading, Separator, Skeleton, HoverCard, DataList } from "@radix-ui/themes";
import "./profile-rating.css";
import { brackets } from "../../../helpers/game-flavor";
import { bestReward, ratingColor } from "../../../helpers/ratingTierHelper";
import { SoloSpecIcon } from "../../../helpers/solo-bracket-specs";
import RatingHistoryDialog from "./rating-history-dialog";


interface ProfileRatingProps {
  characterNotFound?: boolean;
  characterClass: string | undefined;
  characterFaction: string | undefined;
  rewards: Dragonblight.PvpSeasonRewardWithRank[] | [];
}

const ProfileRating: FC<ProfileRatingProps> = ({ characterNotFound, characterClass, characterFaction, rewards }) => {
  // pulls dictionary of keys from pvp bracket
  const [characterRatings, setcharacterRatings] = useState<
    Dragonblight.CharacterPvpBracketStatistics[]
  >(); //calls schema from argentponywarcraft client
  const [loading, setLoading] = useState<boolean>();
  const { region, server, characterName } = useParams();
  const [soloMode, setSoloMode] = useState<"shuffle" | "blitz">("shuffle");
  const [highestRatings, setHighestRatings] = useState<{ [key: string]: number }>({});

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
        setLoading(false);
      }
    );
  }, [region, server, characterName]);
  useEffect(() => {
    setHighestRatings({});
    new Dragonblight.PvpStatClient()
      .getHighestRatings(server?.replace(" ", "-"), characterName, region)
      .then((data) => {
        if (data) {
          setHighestRatings(data);
        }
      })
      .catch(() => setHighestRatings({}));
  }, [region, server, characterName]);

  // The title line under a card, label included, or "" when the rating earns none. Retail's reward list
  // only holds rank 1 titles, so retail shows a line only for those; classic's has every title.
  function getTitleLine(
    bracket: string,
    current_rating: number,
    specId?: number
  ): string {
    const reward = bestReward(rewards, bracket, current_rating, specId, characterFaction);
    // "Venomous Gladiator: Midnight Season 2" -> "Venomous Gladiator"
    const title = reward?.achievement?.name?.split(":")[0];
    if (!title) {
      return "";
    }
    return `Predicted Title: ${title}`;
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
      <div className="rating-bracket-row flex flex-wrap flex-row justify-end w-full">{SkeletonCards}</div>
    );
  }

  function historyTitle(BracketStatistics: Dragonblight.CharacterPvpBracketStatistics | null, index: number): string {
    const specName = BracketStatistics?.specialization?.name;
    if (!specName) {
      return brackets()[index]?.replace("rbg", "RBG") ?? "";
    }
    if (BracketStatistics?.bracket?.type?.startsWith("BLITZ")) {
      return `${specName} Blitz`;
    }
    return `${specName} Shuffle`;
  }
  function highestFor(BracketStatistics: Dragonblight.CharacterPvpBracketStatistics | null, index: number): number {
    if (BracketStatistics?.specialization?.id != null) {
      return 0;
    }
    return highestRatings[brackets()[index] ?? ""] ?? 0;
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
                "rating-value font-bold text-3xl flex justify-center text-shadow-md text-shadow-black"

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
          {/* pinned to the card's top right corner, outside the column below */}
          {(BracketStatistics?.rating ?? 0) > 0 && (
            <div className="rating-history-corner">
              <RatingHistoryDialog
                title={historyTitle(BracketStatistics, index)}
                bracketType={BracketStatistics?.bracket?.type ?? ""}
                specId={BracketStatistics?.specialization?.id}
              />
            </div>
          )}
          {/* mt-auto fills all space vertically from the top, pushing the title text to the bottom */}
          <span className="text-xs italic mt-auto pt-2 text-center">
            {getTitleLine(
              BracketStatistics?.bracket?.type ?? "",
              BracketStatistics?.rating ?? 0,
              BracketStatistics?.specialization?.id
            )}
          </span>
                    {highestFor(BracketStatistics, index) > 0 && (
            <span className="text-xs text-center text-gray-400 mt-1">
              Highest Rating: {highestFor(BracketStatistics, index)}
            </span>
          )}
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
      <div className="rating-sections flex-wrap flex flex-col items-end">
        <div className="rating-bracket-row flex-wrap flex flex-row ">{RatingCards}</div>
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
            <div className="rating-solo-row flex-wrap flex flex-row">
              {soloMode === "shuffle" ? ShuffleCards : BlitzCards}
            </div>
          </div>
        )}
      </div>
    );
  }
};
export default ProfileRating;
