import Select, { Option } from "rc-select";
import React, { useMemo, useState } from "react";
import "../home-page/search-box.less";
import debounce from "lodash/debounce";
import { ClassColor } from "../../helpers/classColorHelper";
import { Dragonblight } from "../../clients/Dragonblight";
import { flavorHref } from "../../helpers/game-flavor";

const iconStyle = { maxHeight: "25px", maxWidth: "25px" };

function regionOf(character: Dragonblight.ForeverCharacterProfile): string {
  if (character._links?.self?.href?.includes("us.api")) {
    return "us";
  }
  return "eu";
}

// Splits "Joe Gun", "joe-gun" or " joe  gun " into its words: any run of spaces or hyphens
// separates two words, and separators at either end are dropped.
function nameParts(text: string): string[] {
  const parts: string[] = [];
  let current = "";
  for (const c of text) {
    const isSeparator = c === "-" || c.trim() === "";
    if (isSeparator) {
      if (current !== "") {
        parts.push(current);
        current = "";
      }
    } else {
      current += c;
    }
  }
  if (current !== "") {
    parts.push(current);
  }
  return parts;
}

// "Joe Gun" or "joe-gun" becomes "joe-gun", the slug Blizzard addresses a Forever character
// by. Empty when the text isn't exactly a name and a surname.
function foreverSlug(typed: string): string {
  const parts = nameParts(typed);
  if (parts.length !== 2) {
    return "";
  }
  return parts.join("-").toLowerCase();
}

// Letters typed with alt codes that have no accent to strip, mapped to the plain letters
// people type instead. Mirrors FoldName in ForeverCharacterController.
const plainLetters: Record<string, string> = {
  "ð": "d", "đ": "d", "ø": "o", "ł": "l", "ı": "i", "æ": "ae", "œ": "oe", "þ": "th", "ß": "ss",
};

// The accent marks NFD splits off accented letters ("é" becomes "e" plus U+0301)
const firstAccentMark = 0x0300;
const lastAccentMark = 0x036f;

// "Lucid Ðreamx" and "lucid-dreamx" both become "lucid-dreamx", for comparing names
function foldName(text: string): string {
  let folded = "";
  for (const c of text.toLowerCase().normalize("NFD")) {
    const code = c.codePointAt(0) ?? 0;
    const isAccentMark = code >= firstAccentMark && code <= lastAccentMark;
    if (isAccentMark) {
      continue;
    }
    const plain = plainLetters[c];
    if (plain !== undefined) {
      folded += plain;
    } else {
      folded += c;
    }
  }
  return nameParts(folded).join("-");
}

// "joe-gun" shown as "Joe Gun", for characters that haven't been looked up yet
function displayName(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// Loads a character that isn't in the suggestions yet, the same "+" row the realm search shows
function addCharacterOption(slug: string, region: string) {
  return (
    <Option value={`${displayName(slug)}-${region}`} key={`${slug}|${region}|add`}>
      <div className="flex">
        <div className="pr-1">
          <img src={`/Radix/plus.svg`} height="25px" width="25px" style={iconStyle}></img>
        </div>
        <span className="pl-2 flex-1 min-w-0 break-words">{displayName(slug)}</span>
        <img src={`/Regions/${region}.svg`} className="flex" height="25px" width="25px" style={iconStyle}></img>
      </div>
    </Option>
  );
}

// The Forever counterpart of CharacterSearch: the same box and suggestion rows, searching
// "Name Surname" instead of "Name-Realm". Suggestions are Forever characters someone has
// already looked up; the "+" rows load one that isn't yet, in either region.
function ForeverSearch(props: { placeholder: string; className?: string }) {
  const [searchResults, setSearchResults] = useState<React.ReactElement[]>();
  const delayedSearch = useMemo(
    () =>
      debounce(async (searchTerm: string) => {
        await searchAsync(searchTerm.trim());
      }, 500),
    []
  );

  async function searchAsync(search: string) {
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
    const client = new Dragonblight.ForeverCharacterClient();
    let data: Dragonblight.ForeverCharacterProfile[] = [];
    try {
      data = await client.search(search);
    } catch (error) {
      console.error(error);
    }

    const options = data.map((character) => {
      const region = regionOf(character);
      const slug = `${character.name}-${character.surname}`.toLowerCase();
      return (
        <Option value={`${character.name} ${character.surname}-${region}`} key={`${slug}|${region}`}>
          <div className="flex">
            <div className="pr-1">
              <img src={`/ClassIcons/${character.character_class?.name}.png`} height="25px" width="25px" style={iconStyle}></img>
            </div>
            <img src={`/Factions/${character.faction?.name}.png`} className="flex" height="25px" width="25px" style={iconStyle}></img>
            <span className="pl-2 flex-1 min-w-0 break-words" style={{ color: `${ClassColor.get(character.character_class?.name ?? "")}` }}>
              {character.name} {character.surname}
            </span>
            <img src={`/Regions/${region}.svg`} className="flex" height="25px" width="25px" style={iconStyle}></img>
          </div>
        </Option>
      );
    });

    // offer to load the typed character in each region it isn't already suggested for
    const typedSlug = foreverSlug(search);
    if (typedSlug !== "") {
      for (const region of ["us", "eu"]) {
        const alreadyListed = data.some(
          (c) => regionOf(c) === region && foldName(`${c.name}-${c.surname}`) === foldName(typedSlug)
        );
        if (!alreadyListed) {
          options.push(addCharacterOption(typedSlug, region));
        }
      }
    }
    setSearchResults(options);
  }

  let className = "text-white font-thin text-base";
  if (props.className !== undefined) {
    className = props.className;
  }

  return (
    <Select
      onSelect={(_v, option) => {
        const keySplit = String(option.key).split("|");
        const slug = keySplit[0];
        const region = keySplit[1];
        window.location.href = flavorHref(`/character/${region}/${encodeURIComponent(slug)}`);
      }}
      mode="combobox"
      // the server already matched these, ignoring accents and alt-code letters; rc-select's own
      // filter compares text exactly and would hide "Lucid Ðreamx" when "lucid dreamx" was typed
      filterOption={false}
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
        />
      )}
      onChange={delayedSearch}
    >
      {searchResults}
    </Select>
  );
}

export default ForeverSearch;
