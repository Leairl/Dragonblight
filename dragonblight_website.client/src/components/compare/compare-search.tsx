import React, { FC, useMemo, useState } from "react";
import Select, { Option } from "rc-select";
import debounce from "lodash/debounce";
import { Dragonblight } from "../../clients/Dragonblight";
import { ClassColor } from "../../helpers/classColorHelper";
import { realmSlug } from "../../helpers/realmNameHelper";
import "../home-page/search-box.less";

interface CompareSearchProps {
  //only characters of this class are offered - a compare only makes sense within one class
  classId: number | undefined;
  className: string | undefined;
  //the character already on the left, so it is not offered against itself
  excludeId: number | undefined;
  onPick: (region: string, server: string, name: string) => void;
}

function regionOf(c: Dragonblight.CharacterProfileSummary) {
  return c._links?.self?.href?.includes("us.api") ? "us" : "eu";
}

//Picks the character for the right-hand side. Search results are the characters the site has
//already seen, filtered to the left character's class; "Name-Realm" typed in full can also be
//compared directly, and the page checks its class once it loads.
const CompareSearch: FC<CompareSearchProps> = (props) => {
  const [results, setResults] = useState<React.ReactElement[]>();
  const delayedSearch = useMemo(
    () => debounce((term: string) => search(term.trim()), 400),
    [props.classId, props.excludeId]
  );

  function search(term: string) {
    if (term == "") {
      setResults([]);
      return;
    }
    setResults([
      <Option key="loading" disabled>
        Loading...
      </Option>,
    ]);
    new Dragonblight.SearchClient()
      .searchChar(term.replace("'", "").replace(" ", "-"))
      .then((data) => {
        const matches = data.filter(
          (c) => c.character_class?.id == props.classId && c.id != props.excludeId
        );
        const options = matches.map((c) => (
          <Option value={`${c.name}-${c.realm?.name}`} key={`${c.name}|${c.realm?.slug}|${regionOf(c)}`}>
            <div className="flex items-center">
              <img src={`/ClassIcons/${c.character_class?.name}.png`} height="22px" width="22px" />
              <img className="ml-1" src={`/Factions/${c.faction?.name}.png`} height="22px" width="22px" />
              <span className="pl-2 grow" style={{ color: ClassColor.get(c.character_class?.name ?? "") }}>
                {c.name}-{c.realm?.name}
              </span>
              <img src={`/Regions/${regionOf(c)}.svg`} height="22px" width="22px" />
            </div>
          </Option>
        ));
        //a character the site has not cached yet can still be compared by typing Name-Realm
        const [name, realm] = term.split("-");
        if (name && realm) {
          for (const region of ["us", "eu"]) {
            const slug = realmSlug(realm);
            if (!matches.some((c) => c.name?.toLowerCase() == name.toLowerCase() && c.realm?.slug == slug && regionOf(c) == region)) {
              options.push(
                <Option value={`${name}-${realm}-${region}`} key={`${name}|${slug}|${region}|add`}>
                  <div className="flex items-center">
                    <img src={`/Radix/plus.svg`} height="22px" width="22px" />
                    <span className="pl-2 grow">
                      {name}-{realm}
                    </span>
                    <img src={`/Regions/${region}.svg`} height="22px" width="22px" />
                  </div>
                </Option>
              );
            }
          }
        }
        if (options.length == 0) {
          options.push(
            <Option key="none" disabled>
              No {props.className ?? ""} characters found
            </Option>
          );
        }
        setResults(options);
      })
      .catch(() => setResults([]));
  }

  return (
    <Select
      mode="combobox"
      notFoundContent={null}
      defaultActiveFirstOption={true}
      className="text-white font-thin text-base"
      onSelect={(_v, option) => {
        const [name, server, region] = String(option.key).split("|");
        props.onPick(region, server, name);
      }}
      getInputElement={() => (
        <input
          style={{ outline: "none", background: "transparent", width: "100%" }}
          placeholder={`Search ${props.className ?? ""} to compare (Name-Realm)`}
        />
      )}
      onChange={delayedSearch}
    >
      {results}
    </Select>
  );
};

export default CompareSearch;
