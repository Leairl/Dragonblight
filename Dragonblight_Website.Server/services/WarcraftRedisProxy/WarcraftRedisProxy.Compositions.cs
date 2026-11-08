using Dragonblight_Website.Server.Helpers;
using StackExchange.Redis;

//How many different teams have been seen playing each composition, for the stats page. Redis only - the
//ladder sync feeds it. Counts are kept per day so the page can add up a rolling window, and each day's
//counts expire by themselves, so the list keeps following what people are playing now.
partial class WarcraftRedisProxy
{
    private static string CompositionKey(string bracket, string region, GameFlavor flavor, DateTime day)
        => flavor.KeyPrefix() + "Compositions-" + bracket + "-" + region + "-" + day.ToString("yyyyMMdd");

    //"Frost:Death Knight,Holy:Paladin", sorted so the same specs are always the same composition
    private static string CompositionName(IEnumerable<SyncedPlayer> team)
        => string.Join(",", team.Select(p => p.SpecName + ":" + p.ClassName).Order(StringComparer.Ordinal));

    //Remembers a team was already counted at a rating, so one team playing many sessions can't carry a composition
    private static string CompositionTeamKey(string bracket, string region, GameFlavor flavor, int rating, IEnumerable<SyncedPlayer> team, string composition)
        => flavor.KeyPrefix() + "CompositionTeam-" + bracket + "-" + region + "-" + rating + "-"
            + string.Join(",", team.Select(p => p.CharacterId).Order()) + "|" + composition;

    //A team counts at every rating its lowest player has reached, which is what lets the page's rating slider filter them.
    //It counts once per rating, so reaching a higher rating later adds it there without counting it again below.
    public async Task RecordCompositions(string bracket, string region, List<List<SyncedPlayer>> teams, GameFlavor flavor)
    {
        if (teams.Count == 0)
        {
            return;
        }
        var db = redis.GetDatabase();
        var now = DateTime.UtcNow;
        var key = CompositionKey(bracket, region, flavor, now);
        foreach (var team in teams)
        {
            var name = CompositionName(team);
            var lowestRating = team.Min(p => p.Rating);
            foreach (var rating in SpecStatRatings.Where(r => r <= lowestRating))
            {
                var TeamKey = CompositionTeamKey(bracket, region, flavor, rating, team, name);
                var isNewTeam = await db.StringSetAsync(TeamKey, "1", TimeSpan.FromDays(7), When.NotExists);
                //if we find the name of the team we increment the hash for that composition
                if (isNewTeam)
                {
                    await db.HashIncrementAsync(key, rating + "|" + name);
                }
            }
        }
        await db.KeyExpireAsync(key, TimeSpan.FromDays(7 + 1));
    }

    public async Task<List<CompositionCounts>> GetCompositions(string bracket, string region, GameFlavor flavor)
    {
        var db = redis.GetDatabase();
        var countsByName = new Dictionary<string, Dictionary<int, int>>();
        for (var daysAgo = 0; daysAgo < 7; daysAgo++)
        {
            var key = CompositionKey(bracket, region, flavor, DateTime.UtcNow.AddDays(-daysAgo));
            //finds all the compositions that have been played in the last 7 days and counts them by rating
            foreach (var entry in await db.HashGetAllAsync(key))
            {
                //each field reads "rating|composition", like "1800|Frost:Mage,Holy:Priest"
                var parts = entry.Name.ToString().Split('|', 2);
                var rating = int.Parse(parts[0]);
                var compositionName = parts[1];
                var teamsThatDay = (int)entry.Value;

                if (!countsByName.ContainsKey(compositionName))
                {
                    countsByName[compositionName] = new Dictionary<int, int>();
                }
                // Dictionary<int, int>
                var countsAtRating = countsByName[compositionName];
                //value of dict
                countsAtRating[rating] = countsAtRating.GetValueOrDefault(rating) + teamsThatDay;
            }
        }
        //convert the dictionary to a list of CompositionCounts objects
        //returning count rating dictionary of a team comp 
        return countsByName.Select(composition => new CompositionCounts
        {
            Specs = composition.Key.Split(',').Select(spec =>
            {
                var parts = spec.Split(':', 2);
                //list per spec and class name in class compositionspec
                return new CompositionSpec { SpecName = parts[0], ClassName = parts[1] };
            }).ToList(),
            //{1500, 3}, {1600, 5}, {1700, 2}, {1800, 1}
            CountsAtRating = composition.Value,
        }).ToList();

     
    }
}
