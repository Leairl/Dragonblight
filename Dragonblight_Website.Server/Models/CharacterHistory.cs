using ArgentPonyWarcraftClient;
using Microsoft.EntityFrameworkCore;


//one row each time a character's games played changes on a ladder
public class CharacterRatingSnapshot
{
    public long Id { get; set; }
    public string Flavor { get; set; } = "";
    public string Region { get; set; } = "";
    public int CharacterId { get; set; }
    public string Name { get; set; } = "";
    public string Realm { get; set; } = "";
    public string Bracket { get; set; } = "";
    public int Season { get; set; }
    public int Rating { get; set; }
    public int Rank { get; set; }
    public int Won { get; set; }
    public int Lost { get; set; }
    public DateTimeOffset RecordedAt { get; set; }
    public static CharacterRatingSnapshot FromEntry(PvpLeaderboardEntry player, string bracket, string region, GameFlavor flavor, int season)
    {
        return new CharacterRatingSnapshot
        {
            Flavor = flavor.ToString(),
            Region = region,
            CharacterId = player.Character.Id,
            Name = player.Character.Name,
            Realm = player.Character.Realm.Slug,
            Bracket = bracket,
            Season = season,
            Rating = player.Rating,
            Rank = player.Rank,
            Won = player.SeasonMatchStatistics.Won,
            Lost = player.SeasonMatchStatistics.Lost,
            RecordedAt = DateTimeOffset.UtcNow
        };
    }
}
//one point on the profile graph: a sync where the rating was different from the row before it
public class RatingHistoryPoint
{
    public int Rating { get; set; }
    public int Change { get; set; }
    public int Rank { get; set; }
    public int Won { get; set; }
    public int Lost { get; set; }
    public DateTimeOffset RecordedAt { get; set; }
}

public class HistoryDbContext(DbContextOptions<HistoryDbContext> options) : DbContext(options)
{
    // allows adding and removing snapshots in characterratingsnapshot table
    public DbSet<CharacterRatingSnapshot> RatingSnapshots => Set<CharacterRatingSnapshot>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CharacterRatingSnapshot>()
            .HasIndex(s => new { s.Flavor, s.Region, s.CharacterId, s.Bracket, s.RecordedAt });
    }
}
