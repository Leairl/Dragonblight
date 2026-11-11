import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { Callout, Card, Flex, Heading, Skeleton, Table, Text } from "@radix-ui/themes";
import { ChevronDownIcon, ChevronUpIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { Dragonblight } from "../../clients/Dragonblight";
import { ClassColor } from "../../helpers/classColorHelper";
import { raceIcon, specDisplayName, specIcon } from "../../helpers/forever-names";
import { LadderPagination } from "../ladder-controls/ladder-controls";

type LoadState = "loading" | "loaded" | "notFound" | "error";

// The answer for one guild, tagged with the route it was for, so moving to another guild shows
// "loading" until that guild's answer arrives.
interface LoadResult {
  key: string;
  state: LoadState;
  page?: Dragonblight.ForeverGuildPage;
}

const iconStyle = { maxHeight: "22px", maxWidth: "22px" };

//members per page, the same as a page of the ladders
const pageSize = 50;

type SortColumn = "rank" | "level";

// How the roster is ordered. Rank starts guild master first and level starts highest first;
// clicking the same header again reverses it.
interface SortChoice {
  column: SortColumn;
  ascending: boolean;
}

// Orders the whole roster, before it is split into pages. Ties fall back to the other column,
// then the name, so the order never shuffles between page loads.
function sortMembers(members: Dragonblight.ForeverGuildPageMember[], sort: SortChoice): Dragonblight.ForeverGuildPageMember[] {
  let direction = -1;
  if (sort.ascending) {
    direction = 1;
  }
  return [...members].sort((a, b) => {
    let first = a.rank - b.rank;
    let second = b.level - a.level;
    if (sort.column === "level") {
      first = a.level - b.level;
      second = a.rank - b.rank;
    }
    if (first !== 0) {
      return first * direction;
    }
    if (second !== 0) {
      return second;
    }
    return `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`);
  });
}

// A column header that sorts the roster when clicked, with an arrow on the active one
function SortHeader(props: { label: string; column: SortColumn; sort: SortChoice; onSort: (column: SortColumn) => void; justify?: "center" }) {
  let arrow = null;
  if (props.sort.column === props.column) {
    arrow = <ChevronDownIcon />;
    if (props.sort.ascending) {
      arrow = <ChevronUpIcon />;
    }
  }
  let alignClass = "";
  if (props.justify === "center") {
    alignClass = " mx-auto";
  }
  return (
    <Table.ColumnHeaderCell justify={props.justify}>
      <button
        type="button"
        onClick={() => props.onSort(props.column)}
        className={"inline-flex items-center gap-1 cursor-pointer hover:text-white" + alignClass}
        aria-label={`Sort by ${props.label.toLowerCase()}`}
      >
        {props.label}
        {arrow}
      </button>
    </Table.ColumnHeaderCell>
  );
}

// The page of the roster being shown, tagged with the guild it belongs to, so moving to another
// guild starts back on its first page.
interface PageChoice {
  key: string;
  page: number;
}

// Blizzard's API gives rank numbers only, not the guild's own rank names
function rankLabel(rank: number): string {
  if (rank === 0) {
    return "Guild Master";
  }
  return `Rank ${rank}`;
}

// a missing icon (a race new to Forever, a spec with no art) falls back to the unknown icon
function showUnknownIcon(e: React.SyntheticEvent<HTMLImageElement>) {
  if (!e.currentTarget.src.endsWith("/unknown.png")) {
    e.currentTarget.src = "/unknown.png";
  }
}

function MemberRow(props: { member: Dragonblight.ForeverGuildPageMember; region: string }) {
  const m = props.member;
  const classColor = ClassColor.get(m.className);
  const specName = specDisplayName(m.specName);
  return (
    <Table.Row align="center">
      <Table.Cell>
        <Text size="2" color="gray">{rankLabel(m.rank)}</Text>
      </Table.Cell>
      <Table.RowHeaderCell>
        <Link to={`/character/${props.region}/${encodeURIComponent(m.slug)}`} className="flex items-center gap-2 hover:underline">
          <img src={`/ClassIcons/${m.className}.png`} alt="" height="22px" width="22px" style={iconStyle} onError={showUnknownIcon} />
          <span className="font-bold" style={{ color: classColor }}>{m.name} {m.surname}</span>
        </Link>
      </Table.RowHeaderCell>
      <Table.Cell justify="center">{m.level}</Table.Cell>
      <Table.Cell>
        <Flex align="center" gap="2">
          <img src={raceIcon(m.raceName)} alt="" height="22px" width="22px" style={iconStyle} onError={showUnknownIcon} />
          <span>{m.raceName}</span>
        </Flex>
      </Table.Cell>
      <Table.Cell>
        {specName !== "" && (
          <Flex align="center" gap="2">
            <img src={specIcon(specName, m.className)} alt="" height="22px" width="22px" style={iconStyle} onError={showUnknownIcon} />
            <span>{specName}</span>
          </Flex>
        )}
        {specName === "" && <Text color="gray">—</Text>}
      </Table.Cell>
    </Table.Row>
  );
}

