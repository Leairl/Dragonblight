import { FC, useEffect, useState } from "react";
import { useParams } from "react-router";
import { Button, Card, Skeleton } from "@radix-ui/themes";
import { Dragonblight } from "../../../clients/Dragonblight";
import "./forever-professions.css";

type ProfessionState =
  | { status: "loading" }
  | { status: "loaded"; data: Dragonblight.CharacterProfessionsSummary }
  | { status: "error"; message: string };

function SkillProgress({ name, points, maximum }: { name: string; points?: number; maximum?: number }) {
  if (points == null || maximum == null || maximum <= 0) {
    return <p className="profession-muted">Skill data unavailable.</p>;
  }
  return (
    <div className="profession-skill">
      <div className="profession-skill-label"><span>Skill</span><span>{points} / {maximum}</span></div>
      <progress aria-label={`${name} skill`} value={Math.max(0, Math.min(points, maximum))} max={maximum} />
    </div>
  );
}

function ProfessionCard({ entry }: { entry: Dragonblight.CharacterProfession }) {
  const name = entry.profession?.name ?? "Unknown profession";
  const tiers = entry.tiers ?? [];
  const hasOverallSkill = entry.skill_points != null || entry.max_skill_points != null;
  return (
    <Card className="profession-card border-card">
      <h3>{name}</h3>
      {(hasOverallSkill || tiers.length === 0) && (
        <SkillProgress name={name} points={entry.skill_points} maximum={entry.max_skill_points} />
      )}
      {tiers.map((tier, index) => {
        const tierName = tier.tier?.name ?? `${name} skill tier`;
        const recipes = [...(tier.known_recipes ?? [])].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
        return (
          <div className="profession-tier" key={tier.tier?.id ?? index}>
            <h4>{tierName}</h4>
            <SkillProgress name={tierName} points={tier.skill_points} maximum={tier.max_skill_points} />
            {recipes.length > 0 ? (
              <details className="profession-recipes">
                <summary>Known recipes ({recipes.length})</summary>
                <ul>{recipes.map((recipe) => <li key={recipe.id}>{recipe.name ?? `Recipe ${recipe.id}`}</li>)}</ul>
              </details>
            ) : <p className="profession-muted">No known recipes reported.</p>}
          </div>
        );
      })}
    </Card>
  );
}

const ForeverProfessions: FC = () => {
  const { region, characterSlug } = useParams();
  const [state, setState] = useState<ProfessionState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  //Mounted only for this tab and keyed by character in the parent, so navigation
  //starts with fresh loading state. Ignore responses after navigation or a retry.
  useEffect(() => {
    let cancelled = false;
    if (!region || !characterSlug) {
      return;
    }
    new Dragonblight.ForeverCharacterClient().getProfessions(region, characterSlug)
      .then((data) => {
        if (!cancelled) {
          setState(data
            ? { status: "loaded", data }
            : { status: "error", message: "Profession data is not available for this character." });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          //NSwag throws typed ProblemDetails for a documented 404, and ApiException otherwise.
          const status = typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
          setState({ status: "error", message: status === 404
            ? "Profession data is not available for this character."
            : "Unable to load professions. Please try again." });
        }
      });
    return () => { cancelled = true; };
  }, [region, characterSlug, attempt]);

  const primaries = state.status === "loaded" ? state.data.primaries ?? [] : [];
  const secondaries = state.status === "loaded" ? state.data.secondaries ?? [] : [];

  if (!region || !characterSlug) {
    return <p className="professions-pane">Select a character to view professions.</p>;
  }

  return (
    <section className="professions-pane" aria-label="Character professions" aria-busy={state.status === "loading"}>
      <h2>Professions</h2>
      {state.status === "loading" && (
        <div role="status">
          <p className="profession-muted">Loading professions…</p>
          <div className="professions-grid">{[0, 1].map((i) => <Skeleton key={i} height="120px" />)}</div>
        </div>
      )}
      {state.status === "error" && (
        <div className="professions-error" role="alert">
          <p>{state.message}</p>
          <Button variant="soft" color="gray" size="1" onClick={() => {
            setState({ status: "loading" });
            setAttempt((value) => value + 1);
          }}>Retry</Button>
        </div>
      )}
      {state.status === "loaded" && (primaries.length === 0 && secondaries.length === 0
        ? <p className="profession-muted" role="status">No professions reported for this character.</p>
        : ([{ title: "Primary professions", entries: primaries }, { title: "Secondary professions", entries: secondaries }].map((group) => (
          <section className="profession-group" key={group.title} aria-label={group.title}>
            <h3>{group.title}</h3>
            {group.entries.length === 0
              ? <p className="profession-muted">None reported.</p>
              : <div className="professions-grid">{group.entries.map((entry, index) => (
                <ProfessionCard key={entry.profession?.id ?? index} entry={entry} />
              ))}</div>}
          </section>
        ))))}
    </section>
  );
};

export default ForeverProfessions;
