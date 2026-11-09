import { useEffect, useRef, useState } from "react";
import * as Avatar from "@radix-ui/react-avatar";
import { useNavigate } from "react-router"
import "@preline/select"; // Import Preline JavaScript
import {
  Card,
  Table,
  Flex,
  Container,
  SegmentedControl,
  Progress,
  Tooltip,
} from "@radix-ui/themes";
import { Dragonblight } from "../../clients/Dragonblight";
import "./rankings.css";
import { ClassColor } from "../../helpers/classColorHelper";
import { useParams } from "react-router";
import ClassFilter, { ladderFilter } from "../class-filter/class-filter";
import Cutoffs from "../cutoffs/cutoffs";
import { LadderPagination, LadderSkeletonRows, MobileDetailRow, MobileDetailsDialog, RegionToggle } from "../ladder-controls/ladder-controls";
import { brackets } from "../../helpers/game-flavor";
import { SoloSpec, defaultBlitzSpec, isBlitzBracket, setShuffleSpecs, setBlitzSpecs, defaultShuffleSpec, isShuffleBracket, shuffleSpecs, blitzSpecs, SoloSpecIcon } from "../../helpers/solo-bracket-specs";
import SoloSpecFilter from "../solo-spec-filter/solo-spec-filter";
import { realmName } from "../../helpers/realmNameHelper";
import { rankOneRatingClass } from "../../helpers/ratingTierHelper";

