import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Callout, Card, Flex, Heading, SegmentedControl, Skeleton, Text } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Dragonblight } from "../../clients/Dragonblight";
import { ClassColor } from "../../helpers/classColorHelper";
import { findSlotItem, getEnchant, getEnchantName, itemTooltipParams } from "../../helpers/equipmentHelper";
import { wowheadUrl } from "../../helpers/game-flavor";
import "../profile/profile.css";
import ForeverTalents from "./forever-talents";
import "../profile/profile-equipment/profile-equipment.css";
declare const $WowheadPower: { refreshLinks: () => void } | undefined;

type LoadState = "loading" | "loaded" | "notFound" | "error";

// The answer for one character, tagged with the route it was for, so a page that moves to
// another character shows "loading" until that character's answer arrives.
interface LoadResult {
  key: string;
  state: LoadState;
  page?: Dragonblight.ForeverCharacterPage;
}

// Paperdoll slots, by the slot numbers in equipmentHelper's slotName, in the order the
// retail and classic profile draws them. Forever adds the ranged slot that MoP removed.
const leftSlots: number[] = [1, 2, 3, 15, 5, 4, 19, 9, 16];
const rightSlots: number[] = [10, 6, 7, 8, 11, 12, 13, 14, 17, 18];

const slotIconPath = "/slot-icons/Ui-paperdoll-slot-";
const emptySlotIcons: Record<number, string> = {
  1: slotIconPath + "head.webp",
  2: slotIconPath + "neck.webp",
  3: slotIconPath + "shoulder.webp",
  4: slotIconPath + "shirt.webp",
  5: slotIconPath + "chest.webp",
  6: slotIconPath + "waist.webp",
  7: slotIconPath + "legs.webp",
  8: slotIconPath + "feet.webp",
  9: slotIconPath + "wrists.webp",
  10: slotIconPath + "hands.webp",
  11: slotIconPath + "finger.webp",
  12: slotIconPath + "finger.webp",
  13: slotIconPath + "trinket.webp",
  14: slotIconPath + "trinket.webp",
  15: slotIconPath + "chest.webp", // cloak has no icon of its own
  16: slotIconPath + "mainhand.webp",
  17: slotIconPath + "secondaryhand.webp",
  18: slotIconPath + "ranged.webp",
  19: slotIconPath + "tabard.webp",
};

const headerIconStyle = { maxHeight: "34px", maxWidth: "34px" };

function mainRender(page: Dragonblight.ForeverCharacterPage | undefined): string | undefined {
  const asset = page?.media?.assets?.find((a) => a.key === "main-raw");
  return asset?.value;
}

// One paperdoll slot, drawn like the retail and classic profile's: the icon on the outer
// edge, the item name beside it and its enchant in green underneath (armor kits and
// patches show up here too). Wowhead fills in the icon and colors the name.
function SlotRow(props: { slot: number; right: boolean; equipment: Dragonblight.CharacterEquipmentSummary | undefined }) {
  const item = findSlotItem(props.equipment, props.slot);
  let rowClass = "itemSlotRow";
  let iconClass = "slot-icon-background";
  let nameClass = "item-name";
  let enchantClass = "item-enchant";
  if (props.right) {
    rowClass = "right-itemslot-row itemSlotRow";
    iconClass = "aligned-right slot-icon-background";
    nameClass = "align-right-name item-name";
    enchantClass = "align-right-name item-enchant";
  }
  const background = { backgroundImage: `url(${emptySlotIcons[props.slot]})` };

  if (item === undefined) {
    return (
      <div className={rowClass}>
        <a className={iconClass} style={background}></a>
        <div className="item-details "></div>
      </div>
    );
  }
  return (
    <div className={rowClass}>
      <a className={iconClass} style={background} href={wowheadUrl(`item=${item.item?.id}`)} rel={itemTooltipParams(item)}></a>
      <div className="item-details ">
        <a className={nameClass} href={wowheadUrl(`item=${item.item?.id}`)} data-wowhead={itemTooltipParams(item)}>
          {item.name}
        </a>
        <a className={enchantClass} href={wowheadUrl(`item=${getEnchant(item)?.source_item?.id}`)}>
          <div className="green_text"> {getEnchantName(item)} </div>
        </a>
      </div>
    </div>
  );
}

