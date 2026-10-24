import { FC, useEffect, useState } from "react";
import "./profile-experience.css";
import { Dragonblight } from "../../../clients/Dragonblight";
import { useParams } from "react-router";
import * as Accordion from "@radix-ui/react-accordion";
import { Card, Heading, Skeleton } from "@radix-ui/themes";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { seasonalIcon, tierColor } from "../../../helpers/seasonal-icons";
import { getFlavor } from "../../../helpers/game-flavor";


interface ProfileExperienceProps {
  //shows highest achievement per season 
  achievements?: Dragonblight.SeasonalAchievement;
  characterNotFound?: boolean;
}

const ProfileExperience: FC<ProfileExperienceProps> = ({ achievements, characterNotFound }) => {
  //state to hold seasonal data
  const [seasons, setSeasons] = useState<Dragonblight.SeasonalAchievement[]>([]);
  const [seasonStart, setSeasonStart] = useState<Date | null>();
  const { region, server, characterName } = useParams();
  const [loading, setLoading] = useState<boolean>(true);

  //calls the client when the page opens
  useEffect(() => {
    if (region == null || server == null || characterName == null) {
      return;
    }
    setLoading(true);
    new Dragonblight.AchievementClient()
      //pull from url and get list of seasonal achievements from method
      .getHighestSeasonalAchievements(server.replace(" ", "-"), characterName, region)
      .then(setSeasons)
      .catch(() => setSeasons([]))
      .finally(() => setLoading(false));
  }, [region, server, characterName]);
  function expansionOf(season: string | undefined): string {
    const Expansion = season ?? "";
    const ExpansionText = season?.indexOf("Season");
    if (ExpansionText === undefined || ExpansionText <= 0) {
      return "Classic";
    }
    return Expansion?.slice(0, ExpansionText).trim();
  }
  //dict of string of expansions with each expansion connected to a list of achievements per expac
  const expansions = new Map<string, Dragonblight.SeasonalAchievement[]>()
  for (const season of seasons) {
    const ExpansionName = expansionOf(season.season);
    //updates the expansions list with the correct amount of seasons per expansion
    //key is expansion name and value is the list of seasons
    // ... copies old values in from the list
    expansions.set(ExpansionName, [...(expansions.get(ExpansionName) ?? []), season])

  }
  function getSkeleton(i: number) {
    return (
      <Skeleton key={"ExperienceSkeleton" + i}>
        <Card className="border-card dropdown-accordionCard h-[45px]"></Card>
      </Skeleton>
    );
  }
  function getSkeletons() {
    return (
      <div className="pt-2 profile-experience">
        {[0, 1, 2].map((i) => getSkeleton(i))}
      </div>
    );
  }
  return loading || characterNotFound ? getSkeletons() : (
    //loops through the dictionary and for each expansion key we loop through all seasons of
    //that expansion and show the name of that achievement in the list of strings  <Accordion.Root type="multiple" className="profile-experience">
    <Accordion.Root type="multiple" className= {characterNotFound ? "pt-2 profile-experience not-found" : "pt-2 profile-experience"}>
      {[...expansions].map(([expansion, seasonsOfExpansion]) => (
        <Card key={expansion} className=" border-card dropdown-accordionCard">
          <Accordion.Item value={expansion}>
            <Accordion.Header className="flex">
              <Accordion.Trigger className="group flex h-[45px] flex-1 items-center justify-between cursor-pointer">
                <Heading size="2">{expansion}</Heading>
                <ChevronDownIcon
                  className="transition-transform duration-300 group-data-[state=open]:rotate-180"
                  aria-hidden
                />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="AccordionContent">
              {seasonsOfExpansion.map((s) => {
                const seasonalTitle = s.name?.split(":")[0];
                const icon = seasonalIcon(s);
                return (
                  <div key={s.id}>

                    <div className="experience-season text-shadow-md text-shadow-black">
                      {s.season}
                    </div>
                    <div className="flex flex-row">
                      <div className="experience-icon-slot">
                        {icon && (
                          <img
                            src={icon}
                            className="experience-icon"
                            onError={(e) => (e.currentTarget.style.display = "none")}
                          />
                        )}
                      </div>
                      <div className={(tierColor[s.tier ?? ""] ?? "text-stone-100") + " text-shadow-md text-shadow-black"}>
                        {seasonalTitle}
                      </div>
                    </div>
                  </div>
                );
              })}
            </Accordion.Content>

          </Accordion.Item>
        </Card>
      ))}
    </Accordion.Root>
  );

};

export default ProfileExperience;
