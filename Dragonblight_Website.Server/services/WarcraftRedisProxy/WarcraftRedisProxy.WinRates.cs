//Win rates per spec from the activity still kept, for the comp score's meta card. Redis only - the
//ladder sync feeds the per-class activity lists, which already know each player's spec.
partial class WarcraftRedisProxy
{
    public async Task<SpecWinRates> GetSpecWinRates(string bracket, string region, GameFlavor flavor)
    {
        var totals = new Dictionary<(string ClassName, string SpecName), SpecWinRate>();
        DateTime? from = null;
        DateTime? to = null;
        foreach (var wowClass in await GetPlayableClasses(region, flavor))
        {
            foreach (var activity in await GetBracketClassFilteredActivityPage(bracket, region, wowClass.Name, flavor))
            {
                if (activity == null || string.IsNullOrEmpty(activity.Spec))
                {
                    continue;
                }
                var won = activity.NewPlayer.SeasonMatchStatistics.Won - activity.OldPlayer.SeasonMatchStatistics.Won;
                var lost = activity.NewPlayer.SeasonMatchStatistics.Lost - activity.OldPlayer.SeasonMatchStatistics.Lost;
                //a season reset can make these negative, and those games can't be counted
                if (won < 0 || lost < 0 || won + lost == 0)
                {
                    continue;
                }
                var key = (wowClass.Name, activity.Spec);
                if (!totals.TryGetValue(key, out var total))
                {
                    total = new SpecWinRate { ClassName = wowClass.Name, SpecName = activity.Spec };
                    totals[key] = total;
                }
                total.Wins += won;
                total.Losses += lost;
                total.Players++;

                var time = activity.NewPlayer.Time;
                if (from == null || time < from)
                {
                    from = time;
                }
                if (to == null || time > to)
                {
                    to = time;
                }
            }
        }
        return new SpecWinRates { From = from, To = to, Specs = totals.Values.ToList() };
    }
}
