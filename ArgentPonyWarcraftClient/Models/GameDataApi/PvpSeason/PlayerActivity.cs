namespace ArgentPonyWarcraftClient;

/// <summary>
/// An entry in a PvP leaderboard.
/// </summary>
public record PlayerActivity
{

    [JsonPropertyName("OldPlayer")]
    public PvpLeaderboardEntryandTime OldPlayer { get; init; }

     [JsonPropertyName("NewPlayer")]
    public PvpLeaderboardEntryandTime NewPlayer { get; init; }
    
    [JsonPropertyName("Spec")]
    public string Spec { get; set; }

}
