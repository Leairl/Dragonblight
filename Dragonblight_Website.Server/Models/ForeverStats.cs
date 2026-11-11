//The WoW: Forever stats page's data. Blizzard has no population figures, so these come from a
//sample: the guilds of characters someone searched on Dragonblight, and everyone in them.

//one character as the stats job last saw it in a guild roster
public class ForeverStatsCharacter
{
    public required string Region { get; set; }
    public required string Slug { get; set; }
    //name, surname and guild name are shown when Blizzard has no profile for the character.
    //Not required: records saved before they were added have none
    public string Name { get; set; } = "";
    public string Surname { get; set; } = "";
    public string GuildName { get; set; } = "";
    public int RulesetId { get; set; }
    public required string RulesetName { get; set; }
    //ALLIANCE or HORDE
    public required string Faction { get; set; }
    public required string ClassName { get; set; }
    public required string RaceName { get; set; }
    //the talent tree with the most points; empty when the character has spent none, or when
    //their spec hasn't been fetched yet (SpecChecked tells the two apart)
    public required string SpecName { get; set; }
    //false until the crawl has fetched the character's spec. A guild's records are saved from
    //its roster first, so they show on the page in seconds, and their specs follow
    public bool SpecChecked { get; set; }
    public int Level { get; set; }
    public required string GuildSlug { get; set; }
    //records not seen for 30 days are dropped, so characters who left the sample age out
    public DateTimeOffset SeenAt { get; set; }
}

//what the stats page shows: the sample's characters counted by every combination the page
//filters on, so the page can total them however it needs without the server knowing how
public class ForeverStatsSummary
{
    public DateTimeOffset? UpdatedAt { get; set; }
    public int Characters { get; set; }
    public int Guilds { get; set; }
    //characters whose spec the crawl is still fetching; they count everywhere but the spec card
    public int SpecsPending { get; set; }
    public List<ForeverStatsGroup> Groups { get; set; } = [];
}

public class ForeverStatsGroup
{
    public required string Region { get; set; }
    public int RulesetId { get; set; }
    public required string RulesetName { get; set; }
    public required string Faction { get; set; }
    public required string ClassName { get; set; }
    public required string SpecName { get; set; }
    public required string RaceName { get; set; }
    public int Count { get; set; }
}

//Forever's class and race names by id. Roster members carry only the ids.
public class ForeverNameLists
{
    public Dictionary<int, string> Classes { get; set; } = [];
    public Dictionary<int, string> Races { get; set; } = [];
}
