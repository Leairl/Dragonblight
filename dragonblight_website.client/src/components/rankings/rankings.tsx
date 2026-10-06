import { useEffect, useState } from "react";
import * as Avatar from "@radix-ui/react-avatar";
import * as Dialog from "@radix-ui/react-dialog";
import { useNavigate } from "react-router"
import "@preline/select"; // Import Preline JavaScript
import {
  Card,
  Table,
  Flex,
  Container,
  Button,
  DataList,
  SegmentedControl,
  Skeleton,
  Progress,
  Tooltip,
} from "@radix-ui/themes";
import { Dragonblight } from "../../clients/Dragonblight";
import "./rankings.css";
import { ClassColor } from "../../helpers/classColorHelper";
import { useParams } from "react-router";
import { Pagination } from "react-headless-pagination";
import ClassFilter from "../class-filter/class-filter";
import Cutoffs from "../cutoffs/cutoffs";
import { brackets} from "../../helpers/game-flavor";
import ShuffleSpecFilter from "../shuffle-spec-filter/shuffle-spec-filter";
import { shuffleSpecs, defaultShuffleSpec, isShuffleBracket, shuffleSpecIcon } from "../../helpers/shuffle-specs";
import BlitzSpecFilter from "../blitz-spec-filter/blitz-spec-filter";
import { blitzSpecs, defaultBlitzSpec, isBlitzBracket, blitzSpecIcon } from "../../helpers/blitz-specs";

