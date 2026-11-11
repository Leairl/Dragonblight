import { FC } from "react";
import { useParams } from "react-router";
import { Button, Card, Progress, Skeleton } from "@radix-ui/themes";
import { Dragonblight } from "../../../clients/Dragonblight";
import ProfessionRecipes from "./known-recipes";
import { useForeverTab } from "../forever-data";
import "./forever-professions.css";

function SkillProgress({ name, points, maximum }: { name: string; points?: number; maximum?: number }) {
  if (points == null || maximum == null || maximum <= 0) {
    return <p className="profession-muted">Skill data unavailable.</p>;
  }
  return (
    <div className="profession-skill">
      <div className="profession-skill-label"><span>Skill</span><span>{points} / {maximum}</span></div>
      <Progress
        aria-label={`${name} skill`}
        aria-valuetext={`${points} of ${maximum} skill points`}
        value={Math.max(0, Math.min(points, maximum))}
        max={maximum}
        size="2"
        mt="2"
      />
    </div>
  );
}

function ProfessionCard({ entry, region }: { entry: Dragonblight.CharacterProfession; region: string }) {
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
            {recipes.length === 0 && <p className="profession-muted">No known recipes reported.</p>}
            <ProfessionRecipes known={recipes} skill={tier.skill_points} region={region} label={tierName} professionId={entry.profession?.id} skillTierId={tier.tier?.id} />
          </div>
        );
      })}
    </Card>
  );
}

const ForeverProfessions: FC = () => {
  const { region, characterSlug } = useParams();
  const [state, retry] = useForeverTab("professions", region, characterSlug, {
    missing: "Profession data is not available for this character.",
    failed: "Unable to load professions. Please try again.",
  });

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
          <Button variant="soft" color="gray" size="1" onClick={retry}>Retry</Button>
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
                <ProfessionCard key={entry.profession?.id ?? index} entry={entry} region={region} />
              ))}</div>}
          </section>
        ))))}
    </section>
  );
};

export default ForeverProfessions;
