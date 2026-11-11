namespace ArgentPonyWarcraftClient;

public record ForeverAchievementsSummary
{
    [JsonPropertyName("total_quantity")]
    public int? TotalQuantity { get; init; }
    [JsonPropertyName("total_points")]
    public int? TotalPoints { get; init; }
    [JsonPropertyName("achievements")]
    public ForeverAchievementProgress[]? Achievements { get; init; }
    [JsonPropertyName("recent_events")]
    public ForeverAchievementEvent[]? RecentEvents { get; init; }
}

public record ForeverAchievementProgress
{
    [JsonPropertyName("id")]
    public int Id { get; init; }
    [JsonPropertyName("achievement")]
    public AchievementReference? Achievement { get; init; }
    [JsonPropertyName("criteria")]
    public ForeverAchievementCriteriaProgress? Criteria { get; init; }
    //Keep Blizzard's epoch milliseconds rather than applying date conversions twice.
    [JsonPropertyName("completed_timestamp")]
    public long? CompletedTimestamp { get; init; }
}

public record ForeverAchievementCriteriaProgress
{
    [JsonPropertyName("id")]
    public int Id { get; init; }
    [JsonPropertyName("is_completed")]
    public bool? IsCompleted { get; init; }
    [JsonPropertyName("amount")]
    public double? Amount { get; init; }
    [JsonPropertyName("child_criteria")]
    public ForeverAchievementCriteriaProgress[]? ChildCriteria { get; init; }
}

public record ForeverAchievementEvent
{
    [JsonPropertyName("achievement")]
    public AchievementReference? Achievement { get; init; }
    [JsonPropertyName("timestamp")]
    public long? Timestamp { get; init; }
}

//The shared Retail definition omits rewards and nested criterion targets used by Forever.
public record ForeverAchievement
{
    [JsonPropertyName("id")]
    public int Id { get; init; }
    [JsonPropertyName("name")]
    public string? Name { get; init; }
    [JsonPropertyName("description")]
    public string? Description { get; init; }
    [JsonPropertyName("category")]
    public AchievementCategoryReference? Category { get; init; }
    [JsonPropertyName("is_account_wide")]
    public bool? IsAccountWide { get; init; }
    [JsonPropertyName("reward_description")]
    public string? RewardDescription { get; init; }
    [JsonPropertyName("criteria")]
    public ForeverAchievementCriteria? Criteria { get; init; }
}

public record ForeverAchievementCriteria
{
    [JsonPropertyName("id")]
    public int Id { get; init; }
    [JsonPropertyName("description")]
    public string? Description { get; init; }
    [JsonPropertyName("amount")]
    public double? Amount { get; init; }
    [JsonPropertyName("show_progress_bar")]
    public bool? ShowProgressBar { get; init; }
    [JsonPropertyName("child_criteria")]
    public ForeverAchievementCriteria[]? ChildCriteria { get; init; }
}
