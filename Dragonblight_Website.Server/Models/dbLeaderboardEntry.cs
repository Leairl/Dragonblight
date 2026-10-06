using System.Text.Json.Serialization;
using ArgentPonyWarcraftClient;


public class PvpCharacterSummary
        {
            [JsonPropertyName("pvpEntry")]
            public required PvpLeaderboardEntry PvpEntry { get; init; }

            [JsonPropertyName("charSummary")]
            public required CharacterProfileSummary charSummary { get; init; }
            
            [JsonPropertyName("spec")]
            public required string spec { get; set; }
        }