using Microsoft.EntityFrameworkCore;

//the only class that reads and writes the rating history table
public class RatingHistoryService(IDbContextFactory<HistoryDbContext> historyFactory)
{
    public async Task SaveSnapshots(List<CharacterRatingSnapshot> snapshots)
    {
        await using var history = await historyFactory.CreateDbContextAsync();
        history.RatingSnapshots.AddRange(snapshots);
        await history.SaveChangesAsync();
    }

    public async Task<List<RatingHistoryPoint>> GetRatingHistory(GameFlavor flavor, string region, int characterId, string ladder, int season)
    {
        var flavorName = flavor.ToString();
        var regionName = region.ToLower();

        await using var history = await historyFactory.CreateDbContextAsync();
        var rows = await history.RatingSnapshots
            .AsNoTracking()
            .Where(s => s.Flavor == flavorName && s.Region == regionName && s.CharacterId == characterId && s.Bracket == ladder && s.Season == season)
            .OrderBy(s => s.RecordedAt)
            .ToListAsync();

        var points = new List<RatingHistoryPoint>();
        int? previousRating = null;
        foreach (var row in rows)
        {
            //same rating as the row before it, so there is nothing new to draw
            if (row.Rating == previousRating)
            {
                continue;
            }
            var change = 0;
            if (previousRating != null)
            {
                change = row.Rating - previousRating.Value;
            }
            points.Add(new RatingHistoryPoint
            {
                Rating = row.Rating,
                Change = change,
                Rank = row.Rank,
                Won = row.Won,
                Lost = row.Lost,
                RecordedAt = row.RecordedAt
            });
            previousRating = row.Rating;
        }
        return points;
    }
}
