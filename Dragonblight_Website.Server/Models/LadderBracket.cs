
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

//how many players of a spec are at or above each minimum rating
public class SpecRatingCounts
{
    [JsonPropertyName("className")]
    public required string ClassName { get; init; }
    [JsonPropertyName("specName")]
    public required string SpecName { get; init; }
    [JsonPropertyName("playersAtRating")]
    public required Dictionary<int, int> PlayersAtRating { get; init; }
    //for each minimum rating, how many of the spec's players are each race
    [JsonPropertyName("racesAtRating")]
    public required Dictionary<int, Dictionary<string, int>> RacesAtRating { get; init; }
}

public class CompositionSpec
{
    [JsonPropertyName("className")]
    public required string ClassName { get; init; }
    [JsonPropertyName("specName")]
    public required string SpecName { get; init; }
}

//how many times a team composition was seen at or above each minimum rating
public class CompositionCounts
{
    [JsonPropertyName("specs")]
    public required List<CompositionSpec> Specs { get; init; }
    [JsonPropertyName("countsAtRating")]
    public required Dictionary<int, int> CountsAtRating { get; init; }
}

//wins and losses one spec gained across the activity still kept
public class SpecWinRate
{
    [JsonPropertyName("className")]
    public required string ClassName { get; init; }
    [JsonPropertyName("specName")]
    public required string SpecName { get; init; }
    [JsonPropertyName("wins")]
    public int Wins { get; set; }
    [JsonPropertyName("losses")]
    public int Losses { get; set; }
    //activity entries counted, one per player per sync
    [JsonPropertyName("players")]
    public int Players { get; set; }
}

public class SpecWinRates
{
    [JsonPropertyName("from")]
    public DateTime? From { get; init; }
    [JsonPropertyName("to")]
    public DateTime? To { get; init; }
    [JsonPropertyName("specs")]
    public required List<SpecWinRate> Specs { get; init; }
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
