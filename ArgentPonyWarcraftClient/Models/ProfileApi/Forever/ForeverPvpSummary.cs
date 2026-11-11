namespace ArgentPonyWarcraftClient;

//Forever reports a Classic PvP rank, not Retail's honor level or arena brackets.
public record ForeverPvpSummary
{
    [JsonPropertyName("honorable_kills")]
    public int? HonorableKills { get; init; }

    [JsonPropertyName("pvp_rank")]
    public int? PvpRank { get; init; }

    [JsonPropertyName("pvp_map_statistics")]
    public PvpMapStatistic[]? PvpMapStatistics { get; init; }
}
