import { FC, useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import "./profile-equipment.css";
import { Button, Callout, Card, ChevronDownIcon, DropdownMenu, Flex, Heading, Skeleton } from "@radix-ui/themes";
import TapPopover from "../../tap-popover/tap-popover";
import { customAchievementTiers, numberedIcon } from "../../../helpers/achievement-icons";
import { Dragonblight } from "../../../clients/Dragonblight";
import { RandEnchant } from "../../../helpers/randomEnchantHelper";
declare const $WowheadPower: { refreshLinks: () => void };
import { generateModels } from "../../../helpers/wow-model-viewer";
import { WowModelViewer } from "../../../helpers/wow-model-viewer/types/wow_model_viewer";
import { modelingType } from "../../../helpers/wow-model-viewer";
import { ClassColor } from "../../../helpers/classColorHelper";
import TalentViewer from "../../talent-viewer/talent-viewer";
import GlyphViewer from "../../glyph-viewer/glyph-viewer";
import RetailTalentViewer from "../../retail-talent-viewer/retail-talent-viewer";
import ProfileAlts from "../profile-alts/profile-alts";
import { realmDisplayName } from "../../../helpers/realmNameHelper";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { getFlavor, wowheadUrl } from "../../../helpers/game-flavor";
import { installTierSetSpecFilter } from "../../../helpers/wowhead-tier-set";
import { findSlotItem, getEmbellishments, slotName, stripWowMarkup } from "../../../helpers/equipmentHelper";
import LoadingSpinner from "../../loading-spinner/loading-spinner";
import { useItemLevelMode } from "../../../helpers/itemLevelMode";
import { secondaryStatsAttr } from "../../../helpers/wowhead-item-stats";

interface profileEquipmentProps {
  characterProfileSummary: Dragonblight.CharacterProfileSummary | undefined;
  characterEquipmentSummary: Dragonblight.CharacterEquipmentSummary | undefined;
  currTab: string | undefined;
  specName: string | undefined;
  previousNames: Dragonblight.PreviousCharacterName[] | undefined
  characterImage: string | undefined;
  showModelViewer: boolean;
  loading: boolean;
  characterNotFound: boolean;
  rewards: Dragonblight.PvpSeasonRewardWithRank[] | [];
  // each equipped item's PvP item level, which tooltips are drawn at in PvP mode
  pvpLevels: Map<Dragonblight.EquippedItem, number>;
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
let wow_model_viewer: WowModelViewer | undefined;
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
  const buildNumber = useRef(0);
  const [tiers, setTiers] = useState<Dragonblight.TierAchievements[]>([]);
  const [ilvlMode] = useItemLevelMode();



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
    const build = ++buildNumber.current;
    setModelLoading(true);
    if (wow_model_viewer != undefined) {
      wow_model_viewer.destroy();
      wow_model_viewer = undefined;
    }
    //The character's own appearance choices. Blizzard reports these with the same option and choice
    //ids the model viewer uses, so they can be handed straight over; a failure here is not worth
    //losing the model for, and the viewer falls back to a generic look for the race.
    const appearance = new Dragonblight.ProfileClient()
      .getAppearance(server, characterName, region)
      .catch(() => undefined);
    //pushes equipment data into list before displaying character data
    const DisplayIdClient = new Dragonblight.DisplayIdClient();
    const equipments: number[][] = [];
    const allTransmog: { slot: number; itemId: number }[] = [];
    for (const slot of mogslots) {
      const transmogItemId =
        getTransmog(props.characterEquipmentSummary, slot) ?? 0;
      if (transmogItemId > 0) {
        allTransmog.push({ slot, itemId: transmogItemId });
      }
    }
    //conversion of transmog item id to display id, which is what the model viewer uses to draw the character's gear
    const displayInfos = DisplayIdClient.getDisplayInfos(allTransmog.map((t) => t.itemId)).then((infos) => {
      const byId = new Map(infos.map((info) => [info.id, info]));
      for (const { slot, itemId } of allTransmog) {
        const displayInfo = byId.get(itemId);
        if (displayInfo) {
          const newSlot = slot == 16 || slot == 17 ? slot + 5 : displayInfo?.inventoryType;
          if (displayInfo?.displayId > 0 && slot != 17 && slot != 18) {
            equipments.push([newSlot, displayInfo.displayId]);
          }
        }
      }
    })
    Promise.all([displayInfos, appearance]).then(([...results]) => {
      const looks = results[results.length - 1] as
        | Dragonblight.CharacterAppearanceSummary
        | undefined;
      const customizations = looks?.customizations
        ?.filter((c) => c.option?.id != undefined && c.choice?.id != undefined)
        .map((c) => ({ optionId: c.option!.id, choiceId: c.choice!.id }));
      const race = props.characterProfileSummary?.race?.id;
      const gender = props.characterProfileSummary?.gender?.type == "FEMALE" ? 1 : 0;
      const model = race != undefined ? VIEWER_MODEL[race] : undefined;
      if (build !== buildNumber.current) {
        return;
      }
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
          if (build !== buildNumber.current) {
            m.destroy();
            return;
          }
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
    if (props.loading) {
      return;
    }
    if (props.currTab == "gear") {
      //display 3d model viewer if selected to show the model in switch
      //makes sure we dont try to destroy a model viewer thats not there
      if (props.showModelViewer) {
        SetupModelViewer();
      }
      else if (wow_model_viewer != undefined) {
        wow_model_viewer.destroy();
        wow_model_viewer = undefined;
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
  //the character's best PvP title per season, already picked and sorted by the server
  useEffect(() => {
    if (region == null || server == null || characterName == null) {
      return;
    }
    new Dragonblight.AchievementClient()
      .getCountofAllSeasonalAchievements(server.replace(" ", "-"), characterName, region)
      .then(setTiers)
      .catch(() => setTiers([]));
  }, [region, server, characterName]);
  //every character on the site developer's account carries the developer badge
  const [isDeveloper, setIsDeveloper] = useState<boolean>(false);
  useEffect(() => {
    setIsDeveloper(false);
    if (region == null || server == null || characterName == null) {
      return;
    }
    new Dragonblight.AltClient()
      .isDeveloper(server.replace(" ", "-"), characterName, region)
      .then((result) => setIsDeveloper(result == true))
      .catch(() => setIsDeveloper(false));
  }, [region, server, characterName]);
  //only Gladiator and Rank 1 have custom icons
  const customAchievements = customAchievementTiers(tiers);

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
        <Card className={props.characterNotFound ? "mb-3 header-card" :"mb-3 header-card border-card"}>
          {(loading || props.characterNotFound) && (
            <div className="header-row flex items-center">
              <div className="header-main flex flex-row">
                {getSkeletonIconCards()}
                <div className="flex flex-col m-1 flex-1 min-w-0">
                  <Skeleton height="15px" width="250px" maxWidth="100%"></Skeleton>
                  <Skeleton className='mt-1.5' height="12px" width="125px" maxWidth="100%"></Skeleton>
                </div>
              </div>
            </div>
          )}
          {!loading && !props.characterNotFound && (
            <div className="header-row flex items-center">
              <div className="header-main"> {getCharacterHeader()} </div>
              {customAchievements.length > 0 && (
                <div className="header-achievements pl-4 flex items-center pr-1">
                  {customAchievements.map(getAchievementIcon)}
                </div>
              )}
              {isDeveloper && <div className="header-developer ml-auto flex items-center pr-1">{getDeveloperBadge()}</div>}
            </div>
          )}
        </Card>
        {
          (props.currTab == "gear" || props?.currTab == undefined) && (
            <Card className= {props.characterNotFound ? "paperdoll-card overflow-visible": "paperdoll-card overflow-visible border-card"}>
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
                      className="model-skeleton mx-auto mt-1"
                      width="350px"
                      height="500px"
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
                    <LoadingSpinner charClass={props.characterProfileSummary?.character_class?.name} />
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
                    <div id="model3d" className="model3dx">
                      {!props.showModelViewer && props.characterImage && (
                        <img src={props.characterImage} alt="" className={characterRenderClass()} />
                      )}
                    </div>
                    <div className="paperdoll-column"> {getSlotIcons(9, 19)} </div>
                  </div>
                </div>
              )}
            </Card>)
        }
        {
          props.currTab == "talents" && (
            <Card className="talent-row border-card">
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
          )
        }
        {
          props.currTab == "alts" && (
            <Card className="talent-row border-card">
              <ProfileAlts rewards={props.rewards}></ProfileAlts>
            </Card>
          )
        }
        {
          props.currTab == "glyphs" && (
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
          )
        }
      </div >
    </div >
  );
  //Tauren have the largest models, which run off the card at the size other races are drawn
  function characterRenderClass(): string {
    const race = props.characterProfileSummary?.race?.name;
    if (race === "Tauren" || race === "Highmountain Tauren") {
      return "character-render character-render-tauren";
    }
    return "character-render";
  }

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
            <Skeleton className="block mt-1" width={"100px"} height={"15px"}></Skeleton>
          </a>
        </div>
      </div>
    ));
  }

  function getCharacterHeader() {
    return (
      <div className="flex flex-row px[1px]">
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
          src={props.specName == "" || props.specName == undefined ? `/unknown.png` : `/Specs/${props.specName
            ?.toLowerCase()}_${props.characterProfileSummary?.character_class?.name
              ?.toLowerCase()}.png`}
          height="34px"
          width="34px"
          style={{ maxHeight: "34px", maxWidth: "34px" }}
        ></img>
        <img
          className="my-1 ml-1"
          src={`/RaceIcons/${props.characterProfileSummary?.race?.name
            ?.toLowerCase()
            .replace(" ", "")}${props.characterProfileSummary?.gender?.name == "Female"
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
        <div className="pl-2 flex flex-col justify-center min-w-0">
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
            {props.previousNames && props.previousNames.length > 0 && (
              <DropdownMenu.Root modal={false}>
                <DropdownMenu.Trigger>
                  <Button variant="ghost" size="1" color="gray" className="former-names-trigger">
                    <ChevronDownIcon className="former-names-chevron" />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content size="1">
                  <DropdownMenu.Label>Previously known as</DropdownMenu.Label>
                  {props.previousNames.map((p) => (
                    <DropdownMenu.Item key={p.name + p.realm}>
                      {p.realm === props.characterProfileSummary?.realm?.slug
                        ? p.name
                        : p.name + " - " + realmDisplayName(p.realm)}
                      <span className="former-name-date">
                        {new Date(p.changed_at).toLocaleDateString()}
                      </span>
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            )}
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
              key={`icon-${ilvlMode}`}
              href={wowheadUrl(`item=${getItem(
                props.characterEquipmentSummary,
                s
              )}`)}
              rel={itemTooltipParams(s)}
              data-db-stats={secondaryStatsAttr(findSlotItem(props.characterEquipmentSummary, s))}
            ></a>
            <div className="item-details ">
              <a
                key={`name-${ilvlMode}`}
                className={
                  i + skip > 8 ? "align-right-name item-name" : "item-name"
                }
                href={wowheadUrl(`item=${getItem(
                  props.characterEquipmentSummary,
                  s
                )}`)}
                data-wowhead={itemTooltipParams(s)}
                data-db-stats={secondaryStatsAttr(findSlotItem(props.characterEquipmentSummary, s))}
              >
                {getItemName(s)}
              </a>
              <a
                className={
                  i + skip > 8
                    ? "align-right-name item-enchant"
                    : "item-enchant"
                }
                href={wowheadUrl(`item=${getEnchant(s)?.source_item?.id
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
              {/* Gems and embellishments share the third line, gems nearest the icon. Each item gets
                  at most three lines - name, enchant, this one - which is what fits beside its
                  icon; a fourth made the row taller than the icon and pushed the rows below it
                  out of line. */}
              {(getGemSockets(s).length > 0 || getEmbellishments(findSlotItem(props.characterEquipmentSummary, s)).length > 0) && (
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
                  {getEmbellishments(findSlotItem(props.characterEquipmentSummary, s)).map((e) => (
                    <a
                      key={"emb" + s + e.spellId}
                      className="item-embellish"
                      href={wowheadUrl(`spell=${e.spellId}`)}
                      data-wh-rename-link="false"
                    >
                      {e.name}
                    </a>
                  ))}
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
      `&ilvl=${shownLevel(s) ?? ""}`
    );
  }

  // the item level a slot's tooltip is drawn at: its PvP item level in PvP mode, its own otherwise.
  // MoP Classic reports no item level per item, so there this is undefined and Wowhead draws the
  // item at its base level, as it always has.
  function shownLevel(s: number): number | undefined {
    const item = findSlotItem(props.characterEquipmentSummary, s);
    if (item == undefined) { return undefined; }
    return ilvlMode === "pvp" ? props.pvpLevels.get(item) ?? item.level?.value : item.level?.value;
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

  function getSkeleton(i: number) {
    return (
      <Skeleton key={"SkeletonRating" + i}>
        <Card className={"w-[34px] h-[34px] m-1"}></Card>
      </Skeleton>
    );
  }
  //pushes the correct achievement icon onto the page; it opens on hover, or on tap on a phone
  function getAchievementIcon(a: Dragonblight.TierAchievements) {
    return (
      <TapPopover
        key={"achievementIcon" + a.tier}
        side="top"
        triggerClassName="cursor-default"
        contentClassName="max-h-64 overflow-y-auto"
        trigger={
          <div className="pr-1">
            <img
              className="mr-1 my-1"
              src={numberedIcon(a)}
              onError={(e) => {
                //no image for this season yet - hide it instead of showing a broken icon
                e.currentTarget.closest("button")!.style.display = "none";
              }}
              height="34px"
              width="34px"
              style={{ maxHeight: "34px", maxWidth: "34px" }}
            ></img>
          </div>
        }
      >
        {a.achievements?.map((x) => (
          <div key={x.id}>{x.name}</div>
        ))}
      </TapPopover>
    );
  }

  function getDeveloperBadge() {
    return (
      <TapPopover
        side="top"
        triggerClassName="cursor-default"
        trigger={
          <img
            className="my-1"
            src="/Badges/developer.png"
            alt="Developer of Dragonblight"
            height="34px"
            width="34px"
            style={{ maxHeight: "34px", maxWidth: "34px" }}
          ></img>
        }
      >
        Developer of Dragonblight
      </TapPopover>
    );
  }

  function getSkeletonIconCards() {
    const SkeletonIconCards = [];
    for (let i = 0; i < 4; i++) {
      SkeletonIconCards.push(getSkeleton(i));
    }
    return <div className="flex flex-row shrink-0">{SkeletonIconCards}</div>;
  }
};
export default ProfileEquipment;

function getBackgroundIcon(s: number) {
  return defaultIcons[s];
}