// A slot while the character loads, drawn exactly as the retail and classic profile's
// getSlotSkeleton draws it: the empty-slot icon behind a skeleton frame, then placeholder
// lines for the item name and its enchant.
function SkeletonSlotRow(props: { slot: number; right: boolean }) {
  let rowClass = "itemSlotRow";
  let iconClass = "slot-icon-background";
  let nameClass = "item-name";
  let enchantClass = "item-enchant";
  if (props.right) {
    rowClass = "right-itemslot-row itemSlotRow";
    iconClass = "aligned-right slot-icon-background";
    nameClass = "align-right-name item-name";
    enchantClass = "align-right-name item-enchant float-end";
  }
  return (
    <div className={rowClass}>
      <a className={iconClass} style={{ backgroundImage: `url(${emptySlotIcons[props.slot]})` }}>
        <Skeleton>
          <div className="slot-icon-box">
            <img className="slot-icon" src={"data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="} />
          </div>
        </Skeleton>
      </a>
      <div className="item-details ">
        <a className={nameClass}>
          <Skeleton width={"200px"} height={"15px"}></Skeleton>
        </a>
        <a className={enchantClass}>
          <Skeleton className="block mt-1" width={"100px"} height={"15px"}></Skeleton>
        </a>
      </div>
    </div>
  );
}

// The header's icon placeholders, as the retail and classic profile draws them. Forever's header
// has three icons (class, race, faction) where retail has a fourth for spec.
function SkeletonIconCards() {
  return (
    <div className="flex flex-row shrink-0">
      {[0, 1, 2].map((i) => (
        <Skeleton key={"SkeletonIcon" + i}>
          <Card className={"w-[34px] h-[34px] m-1"}></Card>
        </Skeleton>
      ))}
    </div>
  );
}

// The guild's slug, e.g. "olympus-iv". Profiles cached before guilds carried their slug don't
// have it, but the guild's link always ends in it: .../data/wow/guild/olympus-iv?namespace=...
function guildSlugOf(guild: Dragonblight.GuildReference | null | undefined): string {
  // a character with no guild comes back as "guild": null, not without the field
  if (guild === undefined || guild === null) {
    return "";
  }
  if (guild.slug) {
    return guild.slug;
  }
  const href = guild.key?.href;
  if (!href) {
    return "";
  }
  const path = new URL(href).pathname;
  return decodeURIComponent(path.substring(path.lastIndexOf("/") + 1));
}

