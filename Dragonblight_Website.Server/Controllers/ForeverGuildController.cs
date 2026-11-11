using ArgentPonyWarcraftClient;
using Microsoft.AspNetCore.Mvc;

namespace Dragonblight_Website.Server.Controllers
{
    //WoW: Forever guild pages: the guild and every member of its roster. Forever guilds have no
    //realm, so they are looked up by region and slug alone.
    [ApiController]
    [Route("api/[controller]")]
    public class ForeverGuildController : ControllerBase
    {
        private readonly ILogger<ForeverGuildController> _logger;
        private readonly IWarcraftRedisProxy _warcraftCachedData;
        private readonly ForeverStatsQueue _statsQueue;

        public ForeverGuildController(ILogger<ForeverGuildController> logger, IWarcraftRedisProxy warcraftCachedData, ForeverStatsQueue statsQueue)
        {
            _logger = logger;
            _warcraftCachedData = warcraftCachedData;
            _statsQueue = statsQueue;
        }

        //a guild slug: letters (accented ones included), digits and hyphens, e.g. "olympus-iv"
        private static bool IsGuildSlug(string slug)
        {
            if (slug.Length == 0 || slug.Length > 64)
            {
                return false;
            }
            foreach (var c in slug)
            {
                if (!char.IsLetterOrDigit(c) && c != '-')
                {
                    return false;
                }
            }
            return true;
        }

        //The guild and its whole roster, sorted by rank (guild master first), then by level and
        //name. Rosters carry class and race ids only, so they are named here; specs come from the
        //stats crawl, for members it has checked. 404 when Blizzard has no such guild.
        [HttpGet("GetGuild")]
        public async Task<ActionResult<ForeverGuildPage>> GetGuild(string region, string guildSlug)
        {
            region = region.ToLowerInvariant();
            if (region != "us" && region != "eu")
            {
                return BadRequest("region must be us or eu");
            }
            guildSlug = guildSlug.ToLowerInvariant();
            if (!IsGuildSlug(guildSlug))
            {
                return BadRequest("guildSlug must be a guild slug");
            }
            try
            {
                var guildTask = _warcraftCachedData.GetForeverGuild(guildSlug, region);
                var rosterTask = _warcraftCachedData.GetForeverGuildRoster(guildSlug, region);
                var namesTask = _warcraftCachedData.GetForeverNameLists(region);
                await Task.WhenAll(guildTask, rosterTask, namesTask);

                var guild = guildTask.Result;
                var roster = rosterTask.Result;
                if (guild == null || roster?.Members == null)
                {
                    return NotFound();
                }
                var names = namesTask.Result ?? new ForeverNameLists();

                var characters = roster.Members
                    .Where(m => m.Character != null && !string.IsNullOrEmpty(m.Character.Slug))
                    .ToList();
                var specs = await _warcraftCachedData.GetForeverStatsCharacters(characters.Select(m => m.Character.Slug), region);

                var members = characters
                    .Select(m =>
                    {
                        var c = m.Character;
                        var specName = "";
                        if (specs.TryGetValue(c.Slug.ToLowerInvariant(), out var known))
                        {
                            specName = known.SpecName;
                        }
                        return new ForeverGuildPageMember
                        {
                            Name = c.Name ?? "",
                            Surname = c.Surname ?? "",
                            Slug = c.Slug.ToLowerInvariant(),
                            Rank = m.Rank,
                            Level = c.Level,
                            ClassName = NameOf(names.Classes, c.PlayableClass?.Id),
                            RaceName = NameOf(names.Races, c.PlayableRace?.Id),
                            Faction = c.Faction?.Type ?? guild.Faction?.Type ?? "",
                            SpecName = specName,
                        };
                    })
                    .OrderBy(m => m.Rank)
                    .ThenByDescending(m => m.Level)
                    .ThenBy(m => m.Name)
                    .ThenBy(m => m.Surname)
                    .ToList();

                //viewing a guild adds it to the stats sample too, the same as looking up a member
                _statsQueue.QueueGuild(region, guildSlug);

                return Ok(new ForeverGuildPage
                {
                    Name = guild.Name ?? "",
                    Slug = guildSlug,
                    Region = region,
                    Faction = guild.Faction?.Type ?? "",
                    RulesetId = guild.Ruleset?.Id ?? 0,
                    RulesetName = guild.Ruleset?.Name ?? "",
                    Members = members,
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while getting Forever guild {Guild} in {Region}.", guildSlug, region);
                return StatusCode(500);
            }
        }

        private static string NameOf(Dictionary<int, string> names, int? id)
        {
            if (id != null && names.TryGetValue(id.Value, out var name))
            {
                return name;
            }
            return "Unknown";
        }
    }

    public class ForeverGuildPage
    {
        public required string Name { get; set; }
        public required string Slug { get; set; }
        public required string Region { get; set; }
        //ALLIANCE or HORDE
        public required string Faction { get; set; }
        public int RulesetId { get; set; }
        public required string RulesetName { get; set; }
        //sorted by rank, then level (highest first), then name
        public required List<ForeverGuildPageMember> Members { get; set; }
    }

    public class ForeverGuildPageMember
    {
        public required string Name { get; set; }
        public required string Surname { get; set; }
        public required string Slug { get; set; }
        //0 is the guild master. Blizzard's API gives rank numbers only, not the guild's rank names
        public int Rank { get; set; }
        public int Level { get; set; }
        public required string ClassName { get; set; }
        public required string RaceName { get; set; }
        public required string Faction { get; set; }
        //empty when the stats crawl hasn't checked the member yet, or they have no talent points
        public required string SpecName { get; set; }
    }
}
