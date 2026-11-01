using System.Text.Json.Serialization;

//one percentage title's live cutoff, counted by battle.net account rather than by character
public class EstimatedCutoff
{
    [JsonPropertyName("title")]
    public string Title { get; set; } = "";
    //the ladder the title is earned on: "3v3", or a spec's own Shuffle or Blitz ladder
    [JsonPropertyName("bracket")]
    public string Bracket { get; set; } = "";
    //the title's achievement, which is also the key its history is kept under
    [JsonPropertyName("achievementId")]
    public int AchievementId { get; set; }
    //Blizzard's published cutoff the spots were counted from
    [JsonPropertyName("ratingCutoff")]
    public int RatingCutoff { get; set; }
    [JsonPropertyName("spots")]
    public int Spots { get; set; }
    [JsonPropertyName("estimatedRating")]
    public int EstimatedRating { get; set; }
    [JsonPropertyName("estimatedRank")]
    public int EstimatedRank { get; set; }
    [JsonPropertyName("altsInside")]
    public int AltsInside { get; set; }

    //why it moved since the last sync; empty on the first sync
    [JsonPropertyName("previousRank")]
    public int? PreviousRank { get; set; }
    [JsonPropertyName("previousRating")]
    public int? PreviousRating { get; set; }
    [JsonPropertyName("altsLeft")]
    public int AltsLeft { get; set; }
    [JsonPropertyName("altsEntered")]
    public int AltsEntered { get; set; }
    [JsonPropertyName("accountsEntered")]
    public int AccountsEntered { get; set; }
    [JsonPropertyName("accountsLeft")]
    public int AccountsLeft { get; set; }
    [JsonPropertyName("holdersReplaced")]
    public int HoldersReplaced { get; set; }

    //who was inside the cutoff, kept so the next sync can compare against it
    [JsonPropertyName("inside")]
    public List<EstimateInsideEntry> Inside { get; set; } = [];
}

public class EstimateInsideEntry
{
    [JsonPropertyName("characterId")]
    public int CharacterId { get; set; }
    [JsonPropertyName("account")]
    public string Account { get; set; } = "";
    [JsonPropertyName("isAlt")]
    public bool IsAlt { get; set; }
    [JsonPropertyName("name")]
    public string Name { get; set; } = "";
    [JsonPropertyName("realm")]
    public string Realm { get; set; } = "";
    [JsonPropertyName("rank")]
    public int Rank { get; set; }
    [JsonPropertyName("rating")]
    public int Rating { get; set; }
    //for an alt, the character holding its account's spot
    [JsonPropertyName("mainName")]
    public string MainName { get; set; } = "";
}

//one sync's estimate, for the history graph
public class EstimateHistoryPoint
{
    [JsonPropertyName("time")]
    public DateTimeOffset Time { get; set; }
    [JsonPropertyName("estimatedRating")]
    public int EstimatedRating { get; set; }
    [JsonPropertyName("estimatedRank")]
    public int EstimatedRank { get; set; }
    [JsonPropertyName("ratingCutoff")]
    public int RatingCutoff { get; set; }
    [JsonPropertyName("spots")]
    public int Spots { get; set; }
    [JsonPropertyName("altsInside")]
    public int AltsInside { get; set; }
}

//what the Estimated popup shows: the latest estimate with who is inside it, and every sync before it
public class EstimateDetail
{
    [JsonPropertyName("estimate")]
    public EstimatedCutoff? Estimate { get; set; }
    [JsonPropertyName("history")]
    public List<EstimateHistoryPoint> History { get; set; } = [];
}
