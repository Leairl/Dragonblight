import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Badge, Button, Callout, Card, Flex, Heading, Skeleton, Switch, Text } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Dragonblight } from "../../../clients/Dragonblight";
import { wowheadUrl } from "../../../helpers/game-flavor";
import { specDisplayName } from "../../../helpers/forever-names";
import { useForeverTab } from "../forever-data";
import "./forever-optimize.css";

declare const $WowheadPower: { refreshLinks: () => void } | undefined;

// An enchant or consumable, linked to Wowhead so it gets its icon and tooltip, with its effect under it.
function Suggestion({ entry, rank, equipped }: { entry: Dragonblight.ForeverSuggestion; rank?: number; equipped?: boolean }) {
  //Forever's enchant scrolls are PTR only, so an enchant links the enchanting spell instead
  let target = `item=${entry.id}`;
  if (entry.spellId) {
    target = `spell=${entry.spellId}`;
  }
  return (
    <div className="optimize-suggestion">
      <Flex align="center" gap="2" wrap="wrap">
        {rank === 0 && <Badge color="green" size="1">Best</Badge>}
        {equipped && <Badge color="blue" size="1">Equipped</Badge>}
        <a className="optimize-item-link" data-wh-icon-size="small" href={wowheadUrl(target, "forever")} target="_blank" rel="noopener noreferrer">
          {entry.name}
        </a>
        {entry.requiredLevel > 1 && <Text size="1" color="gray">Level {entry.requiredLevel}</Text>}
        {entry.requiredSkill != null && entry.profession && (
          <Text size="1" color="gray">{entry.profession} {entry.requiredSkill}</Text>
        )}
      </Flex>
      <Text as="p" size="1" color="gray" className="optimize-effect">{entry.effect}</Text>
    </div>
  );
}

function SlotCard({ slot }: { slot: Dragonblight.ForeverOptimizedSlot }) {
  let current = <Text size="1" color="amber">No enchant</Text>;
  if (slot.currentEnchant) {
    current = <Text size="1" color="green">{slot.currentEnchant}</Text>;
  }
  return (
    <Card className="border-card optimize-card">
      <Flex justify="between" align="baseline" gap="2" wrap="wrap">
        <Heading size="2">{slot.slotName}</Heading>
        <a className="optimize-gear-link" data-wh-icon-size="small" href={wowheadUrl(`item=${slot.itemId}`, "forever")} target="_blank" rel="noopener noreferrer">
          {slot.itemName}
        </a>
      </Flex>
      <Text as="div" size="1" mt="1">Now: {current}</Text>
      <div className="optimize-list">
        {slot.best.length === 0 && <Text as="p" size="1" color="gray">Nothing for this slot helps this spec.</Text>}
        {slot.best.map((entry, index) => (
          <Suggestion key={entry.id} entry={entry} rank={index} equipped={entry.id === slot.currentEnchantItemId} />
        ))}
      </div>
    </Card>
  );
}

function ConsumableGroup({ title, entries, empty }: { title: string; entries: Dragonblight.ForeverSuggestion[]; empty: string }) {
  return (
    <Card className="border-card optimize-card">
      <Heading size="2">{title}</Heading>
      <div className="optimize-list">
        {entries.length === 0 && <Text as="p" size="1" color="gray">{empty}</Text>}
        {entries.map((entry, index) => <Suggestion key={entry.id} entry={entry} rank={index} />)}
      </div>
    </Card>
  );
}

function OptimizeContent({ page }: { page: Dragonblight.ForeverOptimizePage }) {
  useEffect(() => {
    if (typeof $WowheadPower !== "undefined") {
      $WowheadPower.refreshLinks();
    }
  }, [page]);

  const spec = specDisplayName(page.specName);
  const restoring: Dragonblight.ForeverSuggestion[] = [];
  if (page.healingPotion) {
    restoring.push(page.healingPotion);
  }
  if (page.manaPotion) {
    restoring.push(page.manaPotion);
  }

  if (!page.hasWeights) {
    return (
      <Callout.Root color="amber">
        <Callout.Icon><InfoCircledIcon /></Callout.Icon>
        <Callout.Text>There are no stat weights for {page.className} yet, so nothing can be ranked.</Callout.Text>
      </Callout.Root>
    );
  }

  return (
    <>
      <Text as="p" size="2" color="gray" mb="1">
        For a level {page.level} {spec} {page.className}, ranked by how much each stat is worth to the spec.
      </Text>
      {page.specIsDefault && (
        <Text as="p" size="1" color="gray" mb="1">No talents are spent yet, so these assume {spec}.</Text>
      )}
      {!page.showingAll && (
        <Text as="p" size="1" color="gray" mb="4">
          Limited to what a level {page.level} crafter can make (skill {page.skillCap}) and level {page.level} can use.
        </Text>
      )}
      {page.showingAll && (
        <Text as="p" size="1" color="gray" mb="4">
          Showing everything out now, whatever skill it takes to make. Consumables are still limited to what level {page.level} can use.
        </Text>
      )}

      <Heading size="3" mb="2">Enchants</Heading>
      {page.slots.length === 0 && <Text as="p" size="2" color="gray" mb="4">No enchantable gear is equipped.</Text>}
      <div className="optimize-grid">
        {page.slots.map((slot) => <SlotCard key={slot.slot} slot={slot} />)}
      </div>

      <Heading size="3" mt="5" mb="2">Consumables</Heading>
      <div className="optimize-grid">
        <ConsumableGroup title="Elixirs" entries={page.elixirs} empty="No elixir at this level helps this spec." />
        <ConsumableGroup title="Flasks" entries={page.flasks} empty="No flask at this level helps this spec." />
        <ConsumableGroup title="Buff potions" entries={page.potions} empty="No buff potion at this level helps this spec." />
        <ConsumableGroup title="Healing and mana potions" entries={restoring} empty="No healing potion at this level." />
      </div>
    </>
  );
}

// The Optimize tab: the best enchant for each piece of gear and the best consumables for the
// character's level, ranked by their spec's stat weights.
export default function ForeverOptimize() {
  const { region, characterSlug } = useParams();
  //off: only what a crafter of the character's level could make; on: everything that's out
  const [showAll, setShowAll] = useState(false);
  let tab: "optimize" | "optimizeAll" = "optimize";
  if (showAll) {
    tab = "optimizeAll";
  }
  const [state, retry] = useForeverTab(tab, region, characterSlug, {
    missing: "Gear suggestions aren't available for this character.",
    failed: "Unable to load gear suggestions. Please try again.",
  });

  return (
    <section className="optimize-pane" aria-label="Gear optimization" aria-busy={state.status === "loading"}>
      <Flex justify="between" align="center" gap="3" wrap="wrap" mb="2">
        <Heading size="4">Optimize</Heading>
        <Text as="label" size="2">
          <Flex gap="2" align="center">
            <Switch size="1" checked={showAll} onCheckedChange={setShowAll} />
            Show everything
          </Flex>
        </Text>
      </Flex>
      {state.status === "loading" && (
        <div role="status">
          <Text as="p" size="2" color="gray" mb="3">Working out the best enchants and consumables…</Text>
          <div className="optimize-grid">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height="140px" />)}</div>
        </div>
      )}
      {state.status === "error" && (
        <Flex direction="column" align="start" gap="3" role="alert">
          <Text as="p" size="2">{state.message}</Text>
          <Button variant="soft" color="gray" size="1" onClick={retry}>Retry</Button>
        </Flex>
      )}
      {state.status === "loaded" && <OptimizeContent page={state.data} />}
    </section>
  );
}
