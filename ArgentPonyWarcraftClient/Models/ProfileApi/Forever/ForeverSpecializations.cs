namespace ArgentPonyWarcraftClient;

/// <summary>
/// A WoW: Forever character's talents. Forever uses classic talent trees: each group lists
/// the trees the character has points in, and the group in use is marked active.
/// </summary>
public record ForeverSpecializations
{
    /// <summary>
    /// Gets the character's talent groups (a second group is a dual spec).
    /// </summary>
    [JsonPropertyName("specialization_groups")]
    public ForeverSpecializationGroup[] SpecializationGroups { get; init; }
}

/// <summary>
/// One of a WoW: Forever character's talent groups.
/// </summary>
public record ForeverSpecializationGroup
{
    /// <summary>
    /// Gets whether this is the group the character is using.
    /// </summary>
    [JsonPropertyName("is_active")]
    public bool IsActive { get; init; }

    /// <summary>
    /// Gets the talent trees with points in them.
    /// </summary>
    [JsonPropertyName("specializations")]
    public ForeverTalentTree[] Specializations { get; init; }
}

/// <summary>
/// A talent tree and the talents taken in it.
/// </summary>
public record ForeverTalentTree
{
    /// <summary>
    /// Gets the tree, e.g. Marksmanship.
    /// </summary>
    [JsonPropertyName("specialization")]
    public PlayableSpecializationReference Specialization { get; init; }

    /// <summary>
    /// Gets the talents taken in the tree.
    /// </summary>
    [JsonPropertyName("talents")]
    public ForeverTalentRank[] Talents { get; init; }
}

/// <summary>
/// A talent and the points in it.
/// </summary>
public record ForeverTalentRank
{
    /// <summary>
    /// Gets the talent; its id matches the talents in the class's talent tree.
    /// </summary>
    [JsonPropertyName("talent")]
    public TalentReference Talent { get; init; }

    /// <summary>
    /// Gets the number of points in the talent.
    /// </summary>
    [JsonPropertyName("talent_rank")]
    public int TalentRank { get; init; }
}
