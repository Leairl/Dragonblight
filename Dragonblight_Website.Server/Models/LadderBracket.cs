
using System.Text.Json.Serialization;

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