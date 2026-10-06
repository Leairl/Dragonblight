import React, {
  FC,
  ForwardedRef,
  ReactElement,
  useEffect,
  useState,
} from "react";
import { Dragonblight } from "../../../clients/Dragonblight";
import { useParams } from "react-router";
import {
  Card,
  ChevronDownIcon,
  DataList,
  Heading,
  Skeleton,
  Tooltip,
} from "@radix-ui/themes";
import * as Accordion from "@radix-ui/react-accordion";
import "../profile.css";
import "./profile-stats.css";
import classNames from "classnames";
import { getFlavor } from "../../../helpers/game-flavor";

//allows subset calls of profile from profile.tsx
interface ProfileStatsProps {
  characterProfileSummary: Dragonblight.CharacterProfileSummary | undefined;
  characterEquipmentSummary: Dragonblight.CharacterEquipmentSummary | undefined;
  loading: boolean;
  characterNotFound?: boolean;
}

const ProfileStats: FC<ProfileStatsProps> = (props) => {
  const [characterStats, setcharacterStats] = useState<
    Dragonblight.CharacterStatisticsSummary
  >();
  const [loading, setLoading] = useState<boolean>(true);

  // The two games have different stats, not just different numbers: retail dropped Spirit, Hit,
  // Expertise, Resilience and reforging, and applies one crit and one haste to everything rather
  // than separate melee, ranged and spell values.
  const retail = getFlavor() === "retail";

  const { region, server, characterName } = useParams();
  const CardStyles: string[] = [
    "mb-4 mt-0 w-90 h-36",
    "mb-4 mt-0 w-90 h-36",
    "mb-4 mt-0 w-90 h-36",
    "mb-4 mt-0 w-90 h-10",
    "mb-4 mt-0 w-90 h-10",
    "mb-4 mt-0 w-90 h-10",
  ];
  const AccordionTrigger = React.forwardRef<
    HTMLButtonElement,
    Accordion.AccordionTriggerProps
  >(
    (
      { children, className, ...props },
      forwardedRef: ForwardedRef<HTMLButtonElement>
    ) => (
      <Accordion.Header className="flex ">
        <Accordion.Trigger
          className={classNames(
            "shadow-mauve6 hover:bg-mauve2 group flex h-[45px] flex-1 cursor-default items-center justify-between text-[15px] leading-none outline-hidden",
            className
          )}
          {...props}
          ref={forwardedRef}
        >
          {children}
          <ChevronDownIcon
            className="text-violet10 ease-[cubic-bezier(0.87,0,0.13,1)] transition-transform duration-300 group-data-[state=open]:rotate-180"
            aria-hidden
          />
        </Accordion.Trigger>
      </Accordion.Header>
    )
  );
  useEffect(() => {
    setLoading(props.loading);
  }, [props.loading]); //connected to props from parent profile.tsx
  useEffect(() => {
    setLoading(true);
    const CharacterStatsClient = new Dragonblight.StatClient(); //talking to controller
    const slug = server?.replace(" ", "-");
    CharacterStatsClient.getCharacterStats(slug, characterName, region).then(
      //saves data from get controller
      (data) => {
        setcharacterStats(data); //updates characterRatings data
        setLoading(false);
      }
    );
  }, [region, server, characterName]);
  return (
    <div className={props.characterNotFound ? "not-found" : ""}>
      <div>{(loading || props.characterNotFound) && getSkeletonStatCards()}</div>
      <div>{!loading && getStats()}</div>
    </div>
  );
  function getSkeleton(i: number) {
    return (
      <Skeleton className={CardStyles[i]} key={"SkeletonRating" + i}>
        <Card></Card>
      </Skeleton>
    );
  }
  function getSkeletonStatCards() {
    const SkeletonCards = [];
    for (let i = 0; i < 6; i++) {
      SkeletonCards.push(getSkeleton(i));
    }
    return <div className="flex flex-col profile-stats">{SkeletonCards}</div>;
  }

  // MoP Classic hides stats behind reforging, which the Blizzard API does not report, so the
  // affected values are flagged. Retail has no reforging, so there is nothing to warn about.
  function reforgeWarning(): ReactElement | null {
    if (retail) { return null; }
    return (
      <Tooltip
        className="background-warning-color"
        content="This stat may be incorrect. The stat or reforging data is not available from the Blizzard API."
      >
        <span className="text-white pl-1">⚠️</span>
      </Tooltip>
    );
  }
  function getGeneralCard(): ReactElement {
    //connects specific bracket data into card, set to type ReactElement with tsx code inside return
    return (
      <div key={"GetStatsGeneral"}>
        <Card>
          <Heading mb="2" size="2">
            {" "}
            General{" "}
          </Heading>
          <DataList.Root size="1">
            <DataList.Item>
              <DataList.Label minWidth="90px"> Health </DataList.Label>
              <DataList.Value className="">
                {" "}
                {((characterStats?.health ?? 0) / 1000).toFixed(0) + "K"}
              </DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label minWidth="90px"> Item Level </DataList.Label>
              <DataList.Value className="">
                {" "}
                {props.characterProfileSummary?.average_item_level}
              </DataList.Value>
            </DataList.Item>
          </DataList.Root>
        </Card>
      </div>
    );
  }
  function getAttributesCard(): ReactElement {
    //connects specific bracket data into card, set to type ReactElement with tsx code inside return
    return (
      <div className="pt-3" key={"GetStatsAttributes"}>
        <Card>
          <Heading mb="2" size="2">
            {" "}
            Attributes{" "}
          </Heading>
          <DataList.Root size="1">
            <DataList.Item>
              <DataList.Label minWidth="90px"> Strength </DataList.Label>
              <DataList.Value
                className={
                  (characterStats?.strength?.effective ?? 0) >
                  (characterStats?.strength?.base ?? 0)
                    ? "green_text "
                    : ""
                }
              >
                {" "}
                {characterStats?.strength?.effective}{" "}
              </DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label minWidth="90px"> Agility </DataList.Label>
              <DataList.Value
                className={
                  (characterStats?.agility?.effective ?? 0) >
                  (characterStats?.agility?.base ?? 0)
                    ? "green_text "
                    : ""
                }
              >
                {" "}
                {characterStats?.agility?.effective}{" "}
              </DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label minWidth="90px"> Stamina </DataList.Label>
              <DataList.Value
                className={
                  (characterStats?.stamina?.effective ?? 0) >
                  (characterStats?.stamina?.base ?? 0)
                    ? "green_text "
                    : " "
                }
              >
                {" "}
                {characterStats?.stamina?.effective}{" "}
              </DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label minWidth="90px"> Intellect </DataList.Label>
              <DataList.Value
                className={
                  (characterStats?.intellect?.effective ?? 0) >
                  (characterStats?.intellect?.base ?? 0)
                    ? "green_text "
                    : ""
                }
              >
                {" "}
                {characterStats?.intellect?.effective}{" "}
              </DataList.Value>
            </DataList.Item>
            {/* retail has no Spirit, and shows Mastery with the other secondaries instead */}
            {!retail && (<DataList.Item>
              <DataList.Label minWidth="90px">
                Spirit {reforgeWarning()}
              </DataList.Label>
              <DataList.Value
                className={
                  (characterStats?.spirit?.effective ?? 0) >
                  (characterStats?.spirit?.base ?? 0) ? "green_text ": ""}>
                {characterStats?.spirit?.effective}{" "}
              </DataList.Value>
            </DataList.Item>)}
            {!retail && (<DataList.Item>
              <DataList.Label minWidth="90px">
                Mastery {reforgeWarning()}
                </DataList.Label>
              <DataList.Value
                className={
                  (characterStats?.mastery?.rating_bonus ?? 0) > 0
                    ? "green_text "
                    : ""
                }
              > {(characterStats?.mastery?.value ?? 0).toFixed(2)} </DataList.Value>
              
            </DataList.Item>)}
          </DataList.Root>
        </Card>
      </div>
    );
  }
  // Retail's secondaries apply to everything the character does, so they belong together in one
  // card rather than repeated under Melee, Ranged and Spell - the API returns the same crit and
  // the same haste for all three.
  function getSecondaryCard(): ReactElement {
    return (
      <div className="pt-3" key={"GetStatsSecondary"}>
        <Card>
          <Heading mb="2" size="2">
            {" "}
            Secondary{" "}
          </Heading>
          <DataList.Root size="1">
            <DataList.Item>
              <DataList.Label minWidth="90px"> Critical Strike </DataList.Label>
              <DataList.Value className="">
                {(characterStats?.melee_crit?.value ?? 0).toFixed(2) + "%"}
              </DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label minWidth="90px"> Haste </DataList.Label>
              <DataList.Value className="">
                {(characterStats?.melee_haste?.value ?? 0).toFixed(2) + "%"}
              </DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label minWidth="90px"> Mastery </DataList.Label>
              <DataList.Value
                className={
                  (characterStats?.mastery?.rating_bonus ?? 0) > 0 ? "green_text " : ""
                }
              >
                {(characterStats?.mastery?.value ?? 0).toFixed(2) + "%"}
              </DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label minWidth="90px"> Versatility </DataList.Label>
              <DataList.Value className="">
                {(characterStats?.versatility_damage_done_bonus ?? 0).toFixed(2) + "%"}
              </DataList.Value>
            </DataList.Item>
          </DataList.Root>
        </Card>
      </div>
    );
  }
  function getMeleeCard(): ReactElement {
    //connects specific bracket data into card, set to type ReactElement with tsx code inside return
    return (
      <div className="pt-3" key={"GetStatsMelee"}>
        <Card className="dropdown-accordionCard">
          <Accordion.AccordionItem value="MeleeCard">
            <AccordionTrigger>
              <Heading size="2">Melee</Heading>
            </AccordionTrigger>
            <Accordion.AccordionContent className="AccordionContent">
              <DataList.Root size="1">
                <DataList.Item>
                  <DataList.Label minWidth="90px"> Damage </DataList.Label>
                  <DataList.Value className="">
                    {" "}
                    {Math.round(
                      characterStats?.main_hand_damage_min ?? 0
                    )} - {Math.round(characterStats?.main_hand_damage_max ?? 0)}{" "}
                  </DataList.Value>
                </DataList.Item>
                <DataList.Item>
                  <DataList.Label minWidth="90px"> DPS </DataList.Label>
                  <DataList.Value className="">
                    {" "}
                    {(characterStats?.main_hand_dps ?? 0).toFixed(1)}{" "}
                  </DataList.Value>
                </DataList.Item>
                <DataList.Item>
                  <DataList.Label minWidth="90px">
                    {" "}
                    Attack Power{" "}
                  </DataList.Label>
                  <DataList.Value className="">
                    {" "}
                    {characterStats?.attack_power ?? 0}{" "}
                  </DataList.Value>
                </DataList.Item>
                {/* retail keeps haste and crit in the Secondary card, and has no hit or
                    expertise at all */}
                {!retail && (<>
                <DataList.Item>
                  <DataList.Label minWidth="90px">
                    {" "}
                    Haste {reforgeWarning()}
                  </DataList.Label>
                  <DataList.Value className="">
                    {(characterStats?.melee_haste?.value ?? 0).toFixed(2) + "%"}
                  </DataList.Value>
                </DataList.Item>
                <DataList.Item>
                  <DataList.Label minWidth="90px">
                    {" "}
                    Hit Chance {reforgeWarning()}
                  </DataList.Label>
                  <DataList.Value className=""> {(HitRating() / 120.109).toFixed(2) + "%"}</DataList.Value>
                </DataList.Item>
                <DataList.Item>
                  <DataList.Label minWidth="90px">
                    {" "}
                    Crit Chance {reforgeWarning()}
                  </DataList.Label>
                  <DataList.Value className="">
                    {" "}
                    {(characterStats?.melee_crit?.value ?? 0).toFixed(2) + "%"}
                  </DataList.Value>
                </DataList.Item>
                <DataList.Item>
                  <DataList.Label minWidth="90px">
                    {" "}
                    Expertise {reforgeWarning()}
                  </DataList.Label>
                  <DataList.Value className="">{(ExpertiseRating()/30.0272).toFixed(2) + "%"}</DataList.Value>
                </DataList.Item>
                </>)}
              </DataList.Root>
            </Accordion.AccordionContent>
          </Accordion.AccordionItem>
        </Card>
      </div>
    );
  }
  function getRangedCard(): ReactElement {
    //connects specific bracket data into card, set to type ReactElement with tsx code inside return
    return (
      <div className="pt-3" key={"GetStatsRanged"}>
        <Card className="dropdown-accordionCard">
          <Accordion.AccordionItem value="RangedCard">
            <AccordionTrigger>
              <Heading size="2">Ranged</Heading>
            </AccordionTrigger>
            <Accordion.AccordionContent className="AccordionContent">
              <DataList.Root size="1">
                <DataList.Item>
                  <DataList.Label minWidth="90px">
                    {" "}
                    Damage {reforgeWarning()}{" "}
                  </DataList.Label>
                  <DataList.Value className=""> {(getRangedDamage())}</DataList.Value>
                </DataList.Item>
                <DataList.Item>
                  <DataList.Label minWidth="90px">
                    {" "}
                    DPS {reforgeWarning()}{" "}
                  </DataList.Label>
                  <DataList.Value className=""> {getRangedDPS()} </DataList.Value>
                </DataList.Item>
                <DataList.Item>
                  <DataList.Label minWidth="90px">
                    {" "}
                    Attack Power {reforgeWarning()}{" "}
                  </DataList.Label>
                  <DataList.Value className=""> {getRangedAttackPower()} </DataList.Value>
                </DataList.Item>
                <DataList.Item>
                  <DataList.Label minWidth="90px">
                    {" "}
                    Haste {reforgeWarning()}
                  </DataList.Label>
                  <DataList.Value className="">
                    {(characterStats?.ranged_haste?.value ?? 0).toFixed(2) +
                      "%"}
                  </DataList.Value>
                </DataList.Item>
                <DataList.Item>
                  <DataList.Label minWidth="90px">
                    {" "}
                    Hit Chance {reforgeWarning()}
                  </DataList.Label>
                  <DataList.Value className=""> {(HitRating() / 120.109).toFixed(2) + "%"}</DataList.Value>
                </DataList.Item>
                <DataList.Item>
                  <DataList.Label minWidth="90px">
                    {" "}
                    Crit Chance {reforgeWarning()}
                  </DataList.Label>
                  <DataList.Value className="">
                    {" "}
                    {(characterStats?.ranged_crit?.value ?? 0).toFixed(2) + "%"}
                  </DataList.Value>
                </DataList.Item> 
              </DataList.Root>
            </Accordion.AccordionContent>
          </Accordion.AccordionItem>
        </Card>
      </div>
    );
  }
  function getSpellCard(): ReactElement {
    //connects specific bracket data into card, set to type ReactElement with tsx code inside return
    return (
      <div className="pt-3" key={"GetStatsSpell"}>
        <Card className="dropdown-accordionCard">
          <Accordion.AccordionItem value="SpellCard">
            <AccordionTrigger>
              <Heading size="2">Spell</Heading>
            </AccordionTrigger>
            <Accordion.AccordionContent className="AccordionContent">
              <DataList.Root size="1">
                <DataList.Item>
                  <DataList.Label minWidth="90px"> Spell Power </DataList.Label>
                  <DataList.Value className="">
                    {" "}
                    {characterStats?.spell_power}{" "}
                  </DataList.Value>
                </DataList.Item>
                {/* retail shows haste in the Secondary card, and has no spell hit or
                    spell penetration */}
                {!retail && (<>
                <DataList.Item>
                  <DataList.Label minWidth="90px">
                    {" "}
                    Haste {reforgeWarning()}{" "}
                  </DataList.Label>
                  <DataList.Value className="">
                    {(characterStats?.spell_haste?.value ?? 0).toFixed(2) + "%"}
                  </DataList.Value>{" "}
                </DataList.Item>
                <DataList.Item>
                  <DataList.Label minWidth="90px">
                    {" "}
                    Hit Chance {reforgeWarning()}
                  </DataList.Label>
                  <DataList.Value className=""> {(HitRating() / 102.446).toFixed(2) + "%"}</DataList.Value>
                </DataList.Item>
                <DataList.Item>
                  <DataList.Label minWidth="90px">
                    {" "}
                    Spell Penetration{" "}
                  </DataList.Label>
                  <DataList.Value className="">
                    {characterStats?.spell_penetration}
                  </DataList.Value>
                </DataList.Item>
                </>)}
                <DataList.Item>
                  <DataList.Label minWidth="90px"> Mana Regen </DataList.Label>
                  <DataList.Value className="">{characterStats?.mana_regen}</DataList.Value>
                </DataList.Item>
                <DataList.Item>
                  <DataList.Label minWidth="90px">
                    {" "}
                    Combat Mana Regen{" "}
                  </DataList.Label>
                  <DataList.Value className="">
                    {characterStats?.mana_regen_combat}
                  </DataList.Value>
                </DataList.Item>
                {!retail && (<DataList.Item>
                  <DataList.Label minWidth="90px">
                    {" "}
                    Crit Chance {reforgeWarning()}
                  </DataList.Label>
                  <DataList.Value className="">
                    {(characterStats?.spell_crit?.value ?? 0).toFixed(2) + "%"}
                  </DataList.Value>
                </DataList.Item>)}
              </DataList.Root>
            </Accordion.AccordionContent>
          </Accordion.AccordionItem>
        </Card>
      </div>
    );
  }
  function getDefenseCard(): ReactElement {
    //connects specific bracket data into card, set to type ReactElement with tsx code inside return
    return (
      <div className="pt-3" key={"GetStatsDefense"}>
        <Card>
          <Heading mb="2" size="2">
            {" "}
            Defense{" "}
          </Heading>
          <DataList.Root size="1">
            <DataList.Item>
              <DataList.Label minWidth="90px"> Armor </DataList.Label>
              <DataList.Value className="">
                {" "}
                {characterStats?.armor?.effective}{" "}
              </DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label minWidth="90px"> Dodge </DataList.Label>
              <DataList.Value className="">
                {(characterStats?.dodge?.value ?? 0).toFixed(0) + "%"}
              </DataList.Value>{" "}
            </DataList.Item>
            <DataList.Item>
              <DataList.Label minWidth="90px"> Parry </DataList.Label>
              <DataList.Value className="">
                {(characterStats?.parry?.value ?? 0).toFixed(0) + "%"}
              </DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label minWidth="90px"> Block </DataList.Label>
              <DataList.Value className="">
                {(characterStats?.block?.value ?? 0).toFixed(0) + "%"}
              </DataList.Value>
            </DataList.Item>
            {/* resilience was removed from retail after MoP */}
            {!retail && (<DataList.Item>
              <DataList.Label minWidth="90px"> Resilience </DataList.Label>
              <DataList.Value className=""> {getResilience()} </DataList.Value>
            </DataList.Item>)}
          </DataList.Root>
        </Card>
      </div>
    );
  }
  function getRangedAttackPower() {
    let enchantAttackPower = 0
    const regexStr = /(\d+)(?=\s*?( [Aa]ttack [Pp]ower))/gm;

    props.characterEquipmentSummary?.equipped_items?.forEach((i) => {
      i.enchantments?.forEach((e) => {
        const regexResultArray = e.display_string?.match(regexStr);
        if (regexResultArray) {
          enchantAttackPower += Number(regexResultArray[0]);
        }
      });
    })
    switch (props.characterProfileSummary?.character_class?.name) {
      case "Rogue":
      case "Warrior":
        return props.characterProfileSummary.level + ((characterStats?.agility?.effective ?? 0) - 10) + enchantAttackPower
      case "Hunter":
        return props.characterProfileSummary.level * 2 + ((characterStats?.agility?.effective ?? 0) * 2 - 20) + enchantAttackPower
      default:
        return 0
    }
  }
  function getRangedDamage() {
    const rangedItem = props.characterEquipmentSummary?.equipped_items?.find(i =>
      i.slot?.type == "RANGED")
      if (rangedItem != null){
        const minVal = (getRangedAttackPower() * 0.0715 * ((rangedItem.weapon?.attack_speed?.value ?? 0)/ 1000)) + (rangedItem.weapon?.damage?.min_value ?? 0)
        const maxVal = (getRangedAttackPower() * 0.0715 * ((rangedItem.weapon?.attack_speed?.value ?? 0)/ 1000)) + (rangedItem.weapon?.damage?.max_value ?? 0)
        return minVal.toFixed(0) + " - " + maxVal.toFixed(0)
      }
  }
  function getRangedDPS() {
    const rangedItem = props.characterEquipmentSummary?.equipped_items?.find(i =>
      i.slot?.type == "RANGED")
      if (rangedItem != null){
        const minVal = (getRangedAttackPower() * 0.0715 * ((rangedItem.weapon?.attack_speed?.value ?? 0)/ 1000)) + (rangedItem.weapon?.damage?.min_value ?? 0)
        const maxVal = (getRangedAttackPower() * 0.0715 * ((rangedItem.weapon?.attack_speed?.value ?? 0)/ 1000)) + (rangedItem.weapon?.damage?.max_value ?? 0)
        const dps = (((minVal + maxVal)/2)/((rangedItem.weapon?.attack_speed?.value ?? 1)/ 1000))
        return dps.toFixed(1)
      }
  }
  function getResilience() {
    let resilSum = 0;
    const regexStr = /(\d+)(?=\s*?( [Rr]esilience [Rr]ating))/gm;
    let resilTier = 0;
    props.characterEquipmentSummary?.equipped_items?.forEach((i) => {
      i.stats?.forEach((r) => {
        if (r.type?.type == "RESILIENCE_RATING") {
          resilSum += r.value;
        }
      });
      i.enchantments?.forEach((e) => {
        const regexResultArray = e.display_string?.match(regexStr);
        if (regexResultArray) {
          resilSum += Number(regexResultArray[0]);
        }
      });
      i.set?.effects?.forEach((tier) => {
        const regexResultArrayTier = tier.display_string?.match(regexStr);
        if (regexResultArrayTier) {
          resilTier = Number(regexResultArrayTier[0]);
        }
      });
    });
    return resilSum + resilTier;
  }
  function HitRating() {
    let hitSum = 0;
    let hitTier = 0;
    const regexStr = /(\d+)(?=\s*?( [Hh]it [Rr]ating))/gm;
    props.characterEquipmentSummary?.equipped_items?.forEach((i) => {
      i.stats?.forEach((h) => {
        if (h.type?.type == "HIT_RATING") {
          hitSum += h.value;
        }
      });
      i.enchantments?.forEach((e) => {
        const regexResultArray = e.display_string?.match(regexStr);
        if (regexResultArray) {
          hitSum += Number(regexResultArray[0]);
        }
      });
      i.set?.effects?.forEach((tier) => {
        const regexResultArrayTier = tier.display_string?.match(regexStr);
        if (regexResultArrayTier) {
          hitTier = Number(regexResultArrayTier[0]);
        }
      });
    })
    return hitSum + hitTier;
  }
  function ExpertiseRating() {
    let ExpertiseSum = 0;
    let ExpertiseTier = 0;
    const regexStr = /(\d+)(?=\s*?( [Ee]xpertise [Rr]ating))/gm;
    props.characterEquipmentSummary?.equipped_items?.forEach((i) => {
      i.stats?.forEach((h) => {
        if (h.type?.type == "EXPERTISE_RATING") {
          ExpertiseSum += h.value;
        }
      });
      i.enchantments?.forEach((e) => {
        const regexResultArray = e.display_string?.match(regexStr);
        if (regexResultArray) {
          ExpertiseSum += Number(regexResultArray[0]);
        }
      });
      i.set?.effects?.forEach((tier) => {
        const regexResultArrayTier = tier.display_string?.match(regexStr);
        if (regexResultArrayTier) {
          ExpertiseTier = Number(regexResultArrayTier[0]);
        }
      });
    })
    return ExpertiseSum + ExpertiseTier;
  }
  //loops through each character rating (remember: characterratings is updated every time the user looks up a character, and has character data from controller)
  function getStats() {
    const cards: ReactElement[] = [];
    const accordionCards: ReactElement[] = [];
    if (characterStats) {
      cards.push(getGeneralCard());
      cards.push(getAttributesCard());
      if (retail) { cards.push(getSecondaryCard()); }
      cards.push(getDefenseCard());
      accordionCards.push(getMeleeCard());
      // retail has no ranged weapons - a hunter's bow is their main hand - so the numbers this
      // card works out from the MoP formulas mean nothing there
      if (!retail) { accordionCards.push(getRangedCard()); }
      accordionCards.push(getSpellCard());
    }
    return (
      <div>
        <div className="flex flex-col profile-stats">{cards}</div>
        <Accordion.Root
          className="bg-mauve6 rounded-md shadow-[0_2px_5px] shadow-black/5"
          type="single"
          collapsible
        >
          <div className="flex flex-col profile-stats">{accordionCards}</div>
        </Accordion.Root>
      </div>
    );
  }
};
export default ProfileStats;