// A WoW: Forever guild: its name, faction and ruleset, then every member of its roster, sorted
// by rank (guild master first), then level and name. Each member links to their character page.
// Route: /forever/guild/:region/:guildSlug
function ForeverGuild() {
  const { region, guildSlug } = useParams();
  const requestKey = `${region}/${guildSlug}`;
  const [result, setResult] = useState<LoadResult>();
  const [pageChoice, setPageChoice] = useState<PageChoice>();
  const [sort, setSort] = useState<SortChoice>({ column: "rank", ascending: true });

  let state: LoadState = "loading";
  let page: Dragonblight.ForeverGuildPage | undefined = undefined;
  if (result !== undefined && result.key === requestKey) {
    state = result.state;
    page = result.page;
  }

  useEffect(() => {
    let cancelled = false;
    new Dragonblight.ForeverGuildClient()
      .getGuild(region, guildSlug)
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
  }, [region, guildSlug, requestKey]);

  if (state === "notFound" || state === "error") {
    let message = `${guildSlug} not found. Check the guild name and region.`;
    if (state === "error") {
      message = "Couldn't load this guild: Blizzard's API didn't answer. Try again in a minute.";
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

  let factionName = "Alliance";
  if (page?.faction === "HORDE") {
    factionName = "Horde";
  }
  const members = sortMembers(page?.members ?? [], sort);
  const totalPages = Math.max(1, Math.ceil(members.length / pageSize));
  let currentPage = 0;
  if (pageChoice !== undefined && pageChoice.key === requestKey) {
    currentPage = Math.min(pageChoice.page, totalPages - 1);
  }
  const shownMembers = members.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  function changePage(newPage: number) {
    setPageChoice({ key: requestKey, page: newPage });
    window.scrollTo(0, 0);
  }

  //the same header again flips the order; a new one starts at its natural order
  function changeSort(column: SortColumn) {
    if (sort.column === column) {
      setSort({ column: column, ascending: !sort.ascending });
    } else if (column === "rank") {
      setSort({ column: "rank", ascending: true });
    } else {
      setSort({ column: "level", ascending: false });
    }
    setPageChoice({ key: requestKey, page: 0 });
  }

  return (
    <div className="mobileOnlyFull w-[80vw] min-h-[90vh]">
      <Flex direction="column" gap="3">
        <Card className="[--card-background-color:#292c31]">
          {state === "loading" && (
            <Flex align="center" gap="3" className="p-1">
              <Skeleton width="44px" height="44px"></Skeleton>
              <Flex direction="column" gap="2">
                <Skeleton width="220px" height="18px"></Skeleton>
                <Skeleton width="160px" height="12px"></Skeleton>
              </Flex>
            </Flex>
          )}
          {state === "loaded" && page && (
            <Flex align="center" gap="3" className="p-1">
              <img src={`/ProfileFactions/${factionName}.png`} alt={factionName} height="44px" width="44px" style={{ maxHeight: "44px", maxWidth: "44px" }} />
              <Flex direction="column" gap="1" className="min-w-0">
                <Heading size="6" className="truncate">&lt;{page.name}&gt;</Heading>
                <Text size="2" color="gray">
                  {page.rulesetName} · {page.region.toUpperCase()} · {members.length.toLocaleString()} members
                </Text>
              </Flex>
            </Flex>
          )}
        </Card>

        {state === "loaded" && (
          <LadderPagination
            page={currentPage}
            onPageChange={changePage}
            size="compact"
            className=""
            navClassName="flex justify-end grow-0"
            showCount
            totalPages={totalPages}
            totalItems={members.length}
            itemLabel="Members"
          />
        )}
        <Card className="[--card-background-color:#292c31]">
          <div className="overflow-x-auto">
            <Table.Root size="1">
              <Table.Header>
                <Table.Row>
                  <SortHeader label="Rank" column="rank" sort={sort} onSort={changeSort} />
                  <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                  <SortHeader label="Level" column="level" sort={sort} onSort={changeSort} justify="center" />
                  <Table.ColumnHeaderCell>Race</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Spec</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {state === "loading" &&
                  [0, 1, 2, 3, 4, 5].map((i) => (
                    <Table.Row key={i}>
                      <Table.Cell colSpan={5}>
                        <Skeleton height="18px"></Skeleton>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                {shownMembers.map((member) => (
                  <MemberRow key={member.slug} member={member} region={page?.region ?? ""} />
                ))}
              </Table.Body>
            </Table.Root>
          </div>
        </Card>
        {state === "loaded" && totalPages > 1 && (
          <LadderPagination
            page={currentPage}
            onPageChange={changePage}
            size="compact"
            className="pb-10"
            navClassName="flex justify-end"
            totalPages={totalPages}
          />
        )}
      </Flex>
    </div>
  );
}

export default ForeverGuild;