function Rankings() {
  //const [count, setCount] = useState(0); //store dynamic data, focus on arena ladder component
  const [ladderData, setLadderData] = useState<
    Dragonblight.PvpCharacterSummary[]
  >();
  const { URLregion, URLbracket } = useParams();
  const [region, setRegion] = useState<string>(URLregion ?? "us");
  const [page, setPage] = useState<number>(0);
  const [bracket, setBracket] = useState<string>(URLbracket ?? "3v3");
  const navigate = useNavigate()
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedClasses, setSelectedClasses] = useState<string[]>(["All Classes"]);
  const [soloClass, setSoloClass] = useState<string | null>(null);
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<number>(0);
  const [ladders, setLadders] = useState<Dragonblight.LadderBracket[]>([]);
  const [rewards, setRewards] = useState<Dragonblight.PvpSeasonRewardWithRank[]>([]);
  const [hoveredAlts, setHoveredAlts] = useState<Dragonblight.CharacterIdentity[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function ratingClass(entry: Dragonblight.PvpCharacterSummary): string {
    return rankOneRatingClass(
      rewards,
      ladders,
      bracket,
      entry.pvpEntry.rating,
      entry.charSummary?.character_class?.name,
      entry.spec || entry.charSummary?.active_spec?.name,
      entry.pvpEntry.faction?.type
    );
  }

  const findLeaderboardAlts = async (characterName: string, realm: string) => {
    timeoutRef.current = setTimeout(async () => {
      const DragonblightClient = new Dragonblight.PvpLeaderboardClient();
      setHoveredAlts(await DragonblightClient.getLeaderboardAlts(characterName, realm, region));
    }, 150)
  };
  const handleMouseLeave = () => {
    setHoveredAlts([]);
    clearTimeout(timeoutRef.current);
  }
  function checkIfAlt(characterName: string, realm: string): string {
    const className = "h-[23px] align-middle hover:bg-gray-200/20 cursor-pointer"
    if (hoveredAlts.some(alt => alt.name == characterName && alt.realm == realm)) {
      return className + " bg-gray-500/20"
    }
    return className
  }
  //getting values that are changeable
  useEffect(() => {
    setLoading(true);
    //a class filter left over from another bracket does not apply to a Shuffle or Blitz ladder
    if ((isShuffleBracket(bracket) || isBlitzBracket(bracket)) && soloClass) {
      FilteredLadderData(soloClass ? [soloClass] : [], bracket);
    }
    else if (selectedClasses.includes("All Classes") || isShuffleBracket(bracket) || isBlitzBracket(bracket)) {
      LadderData();
    }
    else {
      FilteredLadderData(ladderFilter(selectedClasses, selectedSpecs), bracket);
    }

    //the sync runs every two hours and a bracket can start at any moment, so the bar is refreshed for
    //as long as this bracket is on screen rather than only while it was last seen below 100%
    setSyncStatus(0);
    GetSyncStatus();
    const interval = setInterval(() => {
      GetSyncStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [bracket, region, page, selectedClasses, selectedSpecs, soloClass]);
  useEffect(() => {
    const DragonblightClient = new Dragonblight.PvpLeaderboardClient();
    //a failed lookup just leaves the ratings uncolored
    DragonblightClient.getPvPRewards(region).then((r) => setRewards(r ?? [])).catch(() => setRewards([]));
    //the playable classes come back in Blizzard's class order, which the class filter uses, so the solo filter sorts by it too
    Promise.all([DragonblightClient.getLadderBrackets(region), DragonblightClient.getPlayableClasses(region)]).then(
      ([result, playableClasses]) => {
        const classOrder = (playableClasses ?? []).map((c) => c.name);
        //where a class sits in that order, with any class the list doesn't have going last
        function classPosition(className: string): number {
          const position = classOrder.indexOf(className);
          if (position === -1) {
            return classOrder.length;
          }
          return position;
        }
        setLadders(result ?? [])
        const soloLadders = result?.filter((l) => isShuffleBracket(l.slug) || isBlitzBracket(l.slug)) ?? [];
        const soloSpecsFromLadders = soloLadders.map((l) => {
          const newSoloSpec: SoloSpec = {
            slug: l.slug,
            className: l.className ?? "",
            specName: l.specName ?? "",
            specId: l.specId ?? 0,
          }
          return newSoloSpec;
        })
        //classes in the same order as the class filter on the other brackets; within a class the specs keep the ladders' order
        setShuffleSpecs(soloSpecsFromLadders.filter((s) => isShuffleBracket(s.slug)).sort((a, b) => classPosition(a.className) - classPosition(b.className)));
        setBlitzSpecs(soloSpecsFromLadders.filter((s) => isBlitzBracket(s.slug)).sort((a, b) => classPosition(a.className) - classPosition(b.className)));
      });
  }, [region]);
  //when page changes, call useeffect and update the skip amount
  const handlePageChange = (page: number) => {
    setPage(page);
  };

  //changes bracket from segmented control
  function BracketClick(bracketName: string) {
    if (bracket != bracketName) {
      navigate(`/rankings/${region}/${bracketName}`, { replace: true });
      setBracket(bracketName);
    }
  }
  function RegionClick(regionName: string) {
    if (region != regionName) {
      navigate(`/rankings/${regionName}/${bracket}`, { replace: true });
      setRegion(regionName);
    }
  }

  return (
    <div>
      <Cutoffs region={region} bracket={bracket}></Cutoffs>
      {/* a Shuffle or Blitz ladder is a single spec, so there are no classes to filter */}
      {isShuffleBracket(bracket) || isBlitzBracket(bracket) ? (
        <SoloSpecFilter
          selected={bracket}
          onSelect={BracketClick}
          selectedClass={soloClass}
          onClassSelect={setSoloClass}
          isBlitz={isBlitzBracket(bracket)}
          isShuffle={isShuffleBracket(bracket)}
        />
      ) : (
        <ClassFilter region={region} onChange={(classes, specs) => {
          setSelectedClasses(classes);
          setSelectedSpecs(specs);
        }} />

      )}
      <div className="ladder-toolbar desktopWidth toolbar py-3">

        <div className={loading ? "div-disabled" : ""}>
          <SegmentedControl.Root
            className="bracket-toggle slider-border w-[300px] grow-0"
            //every spec ladder sits under the one Shuffle or Blitz tab
            defaultValue={isShuffleBracket(URLbracket) ? "shuffle" : isBlitzBracket(URLbracket) ? "blitz" : URLbracket ?? "3v3"}
          >
            <SegmentedControl.Item
              onClick={() => {
                BracketClick("2v2");
              }}
              value="2v2"
            >
              2v2
            </SegmentedControl.Item>
            <SegmentedControl.Item
              onClick={() => {
                BracketClick("3v3");
              }}
              value="3v3"
            >
              3v3
            </SegmentedControl.Item>
            {brackets().includes("5v5") && (
              <SegmentedControl.Item
                onClick={() => {
                  BracketClick("5v5");
                }}
                value="5v5"
              >
                5v5
              </SegmentedControl.Item>
            )}
            <SegmentedControl.Item
              onClick={() => {
                BracketClick("rbg");
              }}
              value="rbg"
            >
              RBG
            </SegmentedControl.Item>
            {brackets().includes("shuffle") && (
              <SegmentedControl.Item
                onClick={() => {
                  //stay on the chosen spec if a Shuffle ladder is already showing
                  if (!isShuffleBracket(bracket)) {
                    setSoloClass(null);
                    BracketClick(defaultShuffleSpec);
                  }
                }}
                value="shuffle"
              >
                Shuffle
              </SegmentedControl.Item>
            )}
            {brackets().includes("blitz") && (
              <SegmentedControl.Item
                onClick={() => {
                  //stay on the chosen spec if a Blitz ladder is already showing
                  if (!isBlitzBracket(bracket)) {
                    setSoloClass(null);
                    BracketClick(defaultBlitzSpec);
                  }
                }}
                value="blitz"
              >
                Blitz
              </SegmentedControl.Item>
            )}
          </SegmentedControl.Root>
        </div>
        <div className="toolbar-right">

          <Tooltip className="flex items-center" content="Percentage synced with Blizzard">
            <span className="flex items-center">
              <span>{Math.round(syncStatus * 100)}%</span>
              <Progress
                value={syncStatus}
                max={1}
                className="grow-0 w-[100px] h-[10px] mx-2"
              />
            </span>
          </Tooltip>

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
      <Container className="desktopWidth justify-center">
        {/* <Flex direction="column" gap="5" maxWidth="950px"> */}
        <Card className="p-0">
          <Table.Root className="" size="1" variant="ghost" style={{ tableLayout: "fixed", width: "100%" }}>
            <Table.Header>
              <Table.Row align="start">
                <Table.ColumnHeaderCell width="90px">Rank</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Character</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell className="desktopOnly" width="260px">Server</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell className="desktopOnly" width="110px">Rating</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell className="desktopOnly" width="70px">Win</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell className="desktopOnly" width="70px">Loss</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell className="mobileOnly" width="90px">Details</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {loading && <LadderSkeletonRows />}
              {loading &&
                <div className="h-[1000px]">

                </div>
              }
              {/* map acts as a for loop to find character data in ladder */}
              {!loading && ladderData?.map((characterEntry, i) => (
                <Table.Row onMouseEnter={() => findLeaderboardAlts(characterEntry.charSummary?.name ?? "", characterEntry.charSummary?.realm?.slug ?? "")}
                  className={checkIfAlt(characterEntry.charSummary?.name ?? "", characterEntry.charSummary?.realm?.slug ?? "")}
                  key={"rankingsRow" + i}
                  onMouseLeave={() => handleMouseLeave()}>
                  <Table.Cell
                    onClick={() => {
                      if (characterEntry.charSummary?.name == null) {
                        return;
                      }
                      navigate(`/profile/${region}/${characterEntry.charSummary?.realm?.slug}/${characterEntry.charSummary?.name}`);
                    }}
                  >
                    {characterEntry.pvpEntry.rank}
                  </Table.Cell>
                  <Table.Cell
                    onClick={() => {
                      if (characterEntry.charSummary?.name == null) {
                        return;
                      }
                      navigate(`/profile/${region}/${characterEntry.charSummary?.realm?.slug}/${characterEntry.charSummary?.name}`);
                    }}
                  >
                    <Flex>
                      <Avatar.Root className="h-[23px] w-[23px] mr-1">
                        <Avatar.Image
                          src={(() => {
                            if (characterEntry.charSummary?.name == null) {
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
                            if (characterEntry.charSummary?.name == null) {
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

                            const soloSpec = shuffleSpecs.find((s) => s.slug == bracket) ?? blitzSpecs.find((s) => s.slug == bracket);
                            if (soloSpec?.specName != "" && soloSpec?.specName != null) {
                              return SoloSpecIcon(soloSpec);
                            }
                            if (soloSpec?.specName == "") {
                              if (characterEntry.spec == null || characterEntry.spec == "" || characterEntry.charSummary?.character_class?.name == null) {
                                return `/unknown.png`;
                              }
                              return `/Specs/${characterEntry.spec?.toLowerCase()}_${characterEntry.charSummary?.character_class?.name?.toLowerCase()}.png`;
                            }
                            const specName = characterEntry.spec || characterEntry.charSummary?.active_spec?.name;
                            if (!specName || characterEntry.charSummary?.name == null) {
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
                        {characterEntry.pvpEntry.character?.name}
                      </span>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell
                    onClick={() => {
                      if (characterEntry.charSummary?.name == null) {
                        return;
                      }
                      navigate(`/profile/${region}/${characterEntry.charSummary?.realm?.slug}/${characterEntry.charSummary?.name}`);
                    }}
                    className="desktopOnly"
                  >
                    {realmName(characterEntry.charSummary?.realm ?? characterEntry.pvpEntry.character?.realm)}
                  </Table.Cell>
                  <Table.Cell
                    onClick={() => {
                      if (characterEntry.charSummary?.name == null) {
                        return;
                      }
                      navigate(`/profile/${region}/${characterEntry.charSummary?.realm?.slug}/${characterEntry.charSummary?.name}`);
                    }}
                    className={"desktopOnly " + ratingClass(characterEntry)}
                  >
                    {characterEntry.pvpEntry.rating}
                  </Table.Cell>
                  <Table.Cell
                    onClick={() => {
                      if (characterEntry.charSummary?.name == null) {
                        return;
                      }
                      navigate(`/profile/${region}/${characterEntry.charSummary?.realm?.slug}/${characterEntry.charSummary?.name}`);
                    }}
                    className="text-green-300 desktopOnly"
                  >
                    {characterEntry.pvpEntry.season_match_statistics?.won}
                  </Table.Cell>
                  <Table.Cell
                    onClick={() => {
                      if (characterEntry.charSummary?.name == null) {
                        return;
                      }
                      navigate(`/profile/${region}/${characterEntry.charSummary?.realm?.slug}/${characterEntry.charSummary?.name}`);
                    }}
                    className="text-red-300 desktopOnly"
                  >
                    {characterEntry.pvpEntry.season_match_statistics?.lost}
                  </Table.Cell>
                  <Table.Cell className="mobileOnly">
                    <MobileDetailsDialog
                      region={region}
                      realm={characterEntry.charSummary?.realm?.slug ?? characterEntry.pvpEntry.character?.realm?.slug}
                      characterName={characterEntry.charSummary?.name ?? characterEntry.pvpEntry.character?.name}
                    >
                      <MobileDetailRow label="Rank">{characterEntry.pvpEntry.rank}</MobileDetailRow>
                      <MobileDetailRow label="Rating" valueClassName={ratingClass(characterEntry)}>
                        {characterEntry.pvpEntry.rating}
                      </MobileDetailRow>
                      <MobileDetailRow label="Player">{characterEntry.pvpEntry.character?.name}</MobileDetailRow>
                      <MobileDetailRow label="Class">
                        <span style={{ color: `${ClassColor.get(characterEntry.charSummary?.character_class?.name ?? "")}` }}>
                          {characterEntry.charSummary?.character_class?.name}
                        </span>
                      </MobileDetailRow>
                      <MobileDetailRow label="Faction">{characterEntry.charSummary?.faction?.name}</MobileDetailRow>
                      <MobileDetailRow label="Server">
                        {realmName(characterEntry.charSummary?.realm ?? characterEntry.pvpEntry.character?.realm)}
                      </MobileDetailRow>
                      <MobileDetailRow label="Wins" valueClassName="winColor">
                        {characterEntry.pvpEntry.season_match_statistics?.won}
                      </MobileDetailRow>
                      <MobileDetailRow label="Losses" valueClassName="lossColor">
                        {characterEntry.pvpEntry.season_match_statistics?.lost}
                      </MobileDetailRow>
                    </MobileDetailsDialog>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Card>
        {/* </Flex> */}
        <LadderPagination
          page={page}
          onPageChange={handlePageChange}
          size="compact"
          className="pt-1 pb-10"
          navClassName="flex justify-end"
        />
      </Container>
    </div>
  );
  async function FilteredLadderData(selectedClasses: string[], bracket: string) {
    setLoading(true);
    const DragonblightClient = new Dragonblight.PvpLeaderboardClient();
    setLadderData([]);
    setLadderData(await DragonblightClient.getLadderFiltered(page * 50, 50, region, selectedClasses, bracket));
    setLoading(false);
  }
  //setting bracket we want to show on rankings page
  async function LadderData() {
    const DragonblightClient = new Dragonblight.PvpLeaderboardClient();
    setLadderData([]);
    //one endpoint serves every ladder: arena, RBG, each Shuffle and Blitz spec, and the combined lists
    setLadderData(await DragonblightClient.getLadders(page * 50, 50, region, bracket));

    setLoading(false);
  }

  async function GetSyncStatus() {
    const DragonblightClient = new Dragonblight.PvpLeaderboardClient();
    setSyncStatus(await DragonblightClient.getSyncStatus(region, bracket));
  }

}

export default Rankings;
