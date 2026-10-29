
using System.Text.Json.Serialization;
using ArgentPonyWarcraftClient;

public class LadderBracket
{
    [JsonPropertyName("slug")] 
    public required string Slug { get; init; } 
    [JsonPropertyName("ladder")]
    public required string Ladder { get; init; } 
    [JsonPropertyName("className")]
    public string? ClassName { get; init; }
    [JsonPropertyName("specName")]
    public string? SpecName { get; init; } 
    [JsonPropertyName("specId")]
    public int? SpecId { get; init; }
}

public class WowClass
{
    [JsonPropertyName("id")]
    public required int Id { get; init; }
    [JsonPropertyName("name")]
    public required string Name { get; init; }
    [JsonPropertyName("specs")]
    public required List<string> Specs { get; init; }
}
//a ladder entry filed under its class, carrying the spec the player was in when synced
public record ClassLadderEntry : PvpLeaderboardEntry
{
    //JsonSerializer needs this to build entries back out of redis
    public ClassLadderEntry() { }
    //copies every ladder field from Blizzard's entry
    public ClassLadderEntry(PvpLeaderboardEntry entry) : base(entry) { }

    [JsonPropertyName("spec")]
    public string Spec { get; init; } = "";
}
