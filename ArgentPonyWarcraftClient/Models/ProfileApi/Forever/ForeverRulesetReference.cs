namespace ArgentPonyWarcraftClient;

/// <summary>
/// A reference to a WoW: Forever ruleset, which takes the place of a realm.
/// </summary>
public record ForeverRulesetReference
{
    /// <summary>
    /// Gets the key for the ruleset.
    /// </summary>
    [JsonPropertyName("key")]
    public Self Key { get; init; }

    /// <summary>
    /// Gets the name of the ruleset.
    /// </summary>
    [JsonPropertyName("name")]
    public string Name { get; init; }

    /// <summary>
    /// Gets the ID of the ruleset.
    /// </summary>
    [JsonPropertyName("id")]
    public int Id { get; init; }
}
