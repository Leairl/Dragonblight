import React, { FC, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { Callout, Card, Heading, IconButton, SegmentedControl, Skeleton, Switch, Text } from "@radix-ui/themes";
import { Cross2Icon, InfoCircledIcon, LoopIcon } from "@radix-ui/react-icons";
import { Dragonblight } from "../../clients/Dragonblight";
import { ClassColor } from "../../helpers/classColorHelper";
import { realmDisplayName } from "../../helpers/realmNameHelper";
import { getFlavor, wowheadUrl } from "../../helpers/game-flavor";
import { itemTooltipParams, QualityColor } from "../../helpers/equipmentHelper";
import { averagePvpItemLevel, getPvpItemLevels } from "../../helpers/pvpItemLevel";
import { useItemLevelMode } from "../../helpers/itemLevelMode";
import ItemLevelToggle from "../item-level-toggle/item-level-toggle";
import CompareStats from "./compare-stats";
import { secondaryStatsAttr } from "../../helpers/wowhead-item-stats";
import { diffEquipment, EquipmentDiff, SideDiff, SlotDiff } from "./equipment-diff";
import CompareSearch from "./compare-search";
import CompareGlyphs from "./compare-glyphs";
import CompareTalents from "./compare-talents";
import "./compare.css";
declare const $WowheadPower: { refreshLinks: () => void };

interface CharacterData {
  status: "idle" | "loading" | "loaded" | "notFound";
  summary?: Dragonblight.CharacterProfileSummary;
  equipment?: Dragonblight.CharacterEquipmentSummary;
  //each equipped item's PvP item level
  pvpLevels?: Map<Dragonblight.EquippedItem, number>;
}

//Loads one side of the compare. The equipment is fetched after the profile, the same order the
//profile page uses, since the profile call is what brings an uncached character into the site.
//A side counts as loaded once its PvP item levels are known too, so the diff never shows the
//non-PvP levels first and then jumps.
function useCharacter(region?: string, server?: string, name?: string): CharacterData {
  //results are tagged with the character they belong to, so a stale result reads as loading
  //the moment the url moves on to someone else
  const key = region && server && name ? `${region}/${server}/${name}` : undefined;
  const [data, setData] = useState<CharacterData & { key?: string }>({ status: "idle" });
  useEffect(() => {
    if (!region || !server || !name) {
      return;
    }
    let cancelled = false;
    const client = new Dragonblight.ProfileClient();
    const slug = server.replace(" ", "-");
    const done = (d: CharacterData) => {
      if (!cancelled) setData({ ...d, key: `${region}/${server}/${name}` });
    };
    client
      .getProfile(slug, name, region)
      .then(async (profile) => {
        if (profile?.charSummary == null) {
          throw new Error("not found");
        }
        const equipment = await client.getEquipment(slug, name, region);
        const pvpLevels = await getPvpItemLevels(equipment);
        done({ status: "loaded", summary: profile.charSummary, equipment, pvpLevels });
      })
      .catch(() => done({ status: "notFound" }));
    return () => {
      cancelled = true;
    };
  }, [region, server, name]);
  if (key == undefined) return { status: "idle" };
  return data.key == key ? data : { status: "loading" };
}

const ProfileCompare: FC = () => {
  const { region, server, characterName, region2, server2, characterName2 } = useParams();
  const navigate = useNavigate();
  //the tab and the talent spec live in the query string, so a compare link opens where it was left
  const [params, setParams] = useSearchParams();
  //MoP Classic has no Stats tab: Blizzard's MoP data says nothing about reforging (not on the
  //items, not on the character sheet), so a reforged character's stats cannot be compared
  //reliably. A ?tab=stats link followed into MoP opens on equipment.
  const statsTab = getFlavor() == "retail";
  const tabParam = params.get("tab");
  //Glyphs are the other way round: Blizzard's retail data has none. A ?tab=glyphs link followed
  //into retail opens on equipment too.
  const glyphsTab = !statsTab;
  const tab = tabParam == "talents" || (tabParam == "stats" && statsTab) || (tabParam == "glyphs" && glyphsTab) ? tabParam : "equipment";
  const [ilvlMode] = useItemLevelMode();
  //MoP Classic has no PvP item level - its switch is hidden - so it never counts as PvP mode
  const pvp = getFlavor() == "retail" && ilvlMode == "pvp";
  const specParam = Number(params.get("spec")) || undefined;
  const setParam = (key: string, value: string | undefined) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value == undefined) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true }
    );
  const qs = params.toString() ? `?${params}` : "";
  const left = useCharacter(region, server, characterName);
  const right = useCharacter(region2, server2, characterName2);
  const [showUnchanged, setShowUnchanged] = useState(false);
  //unchanged runs the user has opened individually, keyed by their first slot
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const leftClass = left.summary?.character_class;
  const rightClass = right.summary?.character_class;
  const bothLoaded = left.status == "loaded" && right.status == "loaded";
  const classMismatch = bothLoaded && leftClass?.id != rightClass?.id;

  const diff = useMemo<EquipmentDiff | undefined>(
    () =>
      bothLoaded && !classMismatch
        ? diffEquipment(
            left.equipment,
            right.equipment,
            //PvE item levels are the items' own, which is what an empty map falls back to
            pvp ? new Map([...(left.pvpLevels ?? []), ...(right.pvpLevels ?? [])]) : new Map()
          )
        : undefined,
    [bothLoaded, classMismatch, left.equipment, right.equipment, left.pvpLevels, right.pvpLevels, pvp]
  );

  useEffect(() => {
    $WowheadPower.refreshLinks();
  });

  const leftPath = `/compare/${region}/${server}/${characterName}`;

  return (
    <div className="compare-page">
      <div className="compare-headers">
        {getCharacterCard(left, region, server, characterName, "left")}
        <div className="compare-swap">
          <IconButton
            variant="soft"
            color="gray"
            title="Swap sides"
            disabled={!region2}
            onClick={() => navigate(`/compare/${region2}/${server2}/${characterName2}/${region}/${server}/${characterName}${qs}`)}
          >
            <LoopIcon />
          </IconButton>
        </div>
        {region2 ? (
          getCharacterCard(right, region2, server2, characterName2, "right")
        ) : (
          <Card className="compare-char-card border-card">
            <Text size="2" color="gray" className="block mb-2">
              Compare with another {leftClass?.name ?? "character"}
            </Text>
            <div className={left.status == "loaded" ? "" : "div-disabled"}>
              <CompareSearch
                classId={leftClass?.id}
                className={leftClass?.name}
                excludeId={left.summary?.id}
                onPick={(r, s, n) => navigate(`${leftPath}/${r}/${s}/${n}${qs}`)}
              />
            </div>
          </Card>
        )}
      </div>

      {classMismatch && (
        <Callout.Root color="red" className="mb-3">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text className="text-white txt-shadow">
            {left.summary?.name} is a {leftClass?.name} and {right.summary?.name} is a {rightClass?.name}. Only characters of
            the same class can be compared.
          </Callout.Text>
        </Callout.Root>
      )}

      {region2 && !classMismatch && left.status != "notFound" && right.status != "notFound" && (
        <div className="compare-tabs">
          <SegmentedControl.Root value={tab} onValueChange={(v) => setParam("tab", v == "equipment" ? undefined : v)}>
            <SegmentedControl.Item value="equipment">Equipment</SegmentedControl.Item>
            <SegmentedControl.Item value="talents">Talents</SegmentedControl.Item>
            {glyphsTab && <SegmentedControl.Item value="glyphs">Glyphs</SegmentedControl.Item>}
            {statsTab && <SegmentedControl.Item value="stats">Stats</SegmentedControl.Item>}
          </SegmentedControl.Root>
        </div>
      )}

      {tab == "talents" && bothLoaded && !classMismatch && (
        <CompareTalents
          left={{ region: region!, server: server!, name: characterName!, className: leftClass?.name, displayName: left.summary?.name }}
          right={{ region: region2!, server: server2!, name: characterName2!, className: rightClass?.name, displayName: right.summary?.name }}
          specId={specParam}
          onSpecChange={(id) => setParam("spec", String(id))}
        />
      )}
      {tab == "glyphs" && bothLoaded && !classMismatch && (
        <CompareGlyphs
          left={{ region: region!, server: server!, name: characterName!, className: leftClass?.name, displayName: left.summary?.name }}
          right={{ region: region2!, server: server2!, name: characterName2!, className: rightClass?.name, displayName: right.summary?.name }}
          specId={specParam}
          onSpecChange={(id) => setParam("spec", String(id))}
        />
      )}
      {tab == "stats" && bothLoaded && !classMismatch && (
        <CompareStats
          left={{ region: region!, server: server!, name: characterName!, displayName: left.summary?.name }}
          right={{ region: region2!, server: server2!, name: characterName2!, displayName: right.summary?.name }}
          leftItemLevel={averageItemLevel(left)}
          rightItemLevel={averageItemLevel(right)}
          leftEquipment={left.equipment}
          rightEquipment={right.equipment}
          leftPvpLevels={left.pvpLevels}
          rightPvpLevels={right.pvpLevels}
        />
      )}
      {(tab == "talents" || tab == "glyphs" || tab == "stats") && region2 && !bothLoaded && left.status != "notFound" && right.status != "notFound" && (
        <Card className="compare-diff border-card p-4">
          <Skeleton width="100%" height="320px" />
        </Card>
      )}

      {tab == "equipment" && region2 && !classMismatch && left.status != "notFound" && right.status != "notFound" && (
        <Card className="compare-diff border-card">
          <div className="diff-toolbar">
            {diff ? (
              <Text size="2">
                <b>{diff.changedSlots}</b> of {diff.slots.length} slots differ
                <span className="diff-stat">{diff.itemChanges} items</span>
                <span className="diff-stat">{diff.enchantChanges} enchants</span>
                <span className="diff-stat">{diff.gemChanges} gems</span>
                {(diff.leftEmbellished > 0 || diff.rightEmbellished > 0) && (
                  <span className="diff-stat">{diff.embellishmentChanges} embellishments</span>
                )}
              </Text>
            ) : (
              <Skeleton width="280px" height="16px" />
            )}
            <div className="grow" />
            <ItemLevelToggle />
            <Text as="label" size="2" className="flex items-center gap-2">
              <Switch size="1" color="gray" checked={showUnchanged} onCheckedChange={setShowUnchanged} />
              Show unchanged
            </Text>
          </div>
          {diff ? getDiffRows(diff) : getSkeletonRows()}
        </Card>
      )}
    </div>
  );

  //the character's average item level, in whichever mode the page is set to; PvE is Blizzard's own
  //equipped item level, the number the game's character sheet shows
  function averageItemLevel(data: CharacterData): number | undefined {
    if (data.status != "loaded") return undefined;
    return pvp ? averagePvpItemLevel(data.equipment, data.pvpLevels ?? new Map()) : data.summary?.equipped_item_level;
  }

  function getCharacterCard(
    data: CharacterData,
    r: string | undefined,
    s: string | undefined,
    n: string | undefined,
    side: "left" | "right"
  ) {
    const summary = data.summary;
    const className = summary?.character_class?.name;
    const spec = summary?.active_spec?.name;
    return (
      <Card className={`compare-char-card border-card compare-char-${side}`}>
        <div className="flex items-center">
          <span className={`diff-marker-badge ${side == "left" ? "del" : "add"}`}>{side == "left" ? "−" : "+"}</span>
          {data.status == "loaded" && summary ? (
            <>
              <img
                src={`/ProfileClassIcons/${className?.toLowerCase().replace(" ", "")}.png`}
                height="34px"
                width="34px"
                className="m-1"
              />
              <img
                src={spec ? `/Specs/${spec.toLowerCase()}_${className?.toLowerCase()}.png` : `/unknown.png`}
                height="34px"
                width="34px"
                className="my-1"
              />
              <div className="pl-2 flex flex-col justify-center min-w-0">
                <Link to={`/profile/${r}/${s}/${n}`}>
                  <Heading size="3" className="truncate" style={{ color: ClassColor.get(className ?? "") }}>
                    {summary.name} - {summary.realm?.name ?? realmDisplayName(s)}
                  </Heading>
                </Link>
                <Text size="1" color="gray">
                  {averageItemLevel(data)} {pvp ? "PvP item level" : "item level"} · {r?.toUpperCase()}
                </Text>
              </div>
            </>
          ) : data.status == "notFound" ? (
            <Text size="2" color="red" className="pl-2">
              {n}-{realmDisplayName(s)} not found
            </Text>
          ) : (
            <div className="flex flex-col m-1 pl-1">
              <Skeleton height="15px" width="200px" />
              <Skeleton className="mt-1.5" height="12px" width="110px" />
            </div>
          )}
          <div className="grow" />
          {side == "right" && (
            <IconButton variant="ghost" color="gray" size="1" title="Compare with someone else" onClick={() => navigate(leftPath)}>
              <Cross2Icon />
            </IconButton>
          )}
        </div>
      </Card>
    );
  }

  //Changed slots are always shown. Runs of unchanged slots collapse into one bar, the way a
  //GitHub diff folds the unchanged lines between hunks, unless "Show unchanged" is on.
  function getDiffRows(d: EquipmentDiff) {
    const rows: React.ReactElement[] = [];
    let run: SlotDiff[] = [];
    const flush = () => {
      if (run.length == 0) return;
      const key = run[0].slot;
      if (showUnchanged || expanded.has(key)) {
        run.forEach((s) => rows.push(getDiffRow(s)));
      } else {
        rows.push(
          <button
            key={"fold" + key}
            className="diff-fold"
            onClick={() => setExpanded((prev) => new Set(prev).add(key))}
          >
            ⋯ {run.length} unchanged {run.length == 1 ? "slot" : "slots"}: {run.map((s) => s.label).join(", ")}
          </button>
        );
      }
      run = [];
    };
    for (const s of d.slots) {
      if (s.changed) {
        flush();
        rows.push(getDiffRow(s));
      } else {
        run.push(s);
      }
    }
    flush();
    if (d.changedSlots == 0) {
      rows.unshift(
        <div key="identical" className="diff-identical">
          Equipment is identical
        </div>
      );
    }
    return rows;
  }

  function getDiffRow(s: SlotDiff) {
    return (
      <div key={s.slot} className={s.changed ? "diff-row changed" : "diff-row"}>
        <div className="diff-slot">{s.label}</div>
        {getDiffCell(s, s.left, "del")}
        {getDiffCell(s, s.right, "add")}
      </div>
    );
  }

  function getDiffCell(s: SlotDiff, side: SideDiff, kind: "del" | "add") {
    const item = side.item;
    const other = kind == "del" ? s.right : s.left;
    return (
      <div className={`diff-cell ${s.changed ? kind : ""}`}>
        <span className="diff-marker">{s.changed ? (kind == "del" ? "−" : "+") : ""}</span>
        {item ? (
          <>
            <a
              key={`icon-${ilvlMode}`}
              className="diff-icon"
              href={wowheadUrl(`item=${item.item?.id}`)}
              rel={itemTooltipParams(item, side.ilvl)}
              data-db-stats={secondaryStatsAttr(item)}
            ></a>
            <div className="diff-details">
              <div className="diff-name-line">
                <a
                  key={`name-${ilvlMode}`}
                  className={`diff-item-name ${s.itemChanged ? "hl" : ""}`}
                  style={{ color: QualityColor[item.quality?.type ?? ""] }}
                  href={wowheadUrl(`item=${item.item?.id}`)}
                  data-wowhead={itemTooltipParams(item, side.ilvl)}
                  data-db-stats={secondaryStatsAttr(item)}
                >
                  {item.name}
                </a>
                {/* MoP Classic reports no item level per item, so there is none to show */}
                {item.level?.value != undefined && (
                  <span
                    className={`diff-ilvl ${s.ilvlChanged ? "hl" : ""}`}
                    title={
                      pvp
                        ? `PvP item level${side.ilvl != item.level?.value ? ` (${item.level?.value} outside PvP)` : ""}`
                        : "Item level outside PvP"
                    }
                  >
                    {side.ilvl}
                  </span>
                )}
                {kind == "add" && s.ilvlDelta != 0 && other.item?.level?.value != undefined && item.level?.value != undefined && (
                  <span className={`diff-delta ${s.ilvlDelta > 0 ? "up" : "down"}`}>
                    {s.ilvlDelta > 0 ? "+" : "−"}
                    {Math.abs(s.ilvlDelta)}
                  </span>
                )}
              </div>
              {(side.enchantName || other.enchantName) && (
                <div className={`diff-enchant ${s.enchantChanged ? "hl" : ""}`}>
                  {side.enchantName || <span className="diff-missing">No enchant</span>}
                </div>
              )}
              {/* the embellishment, after the enchant like the game's tooltip lists it */}
              {(side.embellishments.length > 0 || other.embellishments.length > 0) && (
                <div className={`diff-embellish ${s.embellishmentChanged ? "hl" : ""}`}>
                  {side.embellishments.length > 0 ? (
                    side.embellishments.map((e) => (
                      <a key={e.spellId} href={wowheadUrl(`spell=${e.spellId}`)} data-wh-rename-link="false">
                        {e.name}
                      </a>
                    ))
                  ) : (
                    <span className="diff-missing">No embellishment</span>
                  )}
                </div>
              )}
              {side.gems.length > 0 && (
                <div className="diff-gems">
                  {side.gems.map((g, i) =>
                    g.itemId != undefined ? (
                      <a
                        key={i}
                        className={`gem-icon ${g.changed ? "gem-hl" : ""}`}
                        href={wowheadUrl(`item=${g.itemId}`)}
                        data-wowhead={`item=${g.itemId}`}
                      ></a>
                    ) : (
                      <span key={i} className={`gem-empty ${g.changed ? "gem-hl" : ""}`} title={g.empty}></span>
                    )
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <span className="diff-missing diff-empty-slot">Empty</span>
        )}
      </div>
    );
  }

  function getSkeletonRows() {
    return Array.from({ length: 8 }, (_, i) => (
      <div key={"sk" + i} className="diff-row">
        <div className="diff-slot">
          <Skeleton width="50px" height="12px" />
        </div>
        {[0, 1].map((c) => (
          <div key={c} className="diff-cell">
            <span className="diff-marker" />
            <Skeleton width="36px" height="36px" />
            <div className="diff-details">
              <Skeleton width="180px" height="14px" />
              <Skeleton className="mt-1" width="110px" height="11px" />
            </div>
          </div>
        ))}
      </div>
    ));
  }
};

export default ProfileCompare;
