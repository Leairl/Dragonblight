import { Card, Container, Flex } from "@radix-ui/themes";
import { Outlet } from "react-router";
import SiteFooter from "../site-footer/site-footer";
import CharacterSearch from "../character-search/character-search";


function HomePage() {
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
            <CharacterSearch placeholder="Search WoW Character" />
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

export default HomePage;
