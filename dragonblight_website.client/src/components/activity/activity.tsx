import { useEffect, useRef, useState } from "react";
import * as Avatar from "@radix-ui/react-avatar";
import { useNavigate } from "react-router";
import "@preline/select"; // Import Preline JavaScript
import {
  Card,
  Table,
  Flex,
  Container,
  SegmentedControl,
  Callout,
} from "@radix-ui/themes";
import { Dragonblight } from "../../clients/Dragonblight";
import "./activity.css";
import { ClassColor } from "../../helpers/classColorHelper";
import { useParams } from "react-router";
import ClassFilter, { ladderFilter } from "../class-filter/class-filter";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import Cutoffs from "../cutoffs/cutoffs";
import { LadderPagination, LadderSkeletonRows, MobileDetailRow, MobileDetailsDialog, RegionToggle } from "../ladder-controls/ladder-controls";
import { brackets } from "../../helpers/game-flavor";
import classNames from "classnames";
import { realmName } from "../../helpers/realmNameHelper";
import { rankOneRatingClass } from "../../helpers/ratingTierHelper";
import { bracketLabels, bracketSlug, isBlitzBracket, isShuffleBracket } from "../../helpers/solo-bracket-specs";

function Activity() {
  //const [count, setCount] = useState(0); //store dynamic data, focus on arena ladder component
  const [ladderData, setLadderData] = useState<
    Dragonblight.ActivityCharacterSummary[]
  >();

  const { URLregion, URLbracket } = useParams();
  const [region, setRegion] = useState<string>(URLregion ?? "us");
  const [page, setPage] = useState<number>(0);
  const [bracket, setBracket] = useState<string>(URLbracket ?? "3v3");
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([
    "All Classes",
  ]);
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [hoveredAlts, setHoveredAlts] = useState<Dragonblight.CharacterIdentity[]>([]);
  const [ladders, setLadders] = useState<Dragonblight.LadderBracket[]>([]);
  const [rewards, setRewards] = useState<Dragonblight.PvpSeasonRewardWithRank[]>([]);
  const [hoveredPlayer, setHoveredPlayer] = useState<Dragonblight.ActivityCharacterSummary | null>(null);
  const timeoutRef = useRef(0);

  //rewards and ladders only change with the region, and a failed lookup just leaves the ratings uncolored
  useEffect(() => {
    const client = new Dragonblight.PvpLeaderboardClient();
    client.getPvPRewards(region).then((r) => setRewards(r ?? [])).catch(() => setRewards([]));
    client.getLadderBrackets(region).then((l) => setLadders(l ?? [])).catch(() => setLadders([]));
  }, [region]);

  function ratingClass(entry: Dragonblight.ActivityCharacterSummary): string {
    return rankOneRatingClass(
      rewards,
      ladders,
      bracket,
      entry.currPvpEntry.rating,
      entry.charSummary?.character_class?.name,
      entry.spec || entry.charSummary?.active_spec?.name,
      entry.currPvpEntry.faction?.type
    );
  }

  //a lower rank number is better, so going up in number is the red direction
  function rankChange(entry: Dragonblight.ActivityCharacterSummary) {
    const change = entry.currPvpEntry.rank - entry.prevPvpEntry.rank;
    let colorClass = "text-green-300";
    if (change >= 0) {
      colorClass = "text-red-300";
    }
    let sign = "";
    if (change > 0) {
      sign = "+";
    }
    return <span className={colorClass}>{sign}{change}</span>;
  }

  function ratingChange(entry: Dragonblight.ActivityCharacterSummary) {
    const change = entry.currPvpEntry.rating - entry.prevPvpEntry.rating;
    let colorClass = "text-red-300";
    let sign = "";
    if (change >= 0) {
      colorClass = "text-green-300";
      sign = "+";
    }
    return <span className={colorClass}>{sign}{change}</span>;
  }

  function increasedGames(entry: Dragonblight.ActivityCharacterSummary) {
    const won = (entry.currPvpEntry?.season_match_statistics?.won ?? 0) - (entry.prevPvpEntry?.season_match_statistics?.won ?? 0);
    const lost = (entry.currPvpEntry?.season_match_statistics?.lost ?? 0) - (entry.prevPvpEntry?.season_match_statistics?.lost ?? 0);
    return { won, lost };
  }

  function queuedTogether(entry: Dragonblight.ActivityCharacterSummary) {
    //Shuffle and Blitz are solo queues, so matching wins and losses doesn't mean two players queued together
    if (hoveredPlayer == null || isShuffleBracket(bracket) || isBlitzBracket(bracket)) {
      return false;
    }
    const hovered = increasedGames(hoveredPlayer);
    if (hovered.won + hovered.lost < 4 || hoveredPlayer.charSummary?.id == entry.charSummary?.id) {
      return false;
    }
    const gained = increasedGames(entry);
    return gained.won == hovered.won && gained.lost == hovered.lost;
  }

  function rowClass(entry: Dragonblight.ActivityCharacterSummary): string {
    const className = "h-[23px] align-middle hover:bg-gray-200/20 cursor-pointer";
    if (queuedTogether(entry)) {
      return className + " bg-emerald-500/20"
    }
    else {
      if (hoveredAlts.some(alt => alt.name == entry.charSummary?.name && alt.realm == entry.charSummary?.realm?.slug)) {
        return className + " bg-gray-500/20"
      }
    }
    return className;
  }

  function hoveredPlayerAndLeaderboardAlts(entry: Dragonblight.ActivityCharacterSummary) {
    setHoveredPlayer(entry);
    findLeaderboardAlts(entry.charSummary?.name ?? "", entry.charSummary?.realm?.slug ?? "")
  }
  const findLeaderboardAlts = async (characterName: string, realm: string) => {
    timeoutRef.current = setTimeout(async () => {
      const DragonblightClient = new Dragonblight.PvpLeaderboardClient();
      setHoveredAlts(await DragonblightClient.getLeaderboardAlts(characterName, realm, region));
    }, 150)
  };
  const handleMouseLeave = () => {
    setHoveredAlts([]);
    setHoveredPlayer(null);
    clearTimeout(timeoutRef.current);
  }
  //getting values that are changeable
  useEffect(() => {
    if (selectedClasses != null && selectedClasses.length > 0) {
      setLoading(true);
      if (selectedClasses.includes("All Classes")) {
        LadderData();
      } else {
        FilteredLadderData(ladderFilter(selectedClasses, selectedSpecs), bracket);
      }
    }
  }, [bracket, region, page, selectedClasses, selectedSpecs]);

  //when page changes, call useeffect and update the skip amount
  const handlePageChange = (page: number) => {
    setPage(page);
  };

  //changes bracket from segmented control
  function BracketClick(bracketName: string) {
    if (bracket != bracketName) {
      navigate(`/activity/${region}/${bracketName}`, { replace: true });
      setBracket(bracketName);
    }
  }
  function RegionClick(regionName: string) {
    if (region != regionName) {
      navigate(`/activity/${regionName}/${bracket}`, { replace: true });
      setRegion(regionName);
    }
  }

  return (
    <div>
      <Cutoffs region={region} bracket={bracket}></Cutoffs>
      <ClassFilter region={region} onChange={(classes, specs) => {
        setSelectedClasses(classes);
        setSelectedSpecs(specs);
      }} />
      <div className="flex-col">
        <div className="flex-row justify-center flex px-0 py-3 flex-wrap">

          <div className={loading ? "div-disabled" : ""}>
            <SegmentedControl.Root
              className="w-[300px] grow-0"
              defaultValue={URLbracket ?? "3v3"}
            >
              {brackets().map((name) => (
                <SegmentedControl.Item
                  key={name}
                  onClick={() => {
                    BracketClick(bracketSlug(name));
                  }}
                  value={bracketSlug(name)}
                >
                  {bracketLabels[name]}
                </SegmentedControl.Item>
              ))}
            </SegmentedControl.Root>
          </div>
          <div className="db-grow"></div>
          <RegionToggle defaultValue={URLregion ?? "us"} disabled={loading} onSelect={RegionClick} />
        </div>
      </div>
      <div className="desktopWidth">
        <LadderPagination
          page={page}
          onPageChange={handlePageChange}
          size="compact"
          className=" pb-3"
          navClassName="flex justify-end grow-0"
          showCount
        />
      </div>
      <Container className="desktopWidth flex justify-center">
        <Flex direction="column" gap="5" maxWidth="950px">
          <Card className="p-0">
            <Table.Root className="" size="1" variant="ghost">
              <Table.Header>
                <Table.Row align="start">
                  <Table.ColumnHeaderCell>Rank</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Character</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="desktopOnly">
                    Server
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="desktopOnly">
                    Rating
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="desktopOnly">
                    Win
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="desktopOnly">
                    Loss
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="desktopOnly">
                    Tracked
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="mobileOnly">
                    Details
                  </Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {loading && <LadderSkeletonRows />}
                {/* map acts as a for loop to find character data in ladder */}
                {ladderData?.map((characterEntry, i) => {
                  return (
                    <Table.Row
                      onMouseEnter={() => hoveredPlayerAndLeaderboardAlts(characterEntry)}
                      className={rowClass(characterEntry)}
                      key={"rankingsRow" + i}
                      onMouseLeave={() => handleMouseLeave()}>
                      <Table.Cell
                        onClick={() => {
                          if (characterEntry.charSummary == null) {
                            return;
                          }
                          navigate(
                            `/profile/${region}/${characterEntry.charSummary?.realm?.slug}/${characterEntry.charSummary?.name}`
                          );
                        }}
                      >
                        {characterEntry.currPvpEntry.rank}{" "}
                        {rankChange(characterEntry)}
                      </Table.Cell>
                      <Table.Cell
                        onClick={() => {
                          if (characterEntry.charSummary == null) {
                            return;
                          }
                          navigate(
                            `/profile/${region}/${characterEntry.charSummary?.realm?.slug}/${characterEntry.charSummary?.name}`
                          );
                        }}
                      >
                        <Flex>
                          <Avatar.Root className="h-[23px] w-[23px] mr-1">
                            <Avatar.Image
                              src={(() => {
                                if (characterEntry.charSummary == null) {
                                  return `/unknown.png`;
                                }
                                return `/RaceIcons/${characterEntry.charSummary?.race?.name
                                  ?.toLowerCase()
                                  .replace(" ", "")}${characterEntry.charSummary?.gender?.name ==
                                    "Female"
                                    ? "-f"
                                    : "-m"
                                  }.png`;
                              })()}
                            />
                            <Avatar.Fallback />
                          </Avatar.Root>
                          <Avatar.Root className="h-[23px] w-[23px] mr-1">
                            <Avatar.Image
                              src={(() => {
                                if (characterEntry.charSummary == null) {
                                  return `/unknown.png`;
                                }
                                return `/ProfileClassIcons/${characterEntry.charSummary?.character_class?.name
                                  ?.toLowerCase()
                                  .replace(" ", "")}.png`;
                              })()}
                            />
                            <Avatar.Fallback />
                          </Avatar.Root>
                          <Avatar.Root className="h-[23px] w-[23px] mr-1">
                            <Avatar.Image
                              src={(() => {
                                const specName = characterEntry.spec || characterEntry.charSummary?.active_spec?.name;
                                if (!specName) {
                                  return `/unknown.png`;
                                }
                                return `/Specs/${specName.toLowerCase()}_${characterEntry.charSummary?.character_class?.name?.toLowerCase()}.png`;
                              })()}
                            />
                            <Avatar.Fallback />
                          </Avatar.Root>
                          <span
                            style={{
                              color: `${ClassColor.get(
                                characterEntry.charSummary?.character_class
                                  ?.name ?? ""
                              )}`,
                            }}
                          >
                            {characterEntry.currPvpEntry.character?.name}
                          </span>
                        </Flex>
                      </Table.Cell>
                      <Table.Cell
                        onClick={() => {
                          if (characterEntry.charSummary == null) {
                            return;
                          }
                          navigate(
                            `/profile/${region}/${characterEntry.charSummary?.realm?.slug}/${characterEntry.charSummary?.name}`
                          );
                        }}
                        className="desktopOnly"
                      >
                        {realmName(characterEntry.charSummary?.realm ?? characterEntry.currPvpEntry.character?.realm)}
                      </Table.Cell>
                      <Table.Cell
                        onClick={() => {
                          if (characterEntry.charSummary == null) {
                            return;
                          }
                          navigate(
                            `/profile/${region}/${characterEntry.charSummary?.realm?.slug}/${characterEntry.charSummary?.name}`
                          );
                        }}
                        className="desktopOnly"
                      >
                        <span className={ratingClass(characterEntry)}>{characterEntry.currPvpEntry.rating}</span>{" "}
                        {ratingChange(characterEntry)}
                      </Table.Cell>
                      <Table.Cell
                        onClick={() => {
                          if (characterEntry.charSummary == null) {
                            return;
                          }
                          navigate(
                            `/profile/${region}/${characterEntry.charSummary?.realm?.slug}/${characterEntry.charSummary?.name}`
                          );
                        }}
                        className="text-green-300 desktopOnly"
                      >
                        {(characterEntry.currPvpEntry.season_match_statistics
                          ?.won ?? 0) -
                          (characterEntry.prevPvpEntry.season_match_statistics
                            ?.won ?? 0)}
                      </Table.Cell>
                      <Table.Cell
                        onClick={() => {
                          if (characterEntry.charSummary == null) {
                            return;
                          }
                          navigate(
                            `/profile/${region}/${characterEntry.charSummary?.realm?.slug}/${characterEntry.charSummary?.name}`
                          );
                        }}
                        className="text-red-300 desktopOnly"
                      >
                        {(characterEntry.currPvpEntry.season_match_statistics
                          ?.lost ?? 0) -
                          (characterEntry.prevPvpEntry.season_match_statistics
                            ?.lost ?? 0)}
                      </Table.Cell>
                      <Table.Cell
                        onClick={() => {
                          if (characterEntry.charSummary == null) {
                            return;
                          }
                          navigate(
                            `/profile/${region}/${characterEntry.charSummary?.realm?.slug}/${characterEntry.charSummary?.name}`
                          );
                        }}
                        className="desktopOnly"
                      >
                        {characterEntry.time}
                      </Table.Cell>
                      <Table.Cell className="mobileOnly">
                        <MobileDetailsDialog
                          region={region}
                          realm={characterEntry.charSummary?.realm?.slug ?? characterEntry.currPvpEntry.character?.realm?.slug}
                          characterName={characterEntry.charSummary?.name ?? characterEntry.currPvpEntry.character?.name}
                        >
                          <MobileDetailRow label="Rank">
                            {characterEntry.currPvpEntry.rank}
                            {rankChange(characterEntry)}
                          </MobileDetailRow>
                          <MobileDetailRow label="Rating">
                            <span className={ratingClass(characterEntry)}>{characterEntry.currPvpEntry.rating}</span>
                            {ratingChange(characterEntry)}
                          </MobileDetailRow>
                          <MobileDetailRow label="Player">{characterEntry.currPvpEntry.character?.name}</MobileDetailRow>
                          <MobileDetailRow label="Class">
                            <span style={{ color: `${ClassColor.get(characterEntry.charSummary?.character_class?.name ?? "")}` }}>
                              {characterEntry.charSummary?.character_class?.name}
                            </span>
                          </MobileDetailRow>
                          <MobileDetailRow label="Faction">{characterEntry.charSummary?.faction?.name}</MobileDetailRow>
                          <MobileDetailRow label="Server">
                            {realmName(characterEntry.charSummary?.realm ?? characterEntry.currPvpEntry.character?.realm)}
                          </MobileDetailRow>
                          <MobileDetailRow label="Wins" valueClassName="text-green-300">
                            {increasedGames(characterEntry).won}
                          </MobileDetailRow>
                          <MobileDetailRow label="Losses" valueClassName="text-red-300">
                            {increasedGames(characterEntry).lost}
                          </MobileDetailRow>
                          <MobileDetailRow label="Tracked">{characterEntry.time}</MobileDetailRow>
                        </MobileDetailsDialog>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
            {ladderData?.length == 0 && !loading && (
              <Callout.Root color="red">
                <Callout.Icon>
                  <InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>No Ladder Activity</Callout.Text>
              </Callout.Root>
            )}
          </Card>
        </Flex>
        <LadderPagination
          page={page}
          onPageChange={handlePageChange}
          size="large"
          className="pt-2 pb-10"
          navClassName="flex justify-center"
        />
      </Container>
    </div>
  );
  async function FilteredLadderData(
    selectedClasses: string[],
    bracket: string
  ) {
    setLoading(true);
    const DragonblightClient = new Dragonblight.ActivityClient();
    setLadderData([]);
    setLadderData(
      await DragonblightClient.getLadderHistoryFiltered(
        bracket,
        region,
        selectedClasses,
        page * 50,
        50
      )
    );
    setLoading(false);
  }
  //setting bracket we want to show on rankings page
  async function LadderData() {
    const DragonblightClient = new Dragonblight.ActivityClient();
    setLadderData([]);
    setLadderData(
      await DragonblightClient.getLadderHistory(
        bracket,
        region,
        page * 50,
        50
      )
    );
    setLoading(false);
  }
}

export default Activity;
