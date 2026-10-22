//Season PvP titles all read "<title>: <season>". The title says the tier, the rest says the season,
//so this works for every season and both flavors without knowing any achievement ids.
public static class PvpTitles
{
    //lowest to highest, so a bigger value is a better title
    public enum Tier { Challenger, Rival, Duelist, Legend, Gladiator, BlitzRankOne, LegendRankOne, RankOne }

    private static bool IsRankOne(string title, string word)
    => title.Split(' ').Length == 2 && title.EndsWith(" " + word);
    //make sure the achievement is a title from that season
    public static (Tier tier, string season)? SeasonalTitles(string? name)
    {
        var seasonSplit = (name ?? "").Split(": ", 2);
        if (seasonSplit.Length != 2)
        {
            return null;
        }
        
        //"Season 12 (3v3)" and "Season 12 (2v2)" are the same season
        var title = seasonSplit[0];
        var season = seasonSplit[1].Replace(" (3v3)", "").Replace(" (2v2)", "").Replace(" (5v5)", "");
        //labels an achievement id pulled to the tier enum list, 
        // which can then be orderedbydescending to find the highest tier of a pvp seasonal achievement 
        Tier? tier = title switch
        {
            "Gladiator" => Tier.Gladiator,
            "Legend" => Tier.Legend,
            "Duelist" => Tier.Duelist,
            "Rival" => Tier.Rival,
            "Challenger" => Tier.Challenger,
            _ when IsRankOne(title, "Gladiator") => Tier.RankOne,
            _ when IsRankOne(title, "Legend") => Tier.LegendRankOne,
            _ when IsRankOne(title, "Marshal") => Tier.BlitzRankOne,
            _ => null,
        };
        
        return tier == null ? null : (tier.Value, season);
    }
}
