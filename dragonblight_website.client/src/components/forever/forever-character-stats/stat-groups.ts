import type { Dragonblight } from "../../../clients/Dragonblight";

export interface StatRow {
  label: string;
  value: string;
  boosted?: boolean;
}

export function statNumber(value: number | null | undefined, decimals = 0, suffix = ""): string {
  return value != null && Number.isFinite(value)
    ? value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix
    : "—";
}

function damageRange(min?: number, max?: number): string {
  return min == null || max == null ? "—" : `${statNumber(min)} – ${statNumber(max)}`;
}

export function statGroups(stats: Dragonblight.ForeverCharacterStatistics) {
  const row = (label: string, value: number | undefined, decimals = 0, suffix = ""): StatRow => (
    { label, value: statNumber(value, decimals, suffix) }
  );
  const primary = (label: string, value: Dragonblight.PrimaryStatistic | undefined): StatRow => ({
    label, value: statNumber(value?.effective),
    boosted: value?.effective != null && value?.base != null && value.effective > value.base,
  });
  const percent = (label: string, value: Dragonblight.RatingStatistic | undefined) => row(label, value?.value, 2, "%");
  return [
    { title: "General", rows: [
      row("Health", stats.health),
      row(stats.power_type?.name ?? "Power", stats.power),
      row("Movement speed", stats.movement_speed, 0, "%"),
    ] },
    { title: "Attributes", rows: [
      primary("Strength", stats.strength), primary("Agility", stats.agility),
      primary("Stamina", stats.stamina), primary("Intellect", stats.intellect), primary("Spirit", stats.spirit),
    ] },
    { title: "Defense", rows: [
      primary("Armor", stats.armor), primary("Defense", stats.defense),
      percent("Dodge", stats.dodge), percent("Parry", stats.parry), percent("Block", stats.block),
    ] },
    { title: "Melee", collapsible: true, rows: [
      { label: "Damage", value: damageRange(stats.main_hand_damage_min, stats.main_hand_damage_max) },
      row("DPS", stats.main_hand_dps, 1), row("Attack speed", stats.main_hand_speed, 2, "s"),
      row("Attack power", stats.attack_power), percent("Hit bonus", stats.melee_hit), percent("Crit chance", stats.melee_crit),
    ] },
    { title: "Ranged", collapsible: true, rows: [
      { label: "Damage", value: damageRange(stats.ranged_damage_min, stats.ranged_damage_max) },
      row("Attack power", stats.ranged_attack_power), percent("Hit bonus", stats.ranged_hit), percent("Crit chance", stats.ranged_crit),
    ] },
    { title: "Spell", collapsible: true, rows: [
      row("Spell power", stats.spell_power), row("Healing", stats.spell_healing),
      percent("Hit bonus", stats.spell_hit), percent("Crit chance", stats.spell_crit),
      row("Penetration", stats.spell_penetration), row("Mana regen", stats.mana_regen, 1),
      row("Combat regen", stats.mana_regen_combat, 1),
    ] },
    { title: "Resistances", collapsible: true, rows: [
      primary("Fire", stats.fire_resistance), primary("Frost", stats.frost_resistance),
      primary("Nature", stats.nature_resistance), primary("Shadow", stats.shadow_resistance), primary("Arcane", stats.arcane_resistance),
    ] },
  ];
}
