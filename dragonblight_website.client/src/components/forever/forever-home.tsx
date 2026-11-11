import { Card, Container, Flex } from "@radix-ui/themes";
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

export default ForeverHome;
