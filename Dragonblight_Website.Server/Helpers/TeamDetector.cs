namespace Dragonblight_Website.Server.Helpers;

//One player whose games changed between two ladder syncs
public record SyncedPlayer(int CharacterId, int Rating, int RatingChange, int Won, int Lost, string ClassName, string SpecName);

//Blizzard doesn't say who queued with who, so teams are worked out from the ladder. Teammates play the
//same games, so they gain the same wins and losses between two syncs, and close to the same rating.
//These limits were picked against real activity: wins and losses alone also match strangers, which
//shows up as groups too big to be one team.
public static class TeamDetector
{
    //fewer games than this match by chance too often to mean anything
    private const int MinGames = 4;
    private const int MaxRatingChangeGap = 8;
    private const int MaxRatingGap = 200;

    //Shuffle and Blitz are solo queues, and a Rated Battleground team is too big to find this way
    public static int? TeamSize(string bracket)
    {
        return bracket switch
        {
            "2v2" => 2,
            "3v3" => 3,
            "5v5" => 5,
            _ => null,
        };
    }

    //Only groups of exactly the team size count. A bigger one can't be split back into its teams, and a
    //smaller one is missing someone who isn't on the ladder, so its composition isn't known.
    public static List<List<SyncedPlayer>> FindTeams(IEnumerable<SyncedPlayer> players, int teamSize)
    {
        var teams = new List<List<SyncedPlayer>>();
        var sameRecord = players
            .Where(p => p.Won + p.Lost >= MinGames && p.ClassName != "" && p.SpecName != "")
            .GroupBy(p => (p.Won, p.Lost));
        foreach (var record in sameRecord)
        {
            //walks up the rating changes, starting a new group wherever there is a gap between two players
            var group = new List<SyncedPlayer>();
            foreach (var player in record.OrderBy(p => p.RatingChange))
            {
                if (group.Count > 0 && player.RatingChange - group[^1].RatingChange > MaxRatingChangeGap)
                {
                    AddIfTeam(teams, group, teamSize);
                    group = [];
                }
                group.Add(player);
            }
            AddIfTeam(teams, group, teamSize);
        }
        return teams;
    }

    private static void AddIfTeam(List<List<SyncedPlayer>> teams, List<SyncedPlayer> group, int teamSize)
    {
        if (group.Count == teamSize && group.Max(p => p.Rating) - group.Min(p => p.Rating) <= MaxRatingGap)
        {
            teams.Add(group);
        }
    }
}
