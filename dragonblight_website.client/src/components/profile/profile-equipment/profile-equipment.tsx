import React, { FC, useEffect, useState } from "react";
import { useParams } from "react-router";
import "./profile-equipment.css";
import { Callout, Card, Flex, Heading, Skeleton } from "@radix-ui/themes";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Dragonblight } from "../../../clients/Dragonblight";
import { RandEnchant } from "../../../helpers/randomEnchantHelper";
declare const $WowheadPower: { refreshLinks: () => void };
import { generateModels } from "../../../helpers/wow-model-viewer";
import { WowModelViewer } from "../../../helpers/wow-model-viewer/types/wow_model_viewer";
import { modelingType } from "../../../helpers/wow-model-viewer";
import { ClassColor } from "../../../helpers/classColorHelper";
import TalentViewer from "../../talent-viewer/talent-viewer";
import GlyphViewer  from "../../glyph-viewer/glyph-viewer";
import RetailTalentViewer from "../../retail-talent-viewer/retail-talent-viewer";
import ProfileAlts from "../profile-alts/profile-alts";
import { realmDisplayName } from "../../../helpers/realmNameHelper";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { getFlavor, wowheadUrl } from "../../../helpers/game-flavor";
import { installTierSetSpecFilter } from "../../../helpers/wowhead-tier-set";

interface profileEquipmentProps {
  characterProfileSummary: Dragonblight.CharacterProfileSummary | undefined;
  characterEquipmentSummary: Dragonblight.CharacterEquipmentSummary | undefined;
  currTab: string | undefined;
  specName: string | undefined;
  characterAchievementsSummary:
    | Dragonblight.CharacterAchievementsSummary
    | undefined;
  showModelViewer: boolean;
  loading: boolean;
  characterNotFound: boolean;
}

const mogslots: number[] = [
  1,
  3,
  15,
  5,
  4,
  19,
  9,
  16,
  10,
  6,
  7,
  8,
  17,
];
const slots: number[] = [
  1,
  2,
  3,
  15,
  5,
  4,
  19,
  9,
  16,
  10,
  6,
  7,
  8,
  11,
  12,
  13,
  14,
  17,
];
let wow_model_viewer: WowModelViewer;
const default_icon_path: string = "/slot-icons/Ui-paperdoll-slot-";
const defaultIcons: string[] = [
  default_icon_path + "", // ammo
  default_icon_path + "head.webp",
  default_icon_path + "neck.webp",
  default_icon_path + "shoulder.webp",
  default_icon_path + "shirt.webp",
  default_icon_path + "chest.webp",
  default_icon_path + "waist.webp",
  default_icon_path + "legs.webp",
  default_icon_path + "feet.webp",
  default_icon_path + "wrists.webp",
  default_icon_path + "hands.webp",
  default_icon_path + "finger.webp",
  default_icon_path + "finger.webp",
  default_icon_path + "trinket.webp",
  default_icon_path + "trinket.webp",
  default_icon_path + "chest.webp", // this is for cloak...
  default_icon_path + "mainhand.webp",
  default_icon_path + "secondaryhand.webp",
  default_icon_path + "ranged.webp",
  default_icon_path + "tabard.webp",
];
const RankOneAchievements = [
  [15018, "r1-s1.png"],
  [418, "r1-s2.png"],
  [419, "r1-s3.png"],
  [420, "r1-s4.png"],
  [3336, "r1-s5.png"],
  [3436, "r1-s6.png"],
  [3758, "r1-s7.png"],
  [4599, "r1-s8.png"],
  [6002, "r1-s9.png"],
  [6124, "r1-s10.png"],
  [6938, "r1-s11.png"],
];
const GladiatorAchievements = [
  [886, "glad-s1.png"],
  [887, "glad-s2.png"],
  [888, "glad-s3.png"],
  [2316, "glad-s4.png"],
  [3096, "glad-s5.png"],
  [3756, "glad-s6.png"],
  [3757, "glad-s7.png"],
  [4600, "glad-s8.png"],
  [6003, "glad-s9.png"],
  [6321, "glad-s10.png"],
  [6741, "glad-s11.png"],
];

const RankOneTooltip = [
  [15018, "Achieved Infernal Gladiator"],
  [418, "Achieved Merciless Gladiator"],
  [419, "Achieved Vengeful Gladiator"],
  [420, "Achieved Brutal Gladiator"],
  [3336, "Achieved Deadly Gladiator"],
  [3436, "Achieved Furious Gladiator"],
  [3758, "Achieved Relentless Gladiator"],
  [4599, "Achieved Wrathful Gladiator"],
  [6002, "Achieved Vicious Gladiator"],
  [6124, "Achieved Ruthless Gladiator"],
  [6938, "Achieved Cataclysmic Gladiator"],
];

