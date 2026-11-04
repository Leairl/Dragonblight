namespace Dragonblight_Website.Server.Helpers;

//One player whose games changed between two ladder syncs
public record SyncedPlayer(int CharacterId, int Rating, int RatingChange, int Won, int Lost, string ClassName, string SpecName);

//Blizzard doesn't say who queued with who, so teams are worked out from the ladder. Teammates play the
//same games, so they gain the same wins and losses between two syncs. Strangers can match that too, so a
//group has to be exactly one team's size, and in 3v3 has to be a healer and two damage specs.
public static class TeamDetector
{
    //fewer games than this match by chance too often to mean anything
    private const int MinGames = 6;

    //these names only ever belong to healers or tanks, on both flavors. Anything else is a damage spec
    private static readonly HashSet<string> HealerSpecs = ["Restoration", "Holy", "Discipline", "Mistweaver", "Preservation"];
    private static readonly HashSet<string> TankSpecs = ["Protection", "Blood", "Guardian", "Brewmaster", "Vengeance"];

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
        return players
            .Where(p => p.Won + p.Lost >= MinGames && p.ClassName != "" && p.SpecName != "")
            .GroupBy(p => (p.Won, p.Lost))
            .Select(sameRecord => sameRecord.ToList())
            .Where(group => group.Count == teamSize && HasValidRoles(group, teamSize))
            .ToList();
    }

    //a 3v3 team only counts as a healer and two damage specs. Other brackets take any mix
    private static bool HasValidRoles(List<SyncedPlayer> group, int teamSize)
    {
        if (teamSize != 3)
        {
            return true;
        }
        var healers = group.Count(p => HealerSpecs.Contains(p.SpecName));
        var tanks = group.Count(p => TankSpecs.Contains(p.SpecName));
        return healers == 1 && tanks == 0;
    }
}
