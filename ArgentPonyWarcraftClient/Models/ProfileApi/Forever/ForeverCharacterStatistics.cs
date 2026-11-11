namespace ArgentPonyWarcraftClient;

//Only the character-sheet fields used by Forever. Nullable scalars distinguish missing
//data from genuine zeroes; Classic-specific fields are not in the Retail summary model.
public record ForeverCharacterStatistics
{
    [JsonPropertyName("health")]
    public int? Health { get; init; }
    [JsonPropertyName("power")]
    public int? Power { get; init; }
    [JsonPropertyName("power_type")]
    public PowerTypeReference? PowerType { get; init; }
    [JsonPropertyName("movement_speed")]
    public float? MovementSpeed { get; init; }
    [JsonPropertyName("strength")]
    public PrimaryStatistic? Strength { get; init; }
    [JsonPropertyName("agility")]
    public PrimaryStatistic? Agility { get; init; }
    [JsonPropertyName("stamina")]
    public PrimaryStatistic? Stamina { get; init; }
    [JsonPropertyName("intellect")]
    public PrimaryStatistic? Intellect { get; init; }
    [JsonPropertyName("spirit")]
    public PrimaryStatistic? Spirit { get; init; }
    [JsonPropertyName("attack_power")]
    public int? AttackPower { get; init; }
    [JsonPropertyName("main_hand_damage_min")]
    public float? MainHandDamageMin { get; init; }
    [JsonPropertyName("main_hand_damage_max")]
    public float? MainHandDamageMax { get; init; }
    [JsonPropertyName("main_hand_speed")]
    public float? MainHandSpeed { get; init; }
    [JsonPropertyName("main_hand_dps")]
    public float? MainHandDps { get; init; }
    [JsonPropertyName("melee_hit")]
    public RatingStatistic? MeleeHit { get; init; }
    [JsonPropertyName("melee_crit")]
    public RatingStatistic? MeleeCrit { get; init; }
    [JsonPropertyName("ranged_attack_power")]
    public int? RangedAttackPower { get; init; }
    [JsonPropertyName("ranged_damage_min")]
    public float? RangedDamageMin { get; init; }
    [JsonPropertyName("ranged_damage_max")]
    public float? RangedDamageMax { get; init; }
    [JsonPropertyName("ranged_hit")]
    public RatingStatistic? RangedHit { get; init; }
    [JsonPropertyName("ranged_crit")]
    public RatingStatistic? RangedCrit { get; init; }
    [JsonPropertyName("spell_power")]
    public int? SpellPower { get; init; }
    [JsonPropertyName("spell_healing")]
    public int? SpellHealing { get; init; }
    [JsonPropertyName("spell_penetration")]
    public int? SpellPenetration { get; init; }
    [JsonPropertyName("spell_hit")]
    public RatingStatistic? SpellHit { get; init; }
    [JsonPropertyName("spell_crit")]
    public RatingStatistic? SpellCrit { get; init; }
    [JsonPropertyName("mana_regen")]
    public float? ManaRegen { get; init; }
    [JsonPropertyName("mana_regen_combat")]
    public float? ManaRegenCombat { get; init; }
    [JsonPropertyName("armor")]
    public PrimaryStatistic? Armor { get; init; }
    [JsonPropertyName("defense")]
    public PrimaryStatistic? Defense { get; init; }
    [JsonPropertyName("dodge")]
    public RatingStatistic? Dodge { get; init; }
    [JsonPropertyName("parry")]
    public RatingStatistic? Parry { get; init; }
    [JsonPropertyName("block")]
    public RatingStatistic? Block { get; init; }
    [JsonPropertyName("fire_resistance")]
    public PrimaryStatistic? FireResistance { get; init; }
    [JsonPropertyName("frost_resistance")]
    public PrimaryStatistic? FrostResistance { get; init; }
    [JsonPropertyName("nature_resistance")]
    public PrimaryStatistic? NatureResistance { get; init; }
    [JsonPropertyName("shadow_resistance")]
    public PrimaryStatistic? ShadowResistance { get; init; }
    [JsonPropertyName("arcane_resistance")]
    public PrimaryStatistic? ArcaneResistance { get; init; }
}
