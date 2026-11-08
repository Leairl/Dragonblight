import Select, { Option } from "rc-select";
import React, { useMemo, useState } from "react";
import "../home-page/search-box.less";
import debounce from "lodash/debounce";
import { Link } from "react-router";
import { ClassColor } from "../../helpers/classColorHelper";
import { Dragonblight } from "../../clients/Dragonblight";
import { UsRealms, EuRealms } from "../../clients/ServerNames";
import { flavorHref, getFlavor } from "../../helpers/game-flavor";
import { realmDisplayName } from "../../helpers/realmNameHelper";

function GetRegionImage(characterSummary: Dragonblight.CharacterProfileSummary) {
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

function GetAddCharacterOption(characterName: string, server: string, region: string) {
  return (
    <Option value={`${characterName}-${realmDisplayName(server)}-${region}`} key={`${characterName}|${server}|${region}|add`}>
      <div className="flex">
        <div className="pr-1">
          <img src={`/Radix/plus.svg`} height="25px" width="25px" style={{ maxHeight: "25px", maxWidth: "25px" }}></img>
        </div>
        <span className="pl-2 grow">
          {characterName}-{server}
        </span>
        <img src={`/Regions/${region}.svg`} className="flex" height="25px" width="25px" style={{ maxHeight: "25px", maxWidth: "25px" }}></img>
      </div>
    </Option>
  );
}

//the realm typed after the dash, in the form realm names and slugs use
function typedRealm(searchSplit: string[]): string {
  return searchSplit[1].toLowerCase().replace("'", "").replace(" ", "-");
}

//Finds a realm in a list of names that starts with what was typed after the dash, or the first realm when nothing was
function findRealmName(realms: string[], searchSplit: string[]): string | undefined {
  if (searchSplit.length > 1) {
    return realms.find((r) => r.toLowerCase().startsWith(typedRealm(searchSplit)));
  }
  return realms[0];
}

//The same, for retail's realm list from the server, which matches on slugs
function findRealmSlug(realms: Dragonblight.RealmReference[] | undefined, searchSplit: string[]): string | undefined {
  if (searchSplit.length > 1) {
    return realms?.find((r) => r.slug?.toLowerCase().startsWith(typedRealm(searchSplit)))?.slug;
  }
  return realms?.[0].slug;
}

//Searches characters as you type, "Name" or "Name-Realm", and opens the picked character's profile.
//Characters already cached come back from the server; the "add" options load one that isn't yet.
//Used by the home page and the nav bar.
function CharacterSearch(props: { placeholder: string; className?: string }) {
  const [searchResults, setSearchResults] = useState<React.ReactElement[]>();
  const inputRef = React.createRef<HTMLInputElement>();
  const delayedSearch = useMemo(
    () =>
      debounce(async (searchTerm) => {
        await SearchAsync(searchTerm.trim());
      }, 500),
    []
  );

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
    client.searchChar(search.replace("'", "").replace(" ", "-")).then(async (data) => {
      //map does for loop for each item and outputs a new item (converts to new type)
      const mapData = data.map((characterSummary: Dragonblight.CharacterProfileSummary) => {
        return (
          <Option
            value={`${characterSummary.name}-${characterSummary.realm?.name}`}
            key={`${characterSummary.name}|${characterSummary.realm?.slug}|${GetRegion(characterSummary)}`}
          >
            <Link to={`/profile/${GetRegion(characterSummary)}/${characterSummary.realm?.slug}/${characterSummary.name}`}>
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
                <span className="pl-2 grow" style={{ color: `${ClassColor.get(characterSummary.character_class?.name ?? "")}` }}>
                  {characterSummary.name}-{characterSummary.realm?.name}
                </span>
                <img src={GetRegionImage(characterSummary)} className="flex" height="25px" width="25px" style={{ maxHeight: "25px", maxWidth: "25px" }}></img>
              </div>
            </Link>
          </Option>
        );
      });

      //option for user to insert and load a character from search
      const searchSplit = search.split("-");
      const characterName = searchSplit[0];
      //checks through the list of eu and us realms, and connects it with a similar named server typed in search.
      let UsServers = "" as string | undefined;
      let EuServers = "" as string | undefined;
      if (getFlavor() == "classic") {
        UsServers = findRealmName(UsRealms, searchSplit);
        EuServers = findRealmName(EuRealms, searchSplit);
      } else if (getFlavor() == "retail") {
        const realmClient = new Dragonblight.RealmClient();
        const retailUsRealms = await realmClient.getRealms("us");
        const retailEuRealms = await realmClient.getRealms("eu");
        // when we are looking for a realm, does a comparison from the list of servers we have saved to the one being
        // searched in the search text box. if we get the right slug then it just pulls that slug to the box
        UsServers = findRealmSlug(retailUsRealms.realms, searchSplit);
        EuServers = findRealmSlug(retailEuRealms.realms, searchSplit);
      }

      //if the character name and server is the same in the search bar as the character not loaded in redis
      if (data.find((c) => c.name == characterName && c.realm?.name == UsServers) == undefined) {
        if (UsServers != null) {
          mapData.push(GetAddCharacterOption(characterName, UsServers, "us"));
        }
      }
      if (data.find((c) => c.name == characterName && c.realm?.name == EuServers) == undefined) {
        if (EuServers != null) {
          mapData.push(GetAddCharacterOption(characterName, EuServers, "eu"));
        }
      }
      setSearchResults(mapData);
    });
  }

  let className = "text-white font-thin text-base";
  if (props.className !== undefined) {
    className = props.className;
  }

  return (
    <Select
      onSelect={(_v, option) => {
        const optionsSplit = option.key.split("|");
        const name = optionsSplit[0];
        const server = optionsSplit[1];
        const region = optionsSplit[2];
        window.location.href = flavorHref(`/profile/${region}/${server}/${name}`);
      }}
      mode="combobox"
      notFoundContent={null}
      defaultActiveFirstOption={true}
      className={className}
      getInputElement={() => (
        <input
          style={{
            outline: "none",
            background: "transparent",
            width: "100%",
          }}
          placeholder={props.placeholder}
          ref={inputRef}
        />
      )}
      //value of element is changing (text field is changing per character, and is called)
      //compares what was previously typed to what is currently typed (if false, then print out search box dropdown)
      onChange={delayedSearch}
    >
      {searchResults}
    </Select>
  );
}

export default CharacterSearch;
