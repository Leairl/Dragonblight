namespace ArgentPonyWarcraftClient;

public record ForeverReputationsSummary
{
    [JsonPropertyName("reputations")]
    public ForeverReputation[]? Reputations { get; init; }
}

public record ForeverReputation
{
    [JsonPropertyName("faction")]
    public ReputationFactionReference? Faction { get; init; }
    [JsonPropertyName("standing")]
    public ForeverReputationStanding? Standing { get; init; }
}

//Missing progress is different from a reported zero, including at a standing boundary.
public record ForeverReputationStanding
{
    [JsonPropertyName("name")]
    public string? Name { get; init; }
    [JsonPropertyName("tier")]
    public int? Tier { get; init; }
    [JsonPropertyName("raw")]
    public int? Raw { get; init; }
    [JsonPropertyName("value")]
    public int? Value { get; init; }
    [JsonPropertyName("max")]
    public int? Max { get; init; }
}
