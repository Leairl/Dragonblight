namespace ArgentPonyWarcraftClient;

/// <summary>
/// A WoW: Forever guild. Forever guilds have no realm: they are addressed by slug alone
/// and belong to a ruleset.
/// </summary>
public record ForeverGuild
{
    /// <summary>
    /// Gets the ID of the guild.
    /// </summary>
    [JsonPropertyName("id")]
    public int Id { get; init; }

    /// <summary>
    /// Gets the name of the guild.
    /// </summary>
    [JsonPropertyName("name")]
    public string Name { get; init; }

    /// <summary>
    /// Gets the guild's slug, e.g. "the-hidden-king".
    /// </summary>
    [JsonPropertyName("slug")]
    public string Slug { get; init; }

    /// <summary>
    /// Gets the guild's faction.
    /// </summary>
    [JsonPropertyName("faction")]
    public EnumType Faction { get; init; }

    /// <summary>
    /// Gets the ruleset the guild plays under. Not included in the guild inside a roster.
    /// </summary>
    [JsonPropertyName("ruleset")]
    public ForeverRulesetReference Ruleset { get; init; }

    /// <summary>
    /// Gets the number of members in the guild.
    /// </summary>
    [JsonPropertyName("member_count")]
    public int MemberCount { get; init; }
}

/// <summary>
/// The members of a WoW: Forever guild.
/// </summary>
public record ForeverGuildRoster
{
    /// <summary>
    /// Gets the guild the roster belongs to.
    /// </summary>
    [JsonPropertyName("guild")]
    public ForeverGuild Guild { get; init; }

    /// <summary>
    /// Gets the guild's members.
    /// </summary>
    [JsonPropertyName("members")]
    public ForeverGuildMember[] Members { get; init; }
}

/// <summary>
/// A member of a WoW: Forever guild.
/// </summary>
public record ForeverGuildMember
{
    /// <summary>
    /// Gets the member's character.
    /// </summary>
    [JsonPropertyName("character")]
    public ForeverRosterCharacter Character { get; init; }

    /// <summary>
    /// Gets the member's guild rank, 0 being the guild master.
    /// </summary>
    [JsonPropertyName("rank")]
    public int Rank { get; init; }
}

/// <summary>
/// A character as a WoW: Forever guild roster lists it. The class and race carry only
/// their ids.
/// </summary>
public record ForeverRosterCharacter
{
    /// <summary>
    /// Gets the ID of the character.
    /// </summary>
    [JsonPropertyName("id")]
    public int Id { get; init; }

    /// <summary>
    /// Gets the character's name.
    /// </summary>
    [JsonPropertyName("name")]
    public string Name { get; init; }

    /// <summary>
    /// Gets the character's surname.
    /// </summary>
    [JsonPropertyName("surname")]
    public string Surname { get; init; }

    /// <summary>
    /// Gets the character's "name-surname" slug.
    /// </summary>
    [JsonPropertyName("slug")]
    public string Slug { get; init; }

    /// <summary>
    /// Gets the character's level.
    /// </summary>
    [JsonPropertyName("level")]
    public int Level { get; init; }

    /// <summary>
    /// Gets the character's class.
    /// </summary>
    [JsonPropertyName("playable_class")]
    public PlayableClassReference PlayableClass { get; init; }

    /// <summary>
    /// Gets the character's race.
    /// </summary>
    [JsonPropertyName("playable_race")]
    public PlayableRaceReference PlayableRace { get; init; }

    /// <summary>
    /// Gets the character's faction.
    /// </summary>
    [JsonPropertyName("faction")]
    public EnumType Faction { get; init; }
}