const GladiatorTooltip = [
  [886, "Achieved Gladiator Season 1"],
  [887, "Achieved Gladiator Season 2"],
  [888, "Achieved Gladiator Season 3"],
  [2316, "Achieved Gladiator Season 4"],
  [3096, "Achieved Gladiator Season 5"],
  [3756, "Achieved Gladiator Season 6"],
  [3757, "Achieved Gladiator Season 7"],
  [4600, "Achieved Gladiator Season 8"],
  [6003, "Achieved Gladiator Season 9"],
  [6321, "Achieved Gladiator Season 10"],
  [6741, "Achieved Gladiator Season 11"],
];

const slotName: string[] = [
  "ammo",
  "head",
  "neck",
  "shoulder",
  "shirt",
  "chest",
  "waist",
  "legs",
  "feet",
  "wrist",
  "hands",
  "finger_1",
  "finger_2",
  "trinket_1",
  "trinket_2",
  "back",
  "main_hand",
  "off_hand",
  "ranged",
  "tabard",
];
const zooms = [
  5,
  5,
  6,
  5,
  6,
  5,
  6,
  5,
  6,
  5,
  5,
  6,
  5,
  6,
  5,
  6,
  5,
  6,
  5,
  5,
  5,
  5,
  6,
  5,
  6,
  5,
  6,
  5,
  5,
  5,
  5,
  6,
  5,
  6,
  5,
  6,
];

//Wowhead's model viewer files its customization data under its own race numbering, which matches
//Blizzard's for most races - every Legion and BfA allied race included - but not for the races
//Blizzard splits into an Alliance id and a Horde id sharing one set of models. Wowhead keeps one
//file for those, so asking for the faction id fetches
//meta/charactercustomization/{race*2-1+gender}.json, gets a 404, and the viewer never starts.
//Dracthyr is further out: its drake and visage forms are separate races in the viewer's data, and
//neither is numbered 52 or 70.
//
//Each mapping below was confirmed by matching the customization option ids Blizzard reports for a
//real character of that race against the ids in the file. null means the viewer has no data for
//the race at all, and the paperdoll stands in for the model.
const VIEWER_MODEL: Record<number, { race: number; gender?: number } | null> = {
  25: { race: 24 },            // Pandaren, Alliance - the neutral Pandaren models serve all three
  26: { race: 24 },            // Pandaren, Horde
  52: { race: 45, gender: 0 }, // Dracthyr, Alliance - the drake form, one model for both genders,
  70: { race: 45, gender: 0 }, // Dracthyr, Horde      which is the form the character sheet shows
  84: { race: 98 },            // Earthen, Horde
  85: { race: 98 },            // Earthen, Alliance
  86: null,                    // Haranir, Alliance - nothing published for the race yet
  91: null,                    // Haranir, Horde - the id its numbering lands on holds another model
};

//zooms is indexed by Blizzard's race id and stops short of the newer races
const DEFAULT_ZOOM = 5;

