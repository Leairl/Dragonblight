import { Badge, Card, Container, Flex, Heading, Separator, Text } from "@radix-ui/themes";
import { Outlet } from "react-router";
import SiteFooter from "../site-footer/site-footer";
import ForeverSearch from "./forever-search";

// The page frame for /forever. It matches HomePage, with ForeverSearch in place of the
// realm search: Forever characters are looked up by name and surname with no realm.
function ForeverHome() {
  return (
    <div>
      <img
        className="fixed opacity-50 -z-10 object-top-left w-full h-full inset-0 object-cover "
        src={`/Background/background.png`}
      ></img>
      <Container minHeight="100vh">
        <Flex direction="column" gap="5" className=" w-full items-center">
          {/* phones drop the side margins, or the search and its results get squeezed into a third of the screen */}
          <Card className="mb-5 m-20 max-[800px]:mx-0 max-w-[70vw] max-[800px]:max-w-[90vw] w-full">
            <ForeverSearch placeholder="Search WoW Character (Name Surname)" />
          </Card>
          <div className="flex flex-row justify-center items-center z-10">
            <Outlet></Outlet>
          </div>
        </Flex>
      </Container>
      <SiteFooter />
    </div>
  );
}

interface PlannedFeature {
  title: string;
  description: string;
}

// What the Forever API has been seen to serve so far, and so what can come next.
const plannedFeatures: PlannedFeature[] = [
  {
    title: "More of each character",
    description: "Professions, reputations, achievements and the 3D model viewer on character pages.",
  },
  {
    title: "Guild rosters",
    description: "Guild pages with their members, recent activity and achievements.",
  },
  {
    title: "Rulesets",
    description: "Forever replaces realms with rulesets: PvP, Normal, Roleplay and Roleplay PvP.",
  },
];

// The landing page shown at /forever/.
export function ForeverLanding() {
  return (
    <div className="flex flex-col gap-5 w-[70vw] max-[800px]:w-[90vw]">
      <Card>
        <Flex direction="column" gap="3" className="p-2">
          <Flex align="center" gap="3" wrap="wrap">
            <Heading size="7">World of Warcraft: Forever</Heading>
            <Badge color="amber">Coming soon</Badge>
          </Flex>
          <Text as="p" color="gray">
            Forever takes WoW back to its first year, with rulesets instead of realms and account-wide
            progression through the Legacy System. Dragonblight is adding Forever support as Blizzard's
            API for it fills in.
          </Text>
        </Flex>
      </Card>
      <Card>
        <Flex direction="column" gap="3" className="p-2">
          <Heading size="5">What's planned</Heading>
          <Separator size="4" />
          {plannedFeatures.map((feature) => (
            <Flex key={feature.title} direction="column" gap="1">
              <Text weight="bold">{feature.title}</Text>
              <Text as="p" size="2" color="gray">{feature.description}</Text>
            </Flex>
          ))}
        </Flex>
      </Card>
    </div>
  );
}

export default ForeverHome;
