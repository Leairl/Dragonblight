namespace Dragonblight_Website.Server.Helpers;

//One player whose games changed between two ladder syncs
public record SyncedPlayer(int CharacterId, int Rating, int RatingChange, int Won, int Lost, string ClassName, string SpecName);

//Blizzard doesn't say who queued with who, so teams are worked out from the ladder. Teammates play the
//same games, so they gain the same wins and losses between two syncs. Strangers can match that too, so a
//group has to end up exactly one team's size, and has to fit the bracket's roles.
public static class TeamDetector
{
    //fewer games than this match by chance too often to mean anything
    private const int MinGames = 6;

    //a group too big to be one team is split wherever two players with the same record are further apart than this
    private const int MaxRatingGap = 200;

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

    //Only groups of exactly the team size count. A bigger one is split by rating first, and a smaller
    //one is missing someone who isn't on the ladder, so its composition isn't known.
    public static List<List<SyncedPlayer>> FindTeams(IEnumerable<SyncedPlayer> players, int teamSize)
    {
        return players
            .Where(p => p.Won + p.Lost >= MinGames && p.ClassName != "" && p.SpecName != "")
            .GroupBy(p => (p.Won, p.Lost))
            .SelectMany(sameRecord => SplitByRating(sameRecord.ToList(), teamSize))
            .Where(group => group.Count == teamSize && HasValidRoles(group, teamSize))
            .ToList();
    }

    //Two teams can finish with the same record, or a stranger can match a team's. Rating is the only thing left to
    //tell them apart, so a group that fits one team is left alone and only a bigger one is split.
    private static List<List<SyncedPlayer>> SplitByRating(List<SyncedPlayer> sameRecord, int teamSize)
    {
        if (sameRecord.Count <= teamSize)
        {
            return [sameRecord];
        }
        var groups = new List<List<SyncedPlayer>>();
        foreach (var player in sameRecord.OrderByDescending(p => p.Rating))
        {
            if (groups.Count == 0 || groups[^1][^1].Rating - player.Rating > MaxRatingGap)
            {
                groups.Add([]);
            }
            groups[^1].Add(player);
        }
        return groups;
    }

    //a 3v3 team only counts as a healer and two damage specs, and a 2v2 team can't be two healers. 5v5 takes any mix
    private static bool HasValidRoles(List<SyncedPlayer> group, int teamSize)
    {
        var healers = group.Count(p => HealerSpecs.Contains(p.SpecName));
        if (teamSize == 2)
        {
            return healers <= 1;
        }
        if (teamSize != 3)
        {
            return true;
        }
        var tanks = group.Count(p => TankSpecs.Contains(p.SpecName));
        return healers == 1 && tanks == 0;
    }
}