const Skeletons = [0, 1, 2];

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
  const [syncStatus, setSyncStatus] = useState<number>(0);
  //getting values that are changeable
  useEffect(() => {
    setLoading(true);
    //a class filter left over from another bracket does not apply to a Shuffle or Blitz ladder
    if (selectedClasses.includes("All Classes") || isShuffleBracket(bracket) || isBlitzBracket(bracket)) {
      LadderData();
    }
    else {
      FilteredLadderData(selectedClasses, bracket);
    }
    //the sync runs every two hours and a bracket can start at any moment, so the bar is refreshed for
    //as long as this bracket is on screen rather than only while it was last seen below 100%
    setSyncStatus(0);
    GetSyncStatus();
    const interval = setInterval(() => {
      GetSyncStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [bracket, region, page, selectedClasses]);
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
      <div className="toolbar py-3">
          <div className="toolbar-left">

          {/* a Shuffle or Blitz ladder is a single spec, so there are no classes to filter */}
          {isShuffleBracket(bracket) ? (
            <ShuffleSpecFilter selected={bracket} onSelect={BracketClick}></ShuffleSpecFilter>
          ) : isBlitzBracket(bracket) ? (
            <BlitzSpecFilter selected={bracket} onSelect={BracketClick}></BlitzSpecFilter>
          ) : (
            <ClassFilter onSelect={(sc) => setSelectedClasses(sc)}></ClassFilter>
          )}
          </div>
          <div className={loading ? "div-disabled" : ""}>
            <SegmentedControl.Root
              className=" w-[300px] grow-0"
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
          <div className={loading ? "div-disabled" : ""}>
            <SegmentedControl.Root
              className="w-[100px] grow-0"
              defaultValue={URLregion ?? "us"}
            >
              <SegmentedControl.Item
                onClick={() => {
                  RegionClick("us");
                }}
                value="us"
              >
                US
              </SegmentedControl.Item>
              <SegmentedControl.Item
                onClick={() => {
                  RegionClick("eu");
                }}
                value="eu"
              >
                EU
              </SegmentedControl.Item>
            </SegmentedControl.Root>
          </div>
        </div>
      </div>
      <div>
          <Pagination
          currentPage={page}
          totalPages={100}
          edgePageCount={1}
          middlePagesSiblingCount={1}
          setCurrentPage={handlePageChange}
          className=" pb-3"
          truncableText="&nbsp;...&nbsp;"
          truncableClassName=""
          
        >
          <nav className="flex justify-end grow-0">
          <span className="font-bold flex float-left grow text-sm items-center">
          Showing {page * 50 + 1} - {(page + 1) * 50} Characters
      </span>
            <ul className="flex items-center">
              <Pagination.PrevButton className="bg-[#292c31] mx-1 h-[28px] w-[28px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-xs first:rounded-s-lg last:rounded-e-lg border border-gray-200 text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none dark:border-neutral-700 dark:text-white dark:hover:bg-white/10 ">
                <svg
                  className="shrink-0 size-3.5"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 18-6-6 6-6"></path>
                </svg>
              </Pagination.PrevButton>
              <Pagination.PageButton
                inactiveClassName="bg-transparent h-[28px] w-[28px] flex justify-center items-center text-center first:rounded-s-md last:rounded-e-md text-gray-800 hover:bg-gray-100 py-3 px-4 text-xs focus:outline-hidden focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none dark:border-neutral-700 dark:text-white dark:hover:bg-white/10 dark:focus:bg-white/10"
                activeClassName="h-[28px] w-[28px] flex justify-center items-center text-center bg-gray-200 first:rounded-s-md last:rounded-e-md text-gray-800  py-3 px-4 text-xs focus:outline-hidden focus:bg-gray-300 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-600 dark:border-neutral-700 dark:text-white dark:focus:bg-neutral-500"
                className="mx-px"
              />

              <Pagination.NextButton className="bg-[#292c31] mx-1 h-[28px] w-[28px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-xs first:rounded-s-lg last:rounded-e-lg border border-gray-200 text-gray-800 hover:bg-gray-100  disabled:opacity-50 disabled:pointer-events-none dark:border-neutral-700 dark:text-white dark:hover:bg-white/10 ">
                <svg
                  className="shrink-0 size-3.5"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6"></path>
                </svg>
              </Pagination.NextButton>
            </ul>
          </nav>
        </Pagination>
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
                  <Table.ColumnHeaderCell className="mobileOnly">
                    Details
                  </Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {loading &&
                  Skeletons?.map((i) => {
                    return (
                      <Table.Row key={"skeleton"+i}>
                        <Table.Cell>
                          <Skeleton></Skeleton>
                        </Table.Cell>
                        <Table.Cell>
                          <Skeleton></Skeleton>
                        </Table.Cell>
                        <Table.Cell>
                          <Skeleton></Skeleton>
                        </Table.Cell>
                        <Table.Cell>
                          <Skeleton></Skeleton>
                        </Table.Cell>
                        <Table.Cell>
                          <Skeleton></Skeleton>
                        </Table.Cell>
                        <Table.Cell>
                          <Skeleton></Skeleton>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                {/* map acts as a for loop to find character data in ladder */}
                {ladderData?.map((characterEntry, i) => (
                  <Table.Row className="h-[23px] align-middle hover:bg-blue-300/30 cursor-pointer" key={"rankingsRow"+i}>
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
                                .replace(" ", "")}${
                                characterEntry.charSummary?.gender?.name ==
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

                              const shuffleSpec = shuffleSpecs.find((s) => s.slug == bracket);
                              if (shuffleSpec?.specName != "All" && shuffleSpec?.specName != null) {
                                return shuffleSpecIcon(shuffleSpec);
                              }
                              if (shuffleSpec?.specName == "All") {
                                if (characterEntry.spec == null || characterEntry.spec == "" || characterEntry.charSummary?.character_class?.name == null) {
                                  return `/unknown.png`;
                                }
                                return `/Specs/${characterEntry.spec?.toLowerCase()}_${characterEntry.charSummary?.character_class?.name?.toLowerCase()}.png`;
                              }
                              const blitzSpec = blitzSpecs.find((s) => s.slug == bracket);
                              if (blitzSpec?.specName != "All" && blitzSpec?.specName != null) {
                                return blitzSpecIcon(blitzSpec);
                              }
                              if (blitzSpec?.specName == "All") {
                                if (characterEntry.spec == null || characterEntry.spec == "" || characterEntry.charSummary?.character_class?.name == null) {
                                  return `/unknown.png`;
                                }
                                return `/Specs/${characterEntry.spec?.toLowerCase()}_${characterEntry.charSummary?.character_class?.name?.toLowerCase()}.png`;
                              }
                              if (characterEntry.charSummary?.active_spec?.name == null || characterEntry.charSummary?.active_spec?.name == "" || characterEntry.charSummary?.name == null) {
                                return `/unknown.png`;
                              }
                              return `/Specs/${characterEntry.charSummary?.active_spec?.name?.toLowerCase()}_${characterEntry.charSummary?.character_class?.name?.toLowerCase()}.png`;
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
                      {characterEntry.pvpEntry.character?.realm?.slug
                        ?.charAt(0)
                        .toUpperCase() +
                        (characterEntry.pvpEntry.character?.realm?.slug?.slice(
                          1
                        ) ?? "")}
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
                      <Dialog.Root>
                        <Dialog.Trigger asChild>
                          <Button className="z-10" variant="outline">
                            View
                          </Button>
                        </Dialog.Trigger>
                        <Dialog.Portal>
                          <Dialog.Overlay className="backdrop-blur-sm data-[state=open]:animate-overlayShow fixed inset-0" />
                          <Dialog.Content className="min-h-[400px] data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] w-[90vw] h-[70vh] translate-x-[-50%] translate-y-[-50%] rounded-[6px] shadow-[hsl(206_22%_7%/35%)_0px_10px_38px_-10px,hsl(206_22%_7%/20%)_0px_10px_20px_-15px] bg-[#292c31] focus:outline-hidden">
                            <div className=" flex justify-end">
                              <Dialog.Close asChild>
                                <button className="pt-7 text-2xl hover:opacity-50 focus:shadow-green7 inline-flex h-[35px] items-center justify-center rounded-[4px] px-[15px] font-medium leading-none">
                                  <svg
                                    width="30"
                                    height="30"
                                    viewBox="0 0 15 15"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                                      fill="currentColor"
                                      fillRule="evenodd"
                                      clipRule="evenodd"
                                    ></path>
                                  </svg>
                                </button>
                              </Dialog.Close>
                            </div>
                            <div>
                              <DataList.Root className=" text-white text-left mt-2 px-10">
                                <DataList.Item align={"center"}>
                                  <DataList.Label className=" p-2 font-bold text-white">
                                    Rank
                                  </DataList.Label>
                                  <DataList.Value className="justify-end text-left">
                                    {" "}
                                    {characterEntry.pvpEntry.rank}
                                  </DataList.Value>
                                </DataList.Item>
                                <DataList.Item>
                                  <DataList.Label className=" p-2  font-bold text-white">
                                    Rating
                                  </DataList.Label>
                                  <DataList.Value className="justify-end">
                                    {characterEntry.pvpEntry.rating}
                                  </DataList.Value>
                                </DataList.Item>
                                <DataList.Item>
                                  <DataList.Label className=" p-2  font-bold text-white">
                                    Player
                                  </DataList.Label>
                                  <DataList.Value className="justify-end">
                                    {characterEntry.pvpEntry.character?.name}
                                  </DataList.Value>
                                </DataList.Item>
                                <DataList.Item>
                                  <DataList.Label className=" p-2  font-bold text-white">
                                    Class
                                  </DataList.Label>
                                  <DataList.Value className="justify-end">
                                    <span
                                      style={{
                                        color: `${ClassColor.get(
                                          characterEntry.charSummary
                                            ?.character_class?.name ?? ""
                                        )}`,
                                      }}
                                    >
                                      {
                                        characterEntry.charSummary
                                          ?.character_class?.name
                                      }
                                    </span>
                                  </DataList.Value>
                                </DataList.Item>
                                <DataList.Item>
                                  <DataList.Label className="p-2   font-bold text-white">
                                    Faction
                                  </DataList.Label>
                                  <DataList.Value className="justify-end">
                                    {characterEntry.charSummary?.faction?.name}
                                  </DataList.Value>
                                </DataList.Item>
                                <DataList.Item>
                                  <DataList.Label className=" p-2  font-bold text-white">
                                    Server
                                  </DataList.Label>
                                  <DataList.Value className="justify-end">
                                    {characterEntry.pvpEntry.character?.realm?.slug
                                      ?.charAt(0)
                                      .toUpperCase() +
                                      (characterEntry.pvpEntry.character?.realm?.slug?.slice(
                                        1
                                      ) ?? "")}
                                  </DataList.Value>
                                </DataList.Item>
                                <DataList.Item>
                                  <DataList.Label className=" p-2  font-bold text-white">
                                    Wins
                                  </DataList.Label>
                                  <DataList.Value className=" justify-end winColor">
                                    {
                                      characterEntry.pvpEntry
                                        .season_match_statistics?.won
                                    }
                                  </DataList.Value>
                                </DataList.Item>
                                <DataList.Item>
                                  <DataList.Label
                                    width={"50vw"}
                                    className=" p-2 font-bold text-white"
                                  >
                                    Losses
                                  </DataList.Label>
                                  <DataList.Value className="justify-end lossColor">
                                    {
                                      characterEntry.pvpEntry
                                        .season_match_statistics?.lost
                                    }
                                  </DataList.Value>
                                </DataList.Item>
                              </DataList.Root>
                            </div>
                          </Dialog.Content>
                        </Dialog.Portal>
                      </Dialog.Root>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Card>
        </Flex>
        <Pagination
          currentPage={page}
          totalPages={100}
          edgePageCount={1}
          middlePagesSiblingCount={1}
          setCurrentPage={handlePageChange}
          className="pt-1 pb-10"
          truncableText="&nbsp;...&nbsp;"
          truncableClassName=""
        >
          <nav className="flex justify-end grow">
            <ul className="flex items-center">
              <Pagination.PrevButton className="bg-[#292c31] mx-1 h-[28px] w-[28px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-xs first:rounded-s-lg last:rounded-e-lg border border-gray-200 text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none dark:border-neutral-700 dark:text-white dark:hover:bg-white/10 ">
                <svg
                  className="shrink-0 size-3.5"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 18-6-6 6-6"></path>
                </svg>
              </Pagination.PrevButton>
              <Pagination.PageButton
                inactiveClassName="bg-transparent h-[28px] w-[28px] flex justify-center items-center text-center first:rounded-s-md last:rounded-e-md text-gray-800 hover:bg-gray-100 py-3 px-4 text-xs focus:outline-hidden focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none dark:border-neutral-700 dark:text-white dark:hover:bg-white/10 dark:focus:bg-white/10"
                activeClassName="h-[28px] w-[28px] flex justify-center items-center text-center bg-gray-200 first:rounded-s-md last:rounded-e-md text-gray-800  py-3 px-4 text-xs focus:outline-hidden focus:bg-gray-300 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-600 dark:border-neutral-700 dark:text-white dark:focus:bg-neutral-500"
                className="mx-px"
              />

              <Pagination.NextButton className="bg-[#292c31] mx-1 h-[28px] w-[28px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-xs first:rounded-s-lg last:rounded-e-lg border border-gray-200 text-gray-800 hover:bg-gray-100  disabled:opacity-50 disabled:pointer-events-none dark:border-neutral-700 dark:text-white dark:hover:bg-white/10 ">
                <svg
                  className="shrink-0 size-3.5"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6"></path>
                </svg>
              </Pagination.NextButton>
            </ul>
          </nav>
        </Pagination>
      </Container>
    </div>
  );
  async function FilteredLadderData(selectedClasses: string[], bracket: string) {
    setLoading(true);
    const DragonblightClient = new Dragonblight.PvpLeaderboardClient();
    setLadderData([]);
    setLadderData( await DragonblightClient.getLadderFiltered(page * 50, 50, region, selectedClasses, bracket) );
    setLoading(false);
  }
  //setting bracket we want to show on rankings page
  async function LadderData() {
    const DragonblightClient = new Dragonblight.PvpLeaderboardClient();
    setLadderData([]);
    if (bracket == "3v3") {
      setLadderData(
        await DragonblightClient.get3v3Ladder(page * 50, 50, region)
      );
    }
    const shuffleSpec = shuffleSpecs.find((s) => s.slug == bracket);
    if (shuffleSpec) {
      setLadderData(
        await shuffleSpec.fetch(DragonblightClient, page * 50, 50, region)
      );
    }
    const blitzSpec = blitzSpecs.find((s) => s.slug == bracket);
    if (blitzSpec) {
      setLadderData(
        await blitzSpec.fetch(DragonblightClient, page * 50, 50, region)
      );
    }
    if (bracket == "2v2") {
      setLadderData(
        await DragonblightClient.get2v2Ladder(page * 50, 50, region)
      );
    }
    if (bracket == "5v5") {
      setLadderData(
        await DragonblightClient.get5v5Ladder(page * 50, 50, region)
      );
    }
    if (bracket == "rbg") {
      setLadderData(
        await DragonblightClient.getRBGLadder(page * 50, 50, region)
      );
    }

    setLoading(false);
  }

  async function GetSyncStatus() {
    const DragonblightClient = new Dragonblight.PvpLeaderboardClient();
    setSyncStatus(await DragonblightClient.getSyncStatus(region, bracket));
  }
  
}

export default Rankings;
