namespace ArgentPonyWarcraftClient;

/// <summary>
/// A WoW: Forever character. Forever has no realms: a character is identified by its
/// name and surname, and belongs to a ruleset instead of a realm.
/// The API is undocumented; these fields are the ones it returned in November 2026.
/// </summary>
public record ForeverCharacterProfile : CharacterProfileSummary
{
    /// <summary>
    /// Gets the surname of the character.
    /// </summary>
    [JsonPropertyName("surname")]
    public string Surname { get; init; }

    /// <summary>
    /// Gets the ruleset the character plays under (PvP, Normal, Roleplay or Roleplay PvP).
    /// </summary>
    [JsonPropertyName("ruleset")]
    public ForeverRulesetReference Ruleset { get; init; }

    /// <summary>
    /// Gets the character's full name as shown in game, e.g. "Joe Gun".
    /// </summary>
    [JsonPropertyName("name_search")]
    public string NameSearch { get; init; }
}