// "joe-gun" as "Joe Gun", for roster records saved before they kept the name and surname
function nameFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// A character Blizzard's API has no profile for, drawn from what the stats crawl last saw of
// them in a guild roster: the same header card the full page has, and a note where the gear
// would be. Rosters carry no gender, so the race icon is the male one.
function RosterOnlyCharacter(props: { character: Dragonblight.ForeverStatsCharacter; region: string }) {
  const c = props.character;
  let fullName = `${c.name} ${c.surname}`;
  if (c.name === "") {
    fullName = nameFromSlug(c.slug);
  }
  let factionName = "Alliance";
  if (c.faction === "HORDE") {
    factionName = "Horde";
  }
  const seenAt = new Date(c.seenAt);

  return (
    <div className="profile-page grid">
      <div className="flex-wrap flex flex-row justify-center">
        <div className="flex flex-col">
          <div className="page-container">
            <div className="center-column">
              <Card className="mb-3 header-card border-card">
                {/* one row when it fits; when it doesn't, the level block wraps under the name, on the left */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="flex-auto min-w-0">
                    <div className="flex flex-row px[1px]">
                      <img
                        className="m-1"
                        src={`/ProfileClassIcons/${c.className.toLowerCase().replace(" ", "")}.png`}
                        height="34px"
                        width="34px"
                        style={headerIconStyle}
                      ></img>
                      <img
                        className="my-1"
                        src={`/RaceIcons/${c.raceName.toLowerCase().split(" ").join("")}-m.png`}
                        onError={(e) => {
                          if (!e.currentTarget.src.endsWith("/unknown.png")) {
                            e.currentTarget.src = "/unknown.png";
                          }
                        }}
                        height="34px"
                        width="34px"
                        style={headerIconStyle}
                      ></img>
                      <img
                        className="m-1"
                        src={`/ProfileFactions/${factionName}.png`}
                        height="34px"
                        width="34px"
                        style={headerIconStyle}
                      ></img>
                      <div className="pl-2 flex flex-col justify-center min-w-0">
                        <Heading className="character-text" size="3" style={{ color: `${ClassColor.get(c.className)}` }}>
                          {fullName} - {c.rulesetName}
                        </Heading>
                        <Heading size="2" className="guild-text">
                          {c.guildName !== "" && (
                            <Link to={`/guild/${c.region}/${encodeURIComponent(c.guildSlug)}`} className="hover:underline">
                              {`<${c.guildName}>`}
                            </Link>
                          )}{" "}
                        </Heading>
                      </div>
                      <div className="flex-1"></div>
                    </div>
                  </div>
                  <Flex direction="column" align="end" className="pr-2 flex-none">
                    <Heading size="3">{c.level}</Heading>
                    <Heading size="1" color="gray" weight="regular">Level</Heading>
                  </Flex>
                </div>
              </Card>
              <Card className="border-card">
                <Callout.Root color="amber">
                  <Callout.Icon>
                    <InfoCircledIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    Blizzard's API hasn't published this character's profile yet, so their gear isn't available.
                    <div>
                    What's shown comes from their guild's roster, last seen {seenAt.toLocaleString()} ({props.region.toUpperCase()}).
                    </div>
                  </Callout.Text>
                </Callout.Root>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// A WoW: Forever character, laid out like the retail and classic profile: a header card
// with the character's icons and name, then the paperdoll with gear down both sides.
// Route: /forever/character/:region/:characterSlug/:urlTab?, where the slug is "name-surname"
// and the tab is "talents" or left out for gear, as on the retail and classic profile.
function ForeverCharacter() {
  const { region, characterSlug, urlTab } = useParams();
  const navigate = useNavigate();
  let currTab = "gear";
  if (urlTab === "talents") {
    currTab = "talents";
  }

  //the tab lives in the url, so a shared link opens on it
  function ChangeTab(tab: string) {
    let path = `/character/${region}/${characterSlug}`;
    if (tab === "talents") {
      path += "/talents";
    }
    navigate(path, { replace: true });
  }
  const requestKey = `${region}/${characterSlug}`;
  const [result, setResult] = useState<LoadResult>();

  let state: LoadState = "loading";
  let page: Dragonblight.ForeverCharacterPage | undefined = undefined;
  if (result !== undefined && result.key === requestKey) {
    state = result.state;
    page = result.page;
  }

  useEffect(() => {
    let cancelled = false;
    const client = new Dragonblight.ForeverCharacterClient();
    client
      .getCharacter(region, characterSlug)
      .then((loaded) => {
        if (cancelled) return;
        setResult({ key: requestKey, state: "loaded", page: loaded });
      })
      .catch((error) => {
        if (cancelled) return;
        if (error?.status === 404) {
          setResult({ key: requestKey, state: "notFound" });
        } else {
          console.error(error);
          setResult({ key: requestKey, state: "error" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [region, characterSlug, requestKey]);

  // Wowhead adds each item link's icon and quality colour once the link is in the page. Item names
  // are transparent until it does. Switching to Talents removes the gear links and switching back
  // puts new ones in, so this runs again whenever the tab changes, not just when the data arrives.
  useEffect(() => {
    if (currTab === "gear" && page?.equipment && typeof $WowheadPower !== "undefined") {
      $WowheadPower.refreshLinks();
    }
  }, [page, currTab]);

  if (state === "notFound" || state === "error") {
    let message = `${characterSlug} not found. Blizzard's API has no profile for this character yet. New characters appear once they're level 10 and have logged out, and some the Armory already shows take longer to reach the API. Check the spelling and region, and try again later.`;
    if (state === "error") {
      message = "Couldn't load this character: Blizzard's API didn't answer. Try again in a minute.";
    }
    return (
      <div className="w-[70vw] max-[800px]:w-[90vw]">
        <Callout.Root color="red">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text className="text-white txt-shadow">{message}</Callout.Text>
        </Callout.Root>
      </div>
    );
  }

  // Blizzard's API had no profile, but the stats crawl has seen the character in a guild roster
  const rosterCharacter = page?.rosterCharacter;
  if (state === "loaded" && !page?.profile && rosterCharacter) {
    return <RosterOnlyCharacter character={rosterCharacter} region={region ?? ""} />;
  }

  const profile = page?.profile;
  const equipment = page?.equipment ?? undefined;
  const render = mainRender(page);
  const className = profile?.character_class?.name ?? "";
  let gender = "-m";
  if (profile?.gender?.name === "Female") {
    gender = "-f";
  }
  const guildSlug = guildSlugOf(profile?.guild);
  //the Gear / Talents switch can't be used until the character has loaded
  let tabSwitchClass = "";
  if (state === "loading") {
    tabSwitchClass = "div-disabled";
  }
  let renderClass = "character-render";
  if (profile?.race?.name === "Tauren") {
    renderClass = "character-render character-render-tauren";
  }

  return (
    <div className="profile-page grid">
      {/* the Gear / Talents switch, in the same place and markup as the retail and classic profile */}
      <div className="button-row">
        <Text as="label" size="2">
          <Flex className="button-row" gap="2">
            <div className={tabSwitchClass}>
              <SegmentedControl.Root className=" w-[250px] grow-0" value={currTab} defaultValue={"gear"}>
                <SegmentedControl.Item onClick={() => ChangeTab("gear")} value="gear">
                  Gear
                </SegmentedControl.Item>
                <SegmentedControl.Item onClick={() => ChangeTab("talents")} value="talents">
                  Talents
                </SegmentedControl.Item>
              </SegmentedControl.Root>
            </div>
          </Flex>
        </Text>
      </div>
      <div className="flex-wrap flex flex-row justify-center">
        <div className="flex flex-col">
          <div className="page-container">
            <div className="center-column">
              <Card className="mb-3 header-card border-card">
                {state === "loading" && (
                  <div className="header-row flex items-center">
                    <div className="header-main flex flex-row">
                      <SkeletonIconCards />
                      <div className="flex flex-col m-1 flex-1 min-w-0">
                        <Skeleton height="15px" width="250px" maxWidth="100%"></Skeleton>
                        <Skeleton className="mt-1.5" height="12px" width="125px" maxWidth="100%"></Skeleton>
                      </div>
                    </div>
                  </div>
                )}
                {state === "loaded" && profile && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    {/* one row when it fits; when it doesn't, the level block wraps under the name, on the left */}
                    <div className="flex-auto min-w-0">
                      <div className="flex flex-row px[1px]">
                        <img
                          className="m-1"
                          src={`/ProfileClassIcons/${className.toLowerCase().replace(" ", "")}.png`}
                          height="34px"
                          width="34px"
                          style={headerIconStyle}
                        ></img>
                        <img
                          className="my-1"
                          src={`/RaceIcons/${(profile.race?.name ?? "").toLowerCase().split(" ").join("")}${gender}.png`}
                          height="34px"
                          width="34px"
                          style={headerIconStyle}
                        ></img>
                        <img
                          className="m-1"
                          src={`/ProfileFactions/${profile.faction?.name}.png`}
                          height="34px"
                          width="34px"
                          style={headerIconStyle}
                        ></img>
                        <div className="pl-2 flex flex-col justify-center min-w-0">
                          {/* the ruleset stands where retail and classic show the realm */}
                          <Heading className="character-text" size="3" style={{ color: `${ClassColor.get(className)}` }}>
                            {profile.name} {profile.surname} - {profile.ruleset?.name}
                          </Heading>
                          <Heading size="2" className="guild-text">
                            {profile.guild?.name && guildSlug !== "" && (
                              <Link to={`/guild/${region}/${encodeURIComponent(guildSlug)}`} className="hover:underline">
                                {`<${profile.guild.name}>`}
                              </Link>
                            )}{" "}
                          </Heading>
                        </div>
                        <div className="flex-1"></div>
                      </div>
                    </div>
                    {/* level, then item level, each a number over its label */}
                    <Flex gap="5" className="pr-2 flex-none">
                      <Flex direction="column" align="end">
                        <Heading size="3">{profile.level}</Heading>
                        <Heading size="1" color="gray" weight="regular">Level</Heading>
                      </Flex>
                      <Flex direction="column" align="end">
                        <Heading size="3">{profile.equipped_item_level}</Heading>
                        <Heading size="1" color="gray" weight="regular">Item level</Heading>
                      </Flex>
                    </Flex>
                  </div>
                )}
              </Card>
              {currTab === "gear" && (
                <Card className="paperdoll-card overflow-visible border-card">
                  {/* while loading, the same layout the retail and classic profile shows */}
                  {state === "loading" && (
                    <div>
                      <Flex className="flex-row items-center">
                        <div className="flex-1"></div>
                      </Flex>
                      <div className="paperdoll pt-2">
                        <div className="paperdoll-column paperdoll-left">
                          {leftSlots.map((slot) => (
                            <SkeletonSlotRow key={slot} slot={slot} right={false} />
                          ))}
                        </div>
                        <Skeleton width="0px"></Skeleton>
                        <Skeleton className="model-skeleton mx-auto mt-1" width="350px" height="500px"></Skeleton>
                        <div className="paperdoll-column paperdoll-right">
                          {rightSlots.map((slot) => (
                            <SkeletonSlotRow key={slot} slot={slot} right={true} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {state === "loaded" && (
                    <div className="paperdoll pt-2">
                      <div className="paperdoll-column">
                        {leftSlots.map((slot) => (
                          <SlotRow key={slot} slot={slot} right={false} equipment={equipment} />
                        ))}
                      </div>
                      <div className="model3dx">
                        {render && <img src={render} alt="" className={renderClass} />}
                      </div>
                      <div className="paperdoll-column">
                        {rightSlots.map((slot) => (
                          <SlotRow key={slot} slot={slot} right={true} equipment={equipment} />
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              )}
              {currTab === "talents" && (
                <Card className="talent-row border-card">
                  {state === "loading" && <Skeleton height="420px"></Skeleton>}
                  {state === "loaded" && profile && (
                    <ForeverTalents region={region ?? ""} characterSlug={characterSlug ?? ""} className={className} />
                  )}
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForeverCharacter;
