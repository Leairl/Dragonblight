namespace ArgentPonyWarcraftClient;

/// <summary>
/// PvP bracket statistics for a character.
/// </summary>
public record CharacterPvpBracketStatistics
{
    /// <summary>
    /// Gets links for the PvP bracket statistics for the character.
    /// </summary>
    [JsonPropertyName("_links")]
    public Links Links { get; init; }

    /// <summary>
    /// Gets a reference to the character.
    /// </summary>
    [JsonPropertyName("character")]
    public CharacterReference Character { get; init; }

    /// <summary>
    /// Gets the faction.
    /// </summary>
    [JsonPropertyName("faction")]
    public EnumType Faction { get; init; }

    /// <summary>
    /// Gets the PvP bracket.
    /// </summary>
    [JsonPropertyName("bracket")]
    public Bracket Bracket { get; init; }

    /// <summary>
    /// Gets the character's rating in this PvP bracket.
    /// </summary>
    [JsonPropertyName("rating")]
    public int Rating { get; init; }

    /// <summary>
    /// Gets a reference to the PvP season.
    /// </summary>
    [JsonPropertyName("season")]
    public PvpSeasonReference Season { get; init; }

    /// <summary>
    /// Gets a reference to the PvP tier.
    /// </summary>
    [JsonPropertyName("tier")]
    public PvpTierReferenceWithoutName Tier { get; init; }

    /// <summary>
    /// Gets the PvP match statistics for the season.
    /// </summary>
    [JsonPropertyName("season_match_statistics")]
    public PvpMatchStatistics SeasonMatchStatistics { get; init; }

    /// <summary>
    /// Gets the PvP match statistics for the week.
    /// </summary>
    [JsonPropertyName("weekly_match_statistics")]
    public PvpMatchStatistics WeeklyMatchStatistics { get; init; }
    /// <summary>
    /// Gets the specialization this rating is for. Only Solo Shuffle and Blitz have one, since they keep
    /// a separate rating per specialization; null for every other bracket.
    /// </summary>
    [JsonPropertyName("specialization")]
    public PlayableSpecializationReference Specialization { get; init; }
    
    /// <summary>
    /// Gets the PvP round statistics for the season.
    /// </summary>
    [JsonPropertyName("season_round_statistics")]
    public PvpMatchStatistics SeasonRoundStatistics { get; init; }

}