// pulls from the current URL by using useParams
const ProfileEquipment: FC<profileEquipmentProps> = (props) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [modelLoading, setModelLoading] = useState<boolean>(true);
  window.onbeforeunload = () => setModelLoading(true);
  const { region, server, characterName } = useParams();
  //need a useeffect in the child component to change boolean
  function setAnimationAfterLoad(m: WowModelViewer, zoom: number) {
    setTimeout(() => {
      if (m.isLoaded()) {
        setTimeout(() => {
          setModelLoading(false);
        }, 300);
        m.setAnimation("DressingRoom");
        m.setDistance(zoom);
      } else {
        setAnimationAfterLoad(m, zoom);
      }
    }, 500);
  }
  function SetupModelViewer() {
    setModelLoading(true);
    //The character's own appearance choices. Blizzard reports these with the same option and choice
    //ids the model viewer uses, so they can be handed straight over; a failure here is not worth
    //losing the model for, and the viewer falls back to a generic look for the race.
    const appearance = new Dragonblight.ProfileClient()
      .getAppearance(server, characterName, region)
      .catch(() => undefined);
    //pushes equipment data into list before displaying character data
    const DisplayIdClient = new Dragonblight.DisplayIdClient();
    const equipments: number[][] = [];
    const displayInfoPromises = [];
    for (const slot of mogslots) {
      const transmogItemId =
        getTransmog(props.characterEquipmentSummary, slot) ?? 0;
      if (transmogItemId > 0) {
        //checking item id in frontend to item id in item.csv
        //pushes data in promises list to make sure all equipment data has been loaded before character display in 3d model
        displayInfoPromises.push(
          DisplayIdClient.getDisplayInfo(transmogItemId).then((displayInfo) => {
            const newSlot =
              slot == 16 || slot == 17 ? slot + 5 : displayInfo.inventoryType;
            if (displayInfo.displayId > 0 && slot != 17 && slot != 18) {
              equipments.push([newSlot, displayInfo.displayId]);
            }
          })
        );
      }
    }
    Promise.all([...displayInfoPromises, appearance]).then(([...results]) => {
      const looks = results[results.length - 1] as
        | Dragonblight.CharacterAppearanceSummary
        | undefined;
      const customizations = looks?.customizations
        ?.filter((c) => c.option?.id != undefined && c.choice?.id != undefined)
        .map((c) => ({ optionId: c.option!.id, choiceId: c.choice!.id }));
      const race = props.characterProfileSummary?.race?.id;
      const gender = props.characterProfileSummary?.gender?.type == "FEMALE" ? 1 : 0;
      const model = race != undefined ? VIEWER_MODEL[race] : undefined;
      if (model === null) {
        //a race the viewer cannot draw. Stopping here leaves the paperdoll in place instead of
        //loading whatever model that race's number happens to point at.
        setModelLoading(false);
        return;
      }
      const character = {
        race: model?.race ?? race,
        gender: model?.gender ?? gender,
        skin: 4,
        face: 0,
        hairStyle: race == 2 ? 4 : 5,
        hairColor: 5,
        facialStyle: 5,
        //the five values above are the generic fallback the viewer uses when a character's real
        //customizations are not available, which is why they are fixed numbers
        customizations: customizations != undefined && customizations.length > 0
          ? customizations
          : undefined,
        items: equipments,
        type: modelingType.CHARACTER,
      };

      //"classic" selects the MoP viewer options; anything else is retail
      generateModels(2, `#model3d`, character, getFlavor() === "retail" ? "live" : "classic")
        .then((m) => {
          wow_model_viewer = m;
          setAnimationAfterLoad(m, zooms[race ?? 1] ?? DEFAULT_ZOOM);
        })
        .catch((error) => {
          //a race the viewer has no data for would otherwise spin forever, hiding the paperdoll
          //behind a model that is never coming
          console.warn(`Model viewer unavailable for race ${race}:`, error);
          setModelLoading(false);
        });
    });
  }

  useEffect(() => {
    //no character means no model to build, and no #model3d for the viewer to draw into
    if (props.characterNotFound) {
      return;
    }
    if (props.currTab == "gear") {
      //display 3d model viewer if selected to show the model in switch
      //makes sure we dont try to destroy a model viewer thats not there
      if (wow_model_viewer != undefined) {
        wow_model_viewer.destroy();
      }
      if (props.showModelViewer) {
        SetupModelViewer();
      }
    }
  }, [props.showModelViewer, props.currTab, props.characterNotFound]);
  useEffect(() => {
    setLoading(props.loading);
  }, [props.loading]);
  //Wowhead's tooltips list a tier set's bonuses for every specialization in the class. Only the
  //one the character plays is theirs, so the rest are removed as each tooltip appears. MoP Classic
  //set bonuses are per class rather than per spec, so this only applies to retail.
  useEffect(() => {
    if (getFlavor() !== "retail") {
      return;
    }
    return installTierSetSpecFilter(() => props.characterProfileSummary?.active_spec?.id);
  }, [props.characterProfileSummary?.active_spec?.id]);
  //activates useEffect from change in region / server / charactername (when we load new character data), and
  useEffect(() => {
    if (!props.characterProfileSummary || !props.characterEquipmentSummary) {
      //prevent a crash if no data returned
      return;
    }
    //if cookie is set to false, skip this if statement
    if (props.showModelViewer) {
      SetupModelViewer();
    }
    //remove loading if not showing model viewer
    else {
      setModelLoading(false);
    }
  }, [props.characterEquipmentSummary]); // useeffect changes when props character equipment data changes, called by props in profile.tsx
  useEffect(() => {
    $WowheadPower.refreshLinks();
  });

  return (
    <div className={props.characterNotFound ? "page-container not-found" : "page-container"}>
      {/* the skeleton stays up, still and blurred, so the page keeps its shape behind the message */}
      {props.characterNotFound && (
        <div className="not-found-overlay">
          <Callout.Root color="red">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text className="text-white txt-shadow">
              {characterName}-{realmDisplayName(server)} not found
            </Callout.Text>
          </Callout.Root>
        </div>
      )}
      <div className="center-column">
          <Card className="mb-3 header-card">
            {(loading || props.characterNotFound) && (
              <div className="flex flex-row">  
                  {getSkeletonIconCards()}
                  <div className="flex flex-col m-1">
                    <Skeleton height="15px" width="250px"></Skeleton>
                    <Skeleton className='mt-1.5'height="12px" width="125px"></Skeleton>
                  </div>
              </div>
            )}
            {!loading && !props.characterNotFound && <div>{getCharacterHeader()}</div>}
          </Card>
        {!props.characterNotFound && (GetNumAchievements() ?? 0) > 0 && (
          <Card className="mb-3 achievement-row">
            <div className="flex pl-1 flex-wrap justify-center">
              {getAchievements()}
            </div>
          </Card>
        )}
        {(props.currTab == "gear" || props?.currTab == undefined) && (
        <Card className="paperdoll-card overflow-visible">
          {(loading || props.characterNotFound) && (
            <div>
              <Flex className="flex-row items-center">
                <div className="flex-1"></div>
              </Flex>
              <div className="paperdoll pt-2">
                <div className="paperdoll-column paperdoll-left">
                  {getSlotSkeleton(0, 9)}
                </div>
                <Skeleton width="0px"></Skeleton>
                <Skeleton
                  className="model3dx mx-auto mt-1"
                  width="350px"
                  height="550px"
                ></Skeleton>
                <div className="paperdoll-column paperdoll-right">
                  {" "}
                  {getSlotSkeleton(9, 19)}
                </div>
              </div>
            </div>
          )}
          {!loading && !props.characterNotFound && (
            <div>
              <div className={modelLoading ? "model3d" : "model3d invisible"}>
                <div className="grid min-h-[250px] w-full place-items-center overflow-x-scroll rounded-lg p-6 lg:overflow-visible">
                  <svg
                    className="w-16 h-16 animate-spin text-gray-900/50"
                    viewBox="0 0 64 64"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                  >
                    <path
                      d="M32 3C35.8083 3 39.5794 3.75011 43.0978 5.20749C46.6163 6.66488 49.8132 8.80101 52.5061 11.4939C55.199 14.1868 57.3351 17.3837 58.7925 20.9022C60.2499 24.4206 61 28.1917 61 32C61 35.8083 60.2499 39.5794 58.7925 43.0978C57.3351 46.6163 55.199 49.8132 52.5061 52.5061C49.8132 55.199 46.6163 57.3351 43.0978 58.7925C39.5794 60.2499 35.8083 61 32 61C28.1917 61 24.4206 60.2499 20.9022 58.7925C17.3837 57.3351 14.1868 55.199 11.4939 52.5061C8.801 49.8132 6.66487 46.6163 5.20749 43.0978C3.7501 39.5794 3 35.8083 3 32C3 28.1917 3.75011 24.4206 5.2075 20.9022C6.66489 17.3837 8.80101 14.1868 11.4939 11.4939C14.1868 8.80099 17.3838 6.66487 20.9022 5.20749C24.4206 3.7501 28.1917 3 32 3L32 3Z"
                      stroke="currentColor"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></path>
                    <path
                      d="M32 3C36.5778 3 41.0906 4.08374 45.1692 6.16256C49.2477 8.24138 52.7762 11.2562 55.466 14.9605C58.1558 18.6647 59.9304 22.9531 60.6448 27.4748C61.3591 31.9965 60.9928 36.6232 59.5759 40.9762"
                      stroke="currentColor"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        color: `${ClassColor.get(
                          props.characterProfileSummary?.character_class
                            ?.name ?? "black"
                        )}`,
                      }}
                    ></path>
                  </svg>
                </div>
              </div>
              <div
                id="model3d"
                className={
                  modelLoading || !props.showModelViewer
                    ? "invisible model3d"
                    : "model3d"
                }
              ></div>
              <div className="paperdoll pt-2">
                <div className="paperdoll-column"> {getSlotIcons(0, 9)} </div>
                <div id="model3d" className="model3dx"></div>
                <div className="paperdoll-column"> {getSlotIcons(9, 19)} </div>
              </div>
            </div>
          )}
        </Card>)}
        {props.currTab == "talents" && (
          <Card className="talent-row">
            {/* the two games draw talents nothing alike: retail has three grid trees that come
                from the API, MoP Classic a fixed 6x3 pane that ships with the client */}
            {getFlavor() === "retail" ? (
            <RetailTalentViewer
              charClass={
                props.characterProfileSummary?.character_class?.name ?? ""
              }
              region={region ?? ""}
              charName={characterName ?? ""}
              server={server ?? ""}
            ></RetailTalentViewer>
            ) : (
            <TalentViewer
              charClass={
                props.characterProfileSummary?.character_class?.name ?? ""
              }
              charClassId={props.characterProfileSummary?.character_class?.id ?? 0}
              region={region ?? ""}
              charName={characterName ?? ""}
              server={server ?? ""}
            ></TalentViewer>
            )}
          </Card>
        )}
        {props.currTab == "alts" && (
          <Card className="talent-row">
            <ProfileAlts></ProfileAlts>
          </Card>
        )}
        {props.currTab == "glyphs" && (
          <Card className="talent-row">
            <GlyphViewer
              pet={false}
              charClass={
                props.characterProfileSummary?.character_class?.name ?? ""
              }
              region={region ?? ""}
              charName={characterName ?? ""}
              server={server ?? ""}
            ></GlyphViewer>
          </Card>
        )}
      </div>
    </div>
  );
  function getSlotSkeleton(skip: number, end: number) {
    //for loop (map) with slots in parameter s to pull correct gear ids, and place them in the correct spots for our profile page.
    //pulls from slots array, and checks with each function for that piece of gear.
    return slots.slice(skip, end).map((s, i) => (
      //for example, slots.slice seperates into categories (left, right, and bottom), for left, if we pull cloak (slot_id = 15), looks into the SlotName array
      //and pulls element 15 out, allowing the user to see the unique gear id of slot_id 15.
      <div
        className={
          i + skip > 9 ? "right-itemslot-row itemSlotRow" : "itemSlotRow"
        }
        key={s}
      >
        <a
          className={
            i + skip > 8
              ? "aligned-right slot-icon-background"
              : "slot-icon-background"
          }
          style={{ backgroundImage: `url(${getBackgroundIcon(s)})` }}
        >
          <Skeleton>
            <div className="slot-icon-box">
              <img
                className="slot-icon"
                src={
                  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
                }
              />
            </div>
          </Skeleton>
        </a>
        <div className="item-details ">
          <a
            className={
              i + skip > 8 ? "align-right-name item-name" : "item-name"
            }
          >
            <Skeleton width={"200px"} height={"15px"}></Skeleton>
          </a>

          <a
            className={
              i + skip > 8
                ? "align-right-name item-enchant float-end"
                : "item-enchant"
            }
          >
            <Skeleton width={"100px"} height={"15px"}></Skeleton>
          </a>
        </div>
      </div>
    ));
  }

  function getCharacterHeader() {
    return (
      <div className="flex flex-row px[1px] ">
        <img
          className="m-1"
          src={`/ProfileClassIcons/${props.characterProfileSummary?.character_class?.name
            ?.toLowerCase()
            .replace(" ", "")}.png`}
          height="34px"
          width="34px"
          style={{ maxHeight: "34px", maxWidth: "34px" }}
        ></img>
        <img
          className="my-1"
          src={props.specName == "" || props.specName == undefined ? `/unknown.png` :`/Specs/${props.specName
            ?.toLowerCase()}_${props.characterProfileSummary?.character_class?.name
            ?.toLowerCase()}.png`  }
          height="34px"
          width="34px"
          style={{ maxHeight: "34px", maxWidth: "34px" }}
        ></img>
        <img
          className="my-1 ml-1"
          src={`/RaceIcons/${props.characterProfileSummary?.race?.name
            ?.toLowerCase()
            .replace(" ", "")}${
            props.characterProfileSummary?.gender?.name == "Female"
              ? "-f"
              : "-m"
          }.png`}
          height="34px"
          width="34px"
          style={{ maxHeight: "34px", maxWidth: "34px" }}
        ></img>
        <img
          className="m-1"
          src={`/ProfileFactions/${props.characterProfileSummary?.faction?.name}.png`}
          height="34px"
          width="34px"
          style={{ maxHeight: "34px", maxWidth: "34px" }}
        ></img>
        <div className="pl-2 flex flex-col justify-center">
          <Heading
            className="character-text"
            size="3"
            style={{
              color: `${ClassColor.get(
                props.characterProfileSummary?.character_class?.name ?? ""
              )}`,
            }}
          >
            <span className="hide-">
              {getTitledName() +
                " - " +
                getRealmName()}{" "}
            </span>
          </Heading>
          <Heading size="2" className="guild-text">
            {props.characterProfileSummary?.guild?.name
              ? "<" + props.characterProfileSummary?.guild?.name + ">"
              : ""}{" "}
          </Heading>
          
          </div>
        <div className="flex-1"></div>
      </div>
    );
  }

  function getSlotIcons(skip: number, end: number) {
    //for loop (map) with slots in parameter s to pull correct gear ids, and place them in the correct spots for our profile page.
    //pulls from slots array, and checks with each function for that piece of gear.
    return slots.slice(skip, end).map(
      (s, i) =>
        (getItem(props.characterEquipmentSummary, s) == 0 && (
          <div
            className={
              i + skip > 8 ? "right-itemslot-row itemSlotRow" : "itemSlotRow"
            }
            key={s}
          >
            <a
              className={
                i + skip > 8
                  ? "aligned-right slot-icon-background"
                  : "slot-icon-background"
              }
              style={{ backgroundImage: `url(${getBackgroundIcon(s)})` }}
            ></a>
            <div className="item-details "></div>
          </div>
        )) ||
        (getItem(props.characterEquipmentSummary, s) != 0 && (
          //for example, slots.slice seperates into categories (left, right, and bottom), for left, if we pull cloak (slot_id = 15), looks into the SlotName array
          //and pulls element 15 out, allowing the user to see the unique gear id of slot_id 15.
          <div
            className={
              i + skip > 8 ? "right-itemslot-row itemSlotRow" : "itemSlotRow"
            }
            key={s}
          >
            <a
              className={
                i + skip > 8
                  ? "aligned-right slot-icon-background"
                  : "slot-icon-background"
              }
              style={{ backgroundImage: `url(${getBackgroundIcon(s)})` }}
              href={wowheadUrl(`item=${getItem(
                props.characterEquipmentSummary,
                s
              )}`)}
              rel={itemTooltipParams(s)}
            ></a>
            <div className="item-details ">
              <a
                className={
                  i + skip > 8 ? "align-right-name item-name" : "item-name"
                }
                href={wowheadUrl(`item=${getItem(
                  props.characterEquipmentSummary,
                  s
                )}`)}
                data-wowhead={itemTooltipParams(s)}
              >
                {getItemName(s)}
              </a>
              <a
                className={
                  i + skip > 8
                    ? "align-right-name item-enchant"
                    : "item-enchant"
                }
                href={wowheadUrl(`item=${
                  getEnchant(s)?.source_item?.id
                }`)}
              >
                <div className="green_text">
                  {" "}
                  {getEnchantName(s)}{" "}
                </div>
              </a>
              {/* one icon per socket. Wowhead's script draws the gem and its tooltip from the
                  link, the same way it does for gear; an empty socket is shown as a hole, since
                  it is a stat the character is not getting. */}
              {getGemSockets(s).length > 0 && (
                <div className={i + skip > 8 ? "item-gems align-right-gems" : "item-gems"}>
                  {getGemSockets(s).map((gem, socketIndex) =>
                    gem.itemId != undefined ? (
                      <a
                        key={"gem" + s + socketIndex}
                        className="gem-icon"
                        href={wowheadUrl(`item=${gem.itemId}`)}
                        data-wowhead={`item=${gem.itemId}`}
                      ></a>
                    ) : (
                      <span
                        key={"gem" + s + socketIndex}
                        className="gem-empty"
                        title={gem.empty}
                      ></span>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        ))
    );
  }
  //check to make sure the correct item is located in the correct position when featuring profile
  function getItem(
    charSummary: Dragonblight.CharacterEquipmentSummary | undefined,
    s: number
  ) {
    if (charSummary?.equipped_items != null) {
      const equipmentItem = charSummary.equipped_items.find(
        (item) => item.slot?.type?.toLowerCase() == slotName[s]
      );
      //checking to see if a player does or does not have gear equipped.
      if (equipmentItem != undefined) {
        return equipmentItem.item?.id;
      }
    }
    return 0;
  }
  function getItemName(s: number) {
    if (props.characterEquipmentSummary?.equipped_items != null) {
      const equipmentItem = props.characterEquipmentSummary.equipped_items.find(
        (item) => item.slot?.type?.toLowerCase() == slotName[s]
      );
      //checking to see if a player does or does not have gear equipped.
      if (equipmentItem != undefined) {
        return equipmentItem.name;
      }
    }
    return 0;
  }

  //the enchant's source item name (e.g. "Enchant Boots - Lynx's Dexterity"), falling
  //back to the display string when there is no source item
  //Retail titles put the name in display_string as "{name} the Faceless One";
  //MoP Classic puts a %s placeholder in name. Handle both, and show the bare
  //name when there's no title or neither placeholder is present.
  function getTitledName(): string {
    const name = props.characterProfileSummary?.name ?? characterName ?? "";
    const title = props.characterProfileSummary?.active_title;
    if (title?.display_string?.includes("{name}")) {
      return title.display_string.replace("{name}", name);
    }
    if (title?.name?.includes("%s")) {
      return title.name.replace("%s", name);
    }
    return name;
  }

  //blizzard's realm name once the summary arrives, the slug spelled out until then
  function getRealmName(): string {
    return props.characterProfileSummary?.realm?.name ?? realmDisplayName(server);
  }

  function getEnchantName(s: number): string {
    const enchant = getEnchant(s);
    if (!enchant) return "";
    const name = enchant.source_item?.name ?? enchant.display_string ?? "";
    return stripWowMarkup(name.replace("Enchanted: ", ""));
  }

  function getEnchant(s: number): Dragonblight.Enchantment | undefined {
    if (props.characterEquipmentSummary?.equipped_items != null) {
      const equipmentItem = props.characterEquipmentSummary.equipped_items.find(
        (item) => item.slot?.type?.toLowerCase() == slotName[s]
      );
      //equipmentItem.enchantments.length > 0 in case there is an empty list (no for loop)
      if (
        equipmentItem != undefined &&
        equipmentItem.enchantments != null &&
        equipmentItem.enchantments.length > 0
      ) {
        const enchant = equipmentItem.enchantments.find(
          (e) => e.enchantment_slot?.id == 0
        );
        //checks to see if a player has an enchantment or not.
        if (enchant != undefined) {
          return enchant;
        }
      }
    }
  }

  function getRandomEnchantments(s: number) {
    if (props.characterEquipmentSummary?.equipped_items != null) {
      const equipmentItem = props.characterEquipmentSummary.equipped_items.find(
        (item) => item.slot?.type?.toLowerCase() == slotName[s]
      );
      //checking to see if a player does or does not have gear with random enchants.
      if (equipmentItem != undefined) {
        let randomEnchantment = "";
        RandEnchant.forEach((value, key) => {
          if (equipmentItem.name?.endsWith(value)) {
            randomEnchantment += key + ":";
          }
        });
        return randomEnchantment;
      }
    }
    return 0;
  }

  //What Wowhead needs to draw the item this character is actually wearing. Without the bonus ids
  //and item level it renders the item's base version instead: a crafted 331 shows as its 246 base,
  //with "Random Stat 1" in place of the stats the crafter chose. The bonus ids carry the upgrade
  //track, the crafted stats and any PvP scaling; the item level is what the character has.
  function itemTooltipParams(s: number): string {
    const item = props.characterEquipmentSummary?.equipped_items?.find(
      (i) => i.slot?.type?.toLowerCase() == slotName[s]
    );
    return (
      `item=${getItem(props.characterEquipmentSummary, s)}` +
      `&ench=${getEnchant(s)?.enchantment_id}` +
      `&gems=${getGems(s)}` +
      `&rand=${getRandomEnchantments(s)}` +
      `&pcs=${getPcs(s)}` +
      `&transmog=${getTransmog(props.characterEquipmentSummary, s, true)}` +
      `&bonus=${item?.bonus_list?.join(":") ?? ""}` +
      `&ilvl=${item?.level?.value ?? ""}`
    );
  }

  //the equipped pieces of an item's set, which is how Wowhead knows which set bonuses are active
  function getPcs(s: number): string | undefined {
    if (props.characterEquipmentSummary?.equipped_items != null) {
      const equipmentItem = props.characterEquipmentSummary.equipped_items.find(
        (item) => item.slot?.type?.toLowerCase() == slotName[s]
      );
      if (equipmentItem != undefined) {
        const pcs = equipmentItem.set?.items?.filter((i) => i.is_equipped);
        if (pcs != undefined) {
          return pcs.map((t) => t.item?.id).join(":");
        }
      }
    }
  }

  //What sits in each of an item's sockets, in socket order. Retail reports sockets directly and
  //includes the empty ones; MoP Classic has no sockets array at all and reports its gems as
  //enchantments in slots 2 to 4, where an empty socket simply does not appear.
  function getGemSockets(s: number): { itemId?: number; empty?: string }[] {
    const equipmentItem = props.characterEquipmentSummary?.equipped_items?.find(
      (item) => item.slot?.type?.toLowerCase() == slotName[s]
    );
    if (equipmentItem?.sockets != null) {
      return equipmentItem.sockets.map((socket) =>
        socket.item?.id != undefined
          ? { itemId: socket.item.id }
          : { empty: socket.socket_type?.name ?? "Empty Socket" }
      );
    }
    return (equipmentItem?.enchantments ?? [])
      .filter(
        (e) =>
          e.enchantment_slot?.id == 2 ||
          e.enchantment_slot?.id == 3 ||
          e.enchantment_slot?.id == 4
      )
      .map((e) => ({ itemId: e.source_item?.id }));
  }

  //the gem ids Wowhead needs in order to draw the item as it is socketed
  function getGems(s: number): string {
    return getGemSockets(s)
      .map((gem) => gem.itemId)
      .filter((id) => id != undefined)
      .join(":");
  }

  //check to make sure the correct transmog is shown when featuring profile
  function getTransmog(
    charSummary: Dragonblight.CharacterEquipmentSummary | undefined,
    s: number,
    tt: boolean = false
  ) {
    if (charSummary?.equipped_items != null) {
      const equipmentItem = charSummary.equipped_items.find(
        (item) => item.slot?.type?.toLowerCase() == slotName[s]
      );
      //checking to see if a player does or does not have gear equipped.
      if (equipmentItem != undefined) {
        if (equipmentItem.transmog?.item?.id != null) {
          return equipmentItem.transmog?.item?.id;
        }
        else if (equipmentItem?.item?.id != null) {
          if (tt) {
            return 0;
          }
          else {
            return equipmentItem?.item?.id;
          }
        }
      }
    }
    return 0;
  }
  function GetNumAchievements() {
    const AchievementIcons = [];
    //contains all the correct arena achievements obtained from that specific toon.
    for (let i = 0; i < RankOneAchievements.length; i++) {
      //if completed == true of that achievement id
      const RankOneAchievement = props.characterAchievementsSummary?.achievements?.find(
        (ar1) =>
          ar1.id == RankOneAchievements[i][0] && ar1.criteria?.is_completed
      );
      const GladiatorAchievement = props.characterAchievementsSummary?.achievements?.find(
        (ag) =>
          ag.id == GladiatorAchievements[i][0] && ag.criteria?.is_completed
      );
      if (RankOneAchievement) {
        AchievementIcons.push(
          getAchievementIcon(
            RankOneAchievements[i][0] as number,
            RankOneAchievements[i][1] as string
          )
        );
      } else if (GladiatorAchievement) {
        AchievementIcons.push(
          getAchievementIcon(
            GladiatorAchievements[i][0] as number,
            GladiatorAchievements[i][1] as string
          )
        );
      }
    }
    return AchievementIcons.length;
  }
  function getAchievements() {
    const AchievementIcons = [];
    //contains all the correct arena achievements obtained from that specific toon.
    for (let i = 0; i < RankOneAchievements.length; i++) {
      //if completed == true of that achievement id
      const RankOneAchievement = props.characterAchievementsSummary?.achievements?.find(
        (ar1) =>
          ar1.id == RankOneAchievements[i][0] && ar1.criteria?.is_completed
      );
      const GladiatorAchievement = props.characterAchievementsSummary?.achievements?.find(
        (ag) =>
          ag.id == GladiatorAchievements[i][0] && ag.criteria?.is_completed
      );
      //push either rankone / glad achieve icon inside our achievement icons list.
      if (RankOneAchievement) {
        AchievementIcons.push(
          getAchievementIcon(
            RankOneAchievements[i][0] as number,
            RankOneAchievements[i][1] as string
          )
        );
      } else if (GladiatorAchievement) {
        AchievementIcons.push(
          getAchievementIcon(
            GladiatorAchievements[i][0] as number,
            GladiatorAchievements[i][1] as string
          )
        );
      }
    }
    return AchievementIcons;
  }
  function getSkeleton(i: number) {
    return (
      <Skeleton key={"SkeletonRating" + i}>
        <Card className={ "w-[34px] h-[34px] m-1"}></Card>
      </Skeleton>
    );
  }
  //pushes the correct achievement icon onto the page
  function getAchievementIcon(i: number, iconfile: string) {
    let Tooltips = RankOneTooltip.find((ar1) => ar1[0] == i);
    if (Tooltips == null) {
      Tooltips = GladiatorTooltip.find((ag) => ag[0] == i);
    }
    return (
      <Tooltip.Provider delayDuration={100} key={"achievementIcon" + i}>
        <Tooltip.Root>
          <Tooltip.Portal>
            <Tooltip.Content className=" block max-w-sm p-2 rounded-lg shadow-sm dark:bg-neutral-700 dark:border-neutral-950">
              <Card className="z-100">
                {" "}
                {Tooltips != null ? Tooltips[1] : ""}
              </Card>{" "}
            </Tooltip.Content>
          </Tooltip.Portal>
          <Tooltip.Trigger className="cursor-default">
            <div className="pr-1">
              <img
                className="mr-1 my-1"
                src={`/ArenaAchievementIcons/${iconfile}`}
                height="34px"
                width="34px"
                style={{ maxHeight: "34px", maxWidth: "34px" }}
              ></img>
            </div>
          </Tooltip.Trigger>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  }

  function getSkeletonIconCards() {
    const SkeletonIconCards = [];
    for (let i = 0; i < 4; i++) {
      SkeletonIconCards.push(getSkeleton(i));
    }
    return <div className="flex flex-row">{SkeletonIconCards}</div>;
  }
};
export default ProfileEquipment;

//Blizzard strings carry in-game UI escape codes that only the game client renders:
//|A...|a atlas icons (e.g. the crafting quality star), |T...|t textures,
//|cAARRGGBB...|r colours. On the web they show up as raw text, so drop them.
function stripWowMarkup(text: string): string {
  return text
    .replace(/\|A[^|]*\|a/g, "")
    .replace(/\|T[^|]*\|t/g, "")
    .replace(/\|c[0-9a-fA-F]{8}/g, "")
    .replace(/\|r/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getBackgroundIcon(s: number) {
  return defaultIcons[s];
}
