//The WoW: Forever talents tab: a class's three talent trees as the game lays them out, and the
//points a character has spent in them.

//a class's trees, in the game's order (e.g. Balance, Feral Combat, Restoration)
public class ForeverClassTalents
{
    public int ClassId { get; set; }
    public List<ForeverTalentTreeLayout> Trees { get; set; } = [];
}

public class ForeverTalentTreeLayout
{
    public int SpecId { get; set; }
    public required string SpecName { get; set; }
    public List<ForeverTalentNode> Nodes { get; set; } = [];
}

//one talent in its grid slot
public class ForeverTalentNode
{
    public long NodeId { get; set; }
    //1 is the top row. Columns are Blizzard's (7-10 for a four-column tree); the page shifts them to start at 0
    public int Row { get; set; }
    public int Column { get; set; }
    public int MaxRank { get; set; }
    //matches the talent ids in a character's specializations
    public int TalentId { get; set; }
    public int SpellId { get; set; }
    public required string Name { get; set; }
    //Blizzard's icon image for the talent; empty when it has none
    public required string Icon { get; set; }
    //what each rank does, rank 1 first
    public List<string> RankDescriptions { get; set; } = [];
    //the talents that must be maxed first, which the page draws arrows from
    public List<long> LockedBy { get; set; } = [];
}

//what the talents tab gets: the class's trees, and each of the character's talent groups
public class ForeverTalentsPage
{
    public List<ForeverTalentTreeLayout> Trees { get; set; } = [];
    //the primary group first, then a secondary one for characters with dual spec
    public List<ForeverTalentGroup> Groups { get; set; } = [];
}

public class ForeverTalentGroup
{
    public bool IsActive { get; set; }
    //points spent, by talent id
    public Dictionary<int, int> Ranks { get; set; } = [];
}
