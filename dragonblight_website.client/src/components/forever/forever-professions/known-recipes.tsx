import { useEffect, useId, useState } from "react";
import { Badge, Button, Callout, Flex, Link, Skeleton, Table, Text, TextField } from "@radix-ui/themes";
import { ChevronDownIcon, ExternalLinkIcon, InfoCircledIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Dragonblight } from "../../../clients/Dragonblight";
import { wowheadUrl } from "../../../helpers/game-flavor";
import { stripWowMarkup } from "../../../helpers/equipmentHelper";
import { craftedQuantityText, filterKnownRecipes, recipeOutputs, recipeWowheadTarget } from "./recipe-helpers";

const pageSize = 10;
declare const $WowheadPower: { refreshLinks: () => void } | undefined;

type RecipeResult = { key: string; rows?: Dragonblight.ForeverRecipeDetails[]; error?: boolean };

function RecipePage({ recipes, region, label }: { recipes: Dragonblight.RecipeReference[]; region: string; label: string }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<RecipeResult>();
  const ids = recipes.map((recipe) => recipe.id).join(",");
  const requestKey = `${region}/${ids}/${attempt}`;
  const current = result?.key === requestKey ? result : undefined;
  const loading = ids !== "" && !current;

  useEffect(() => {
    if (!ids) return;
    let cancelled = false;
    new Dragonblight.ForeverCharacterClient().getRecipes(region, ids.split(",").map(Number))
      .then((rows) => { if (!cancelled) setResult({ key: requestKey, rows }); })
      .catch(() => { if (!cancelled) setResult({ key: requestKey, error: true }); });
    return () => { cancelled = true; };
  }, [region, ids, requestKey]);

  useEffect(() => {
    if (current?.rows && typeof $WowheadPower !== "undefined") $WowheadPower.refreshLinks();
  }, [current?.rows]);

  const details = new Map((current?.rows ?? []).map((row) => [row.id, row]));
  const missing = !!current && !current.error && recipes.some((recipe) => !details.get(recipe.id)?.recipe);

  return (
    <>
      {(current?.error || missing) && (
        <Callout.Root size="1" color="amber" className="recipe-notice">
          <Callout.Icon><InfoCircledIcon /></Callout.Icon>
          <Callout.Text>
            {current?.error ? "Couldn't load recipe details. Known recipe names are still shown." : "Blizzard hasn't supplied details for some recipes. Names and Wowhead searches are still available."}
            <Button size="1" variant="ghost" ml="2" onClick={() => setAttempt((value) => value + 1)}>Retry details</Button>
          </Callout.Text>
        </Callout.Root>
      )}
      <div className="recipe-table-scroll" aria-busy={loading}>
        <Table.Root variant="surface" size="1" className="recipe-table" aria-label={`${label} known recipes`}>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Recipe</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Creates</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Reagents</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Wowhead</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {recipes.map((reference) => {
              const detail = details.get(reference.id);
              const recipe = detail?.recipe;
              const name = recipe?.name ?? reference.name ?? `Recipe ${reference.id}`;
              const outputs = recipeOutputs(recipe);
              const quantity = craftedQuantityText(recipe?.crafted_quantity);
              const reagents = recipe?.reagents ?? [];
              const wowhead = wowheadUrl(recipeWowheadTarget(recipe, name), "forever");
              return (
                <Table.Row key={reference.id} align="start">
                  <Table.RowHeaderCell>
                    <Flex gap="2" align="start">
                      <Skeleton loading={loading}>
                        <img className="recipe-icon" src={detail?.icon ?? "/unknown.png"} alt="" loading="lazy" onError={(event) => {
                          if (!event.currentTarget.src.endsWith("/unknown.png")) event.currentTarget.src = "/unknown.png";
                        }} />
                      </Skeleton>
                      <div className="recipe-name">
                        <Text as="div" size="2" weight="medium">{name}</Text>
                        {recipe?.description && <Text as="p" size="1" color="gray" className="recipe-description">{stripWowMarkup(recipe.description)}</Text>}
                        <Text as="div" size="1" color="gray">Recipe #{reference.id}</Text>
                      </div>
                    </Flex>
                  </Table.RowHeaderCell>
                  <Table.Cell>
                    {loading ? <Skeleton width="100px" height="16px" /> : outputs.length > 0 ? (
                      <Flex direction="column" gap="1">
                        {outputs.map(({ item, faction }) => (
                          <Flex key={`${item.id}/${faction ?? ""}`} align="center" gap="1" wrap="wrap">
                            <Link className="recipe-item-link" data-wh-icon-size="small" href={wowheadUrl(`item=${item.id}`, "forever")} target="_blank" rel="noopener noreferrer">{item.name ?? `Item ${item.id}`}</Link>
                            <Text size="1" color="gray">{faction && ` (${faction})`}{quantity !== "—" && ` · ×${quantity}`}</Text>
                          </Flex>
                        ))}
                      </Flex>
                    ) : <Text size="1" color="gray">{recipe ? "No item reported" : "Details unavailable"}</Text>}
                  </Table.Cell>
                  <Table.Cell>
                    {loading ? <Skeleton width="120px" height="16px" /> : reagents.length > 0 ? (
                      <Flex gap="2" wrap="wrap">
                        {reagents.map((reagent, index) => reagent.reagent && (
                          <Link key={`${reagent.reagent.id}/${index}`} className="recipe-item-link" data-wh-icon-size="small" size="1" href={wowheadUrl(`item=${reagent.reagent.id}`, "forever")} target="_blank" rel="noopener noreferrer">
                            {reagent.quantity}× {reagent.reagent.name ?? `Item ${reagent.reagent.id}`}
                          </Link>
                        ))}
                      </Flex>
                    ) : <Text size="1" color="gray">{recipe ? "None reported" : "Details unavailable"}</Text>}
                  </Table.Cell>
                  <Table.Cell>
                    <Link className="recipe-wowhead-link" data-wh-iconize-link="false" href={wowhead} target="_blank" rel="noopener noreferrer" aria-label={`${outputs.length > 0 ? "View" : "Search for"} ${name} on Wowhead`}>
                      <Flex as="span" align="center" gap="1">{outputs.length > 0 ? "View item" : "Search"}<ExternalLinkIcon /></Flex>
                    </Link>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </div>
      {loading && <Text as="p" size="1" color="gray" role="status">Loading recipe details…</Text>}
    </>
  );
}

export default function KnownRecipes({ recipes, region, label }: { recipes: Dragonblight.RecipeReference[]; region: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const contentId = useId();
  const total = new Set(recipes.map((recipe) => recipe.id)).size;
  const filtered = filterKnownRecipes(recipes, query);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * pageSize;
  const shown = filtered.slice(start, start + pageSize);

  return (
    <div className="profession-recipes">
      <Button size="2" variant="soft" color="gray" aria-expanded={open} aria-controls={contentId} onClick={() => setOpen((value) => !value)}>
        <ChevronDownIcon className={`recipe-chevron ${open ? "recipe-chevron-open" : ""}`} /> Known recipes <Badge color="gray">{total}</Badge>
      </Button>
      {open && (
        <div id={contentId} className="recipe-content">
          <TextField.Root size="2" placeholder="Search known recipes…" aria-label={`Search ${label} recipes`} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }}>
            <TextField.Slot><MagnifyingGlassIcon /></TextField.Slot>
          </TextField.Root>
          {shown.length === 0 ? <Text as="p" size="2" color="gray" role="status">No recipes match your search.</Text> : (
            <RecipePage recipes={shown} region={region} label={label} />
          )}
          <Flex justify="between" align="center" gap="2" wrap="wrap">
            <Text size="1" color="gray">{filtered.length === 0 ? "0 recipes" : `${start + 1}–${Math.min(start + pageSize, filtered.length)} of ${filtered.length} recipes`}</Text>
            <Flex gap="2" align="center">
              <Button size="1" variant="soft" color="gray" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Previous</Button>
              <Text size="1" color="gray">{currentPage} / {pages}</Text>
              <Button size="1" variant="soft" color="gray" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>Next</Button>
            </Flex>
          </Flex>
        </div>
      )}
    </div>
  );
}
