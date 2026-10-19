using System.Text.Json.Serialization;
using ArgentPonyWarcraftClient;


public class CharacterIdentity
{
    [JsonPropertyName("id")]
    public int Id { get; set; } = 0;

    [JsonPropertyName("name")]
    public string Name { get; set; } = "";
    [JsonPropertyName("realm")]
    public string Realm { get; set; } = "";
    [JsonPropertyName("previous_names")]
    public List<PreviousCharacterName> PreviousNames { get; set; } = [];
    
}

public class PreviousCharacterName
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = "";
    [JsonPropertyName("realm")]
    public string Realm { get; set; } = "";
    [JsonPropertyName("changed_at")]
    public DateTimeOffset ChangedAt { get; set; } = DateTimeOffset.Now;
}