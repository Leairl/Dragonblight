import { Card, Container, Flex } from "@radix-ui/themes";
import Select, { Option } from "rc-select";
import React, {  useMemo } from "react";
import { useState } from "react";
import "./search-box.less";
import debounce from "lodash/debounce";
import { ClassColor } from "../../helpers/classColorHelper";
import { Dragonblight } from "../../clients/Dragonblight";
import { UsRealms, EuRealms } from "../../clients/ServerNames";
import { Link, Outlet } from "react-router";
import { flavorHref, getFlavor } from "../../helpers/game-flavor";

function HomePage() {
  //finding data with setSearchResults, and referencing / storing with searchResults
  const [searchResults, setSearchResults] = useState<React.ReactElement[]>();
  const inputRef = React.createRef<HTMLInputElement>();
  const delayedSearch = useMemo(
  () =>
    debounce(async (searchTerm) => {
      await SearchAsync(searchTerm.trim());
    }, 500),
    []
  );
  return (
    <div>
      <img
        className="fixed opacity-50 -z-10 object-left-top w-full h-full inset-0 object-cover "
        src={`/Background/background.png`}
      ></img>
      <Container height="100vh">
        <Flex direction="column" gap="5" className=" w-full items-center">
          <Card className="mb-5 m-20 max-w-[70vw] w-full">
            <Select
              onSelect={(v, option)=> 
                { 
                  const optionsSplit = option.key.split('-')
                  const name = optionsSplit[0]
                  const server = optionsSplit[1]
                  const region = optionsSplit[2]
                  window.location.href = flavorHref(`/profile/${region}/${server}/${name}`)}
              }
              mode="combobox"
              notFoundContent={null}
              defaultActiveFirstOption={true}
              className="text-white font-thin text-base w-full"
              getInputElement={() => (
                <input
                  style={{
                    outline: "none",
                    background: "transparent",
                    width: "100%",
                  }}
                  placeholder="Search WoW Character"
                  ref={inputRef}
                />
              )}
              //value of element is changing (text field is changing per character, and is called)
              //compares what was previously typed to what is currently typed (if false, then print out search box dropdown)
              onChange={delayedSearch}
            >
              {searchResults}
            </Select>
          </Card>
          <div className="flex flex-row justify-center items-center z-10">
        <Outlet></Outlet>
      </div>
        </Flex>
      </Container>
    </div>
  );

  function GetRegionImage(
    characterSummary: Dragonblight.CharacterProfileSummary
  ) {
    if (characterSummary._links?.self?.href?.includes("us.api")) {
      return `/Regions/us.svg`;
    }
    return `/Regions/eu.svg`;
  }
  function GetRegion(characterSummary: Dragonblight.CharacterProfileSummary) {
    if (characterSummary._links?.self?.href?.includes("us.api")) {
      return "us";
    }
    return "eu";
  }

  function GetAddCharacterOption(
    characterName: string,
    server: string,
    region: string
  ) {
    return (
      <Option
        value={`${characterName}-${server}-${region}`}
        key={`${characterName}-${server}-${region}-add`}
      >
          <div className="flex">
            <div className="pr-1">
              <img
                src={`/Radix/plus.svg`}
                height="25px"
                width="25px"
                style={{ maxHeight: "25px", maxWidth: "25px" }}
              ></img>
            </div>
            <span className="pl-2 flex-grow">
              {characterName}-{server}
            </span>
            <img
              src={`/Regions/${region}.svg`}
              className="flex"
              height="25px"
              width="25px"
              style={{ maxHeight: "25px", maxWidth: "25px" }}
            ></img>
          </div>
      </Option>
    );
  }

  //sending in search string to backend
  async function SearchAsync(search: string) {
    setSearchResults([
      <Option key={"loading"} disabled>
        {" "}
        Loading...{" "}
      </Option>,
    ]);
    if (search == "") {
      setSearchResults([]);
      return;
    }
    //returning data from character profile summary
    const client = new Dragonblight.SearchClient();
    client.searchChar(search).then(async (data) => {
      //map does for loop for each item and outputs a new item (converts to new type)
      const mapData = data.map(
        (characterSummary: Dragonblight.CharacterProfileSummary) => {
          return (
            <Option
              value={`${characterSummary.name}-${characterSummary.realm?.name}`}
              key={`${characterSummary.name}-${
                characterSummary.realm?.slug
              }-${GetRegion(characterSummary)}`}
            >
              <Link
                to={`/profile/${GetRegion(characterSummary)}/${
                  characterSummary.realm?.slug
                }/${characterSummary.name}`}
              >
                <div className="flex">
                  <div className="pr-1">
                    <img
                      src={`/ClassIcons/${characterSummary.character_class?.name}.png`}
                      height="25px"
                      width="25px"
                      style={{ maxHeight: "25px", maxWidth: "25px" }}
                    ></img>
                  </div>
                  <img
                    src={`/Factions/${characterSummary.faction?.name}.png`}
                    className="flex"
                    height="25px"
                    width="25px"
                    style={{ maxHeight: "25px", maxWidth: "25px" }}
                  ></img>
                  <span
                    className="pl-2 flex-grow"
                    style={{
                      color: `${ClassColor.get(
                        characterSummary.character_class?.name ?? ""
                      )}`,
                    }}
                  >
                    {characterSummary.name}-{characterSummary.realm?.name}
                  </span>
                  <img
                    src={GetRegionImage(characterSummary)}
                    className="flex"
                    height="25px"
                    width="25px"
                    style={{ maxHeight: "25px", maxWidth: "25px" }}
                  ></img>
                </div>
              </Link>
            </Option>
          );
        }
      );

      //option for user to insert and load a character from search
      const searchSplit = search.split("-");
      const characterName = searchSplit[0];
      //checks through the list of eu and us realms, and connects it with a similar named server typed in search.
      let UsServers = "" as string | undefined
      let EuServers = "" as string | undefined
      if (getFlavor() == "classic")
      {
      UsServers =
        searchSplit.length > 1
          ? UsRealms.find((r) =>
              r.toLowerCase().startsWith(searchSplit[1].toLowerCase())
            )
          : UsRealms[0];
      EuServers =
        searchSplit.length > 1
          ? EuRealms.find((r) =>
              r.toLowerCase().startsWith(searchSplit[1].toLowerCase())
            )
          : EuRealms[0];
      }
      else if (getFlavor() == "retail")
      {
      const realmClient = new Dragonblight.RealmClient();
      const retailUsRealms = await realmClient.getRealms("us");
      const retailEuRealms = await realmClient.getRealms("eu");
      // when we are looking for a realm, does a comparison from the list of servers we have saved to the one being
      // searched in the search text box. if we get the right slug then it just pulls that slug to the box
      UsServers =
        searchSplit.length > 1
          ? retailUsRealms.realms?.find((r) =>
              r.slug?.toLowerCase().startsWith(searchSplit[1].toLowerCase())
            )?.slug
          : retailUsRealms.realms?.[0].slug;
      EuServers =
        searchSplit.length > 1
          ? retailEuRealms.realms?.find((r) =>
              r.slug?.toLowerCase().startsWith(searchSplit[1].toLowerCase())
            )?.slug
          : retailEuRealms.realms?.[0].slug;
      }

      //if the character name and server is the same in the search bar as the character not loaded in redis
      if (
        data.find(
          (c) => c.name == characterName && c.realm?.name == UsServers
        ) == undefined
      ) {
        if (UsServers != null) {
          mapData.push(GetAddCharacterOption(characterName, UsServers, "us"));
        }
      }
      if (
        data.find(
          (c) => c.name == characterName && c.realm?.name == EuServers
        ) == undefined
      ) {
        if (EuServers != null) {
          mapData.push(GetAddCharacterOption(characterName, EuServers, "eu"));
        }
      }
      setSearchResults(mapData);
    });
  }
}

export default HomePage;
