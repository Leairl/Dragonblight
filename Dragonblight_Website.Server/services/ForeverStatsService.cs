using System.Collections.Concurrent;
using System.Threading.Channels;
using ArgentPonyWarcraftClient;

//Builds the WoW: Forever stats page's sample. Blizzard publishes no population figures, so the
//sample is the guilds of characters someone searched on Dragonblight, and everyone in them:
//  1. each searched character's profile names their guild
//  2. each guild gives its ruleset, and its roster gives every member's class, race, faction and level
//  3. each member level 10 or higher gets one more call for their spec
//Characters not seen for 30 days are dropped, then the rest are counted into the summary the
//page reads. The whole sample is rebuilt hourly; a guild whose member was just looked up is
//crawled straight away through ForeverStatsQueue.
public class ForeverStatsService(IWarcraftRedisProxy warcraftCachedData, ILogger<ForeverStatsService> logger)
{
    //talents start at level 10, and below it the sample would be mostly brand-new characters
    private const int MinimumLevel = 10;
    private static readonly TimeSpan KeepFor = TimeSpan.FromDays(30);
    //a few calls at a time keeps a run well inside Blizzard's limit of 100 a second
    private const int ParallelCalls = 4;

    public async Task Run(CancellationToken cancellationToken)
    {
        var seen = DateTimeOffset.UtcNow;
        var searched = await warcraftCachedData.ForeverCachedCharacters();
        foreach (var region in new[] { "us", "eu" })
        {
            var regionSearched = searched
                .Select(entry => entry.Split(','))
                .Where(parts => parts.Length == 2 && parts[1] == region)
                .Select(parts => parts[0])
                .ToList();
            await CrawlRegion(region, regionSearched, seen, cancellationToken);
        }
        await Summarize(seen);
    }

    //crawls one guild now and recounts, for a guild whose member was just looked up
    public async Task CrawlGuildNow(string region, string guildSlug, CancellationToken cancellationToken)
    {
        var names = await warcraftCachedData.GetForeverNameLists(region);
        if (names == null)
        {
            return;
        }
        var seen = DateTimeOffset.UtcNow;
        await CrawlGuild(region, guildSlug, names, seen, cancellationToken);
        await Summarize(seen);
        logger.LogInformation("Forever stats: crawled {Guild} in {Region} after a lookup.", guildSlug, region);
    }

    private async Task CrawlRegion(string region, List<string> searchedSlugs, DateTimeOffset seen, CancellationToken cancellationToken)
    {
        var names = await warcraftCachedData.GetForeverNameLists(region);
        if (names == null)
        {
            logger.LogWarning("Forever stats: no class and race names for {Region}, skipping it this run.", region);
            return;
        }

        //each searched character's guild
        var guildSlugs = new ConcurrentDictionary<string, bool>();
        await Parallel.ForEachAsync(searchedSlugs, ParallelOptions(cancellationToken), async (slug, _) =>
        {
            var profile = await warcraftCachedData.GetForeverCharacter(slug, region);
            var guildSlug = GuildSlugOf(profile?.Guild);
            if (guildSlug != "")
            {
                guildSlugs.TryAdd(guildSlug, true);
            }
        });

        foreach (var guildSlug in guildSlugs.Keys)
        {
            await CrawlGuild(region, guildSlug, names, seen, cancellationToken);
        }
        logger.LogInformation("Forever stats: crawled {Guilds} guilds in {Region}.", guildSlugs.Count, region);
    }

    //Every member of one guild, level 10 and up, saved into the sample in two steps:
    //  1. straight from the roster, which takes one call, then the sample is recounted, so the
    //     guild's characters show on the page (and in the roster fallback) within seconds
    //  2. each member's spec, one call each, which for a big guild takes minutes
    //A member already in the sample keeps the spec it had until step 2 replaces it, so crawling
    //a guild again never blanks its specs out.
    private async Task CrawlGuild(string region, string guildSlug, ForeverNameLists names, DateTimeOffset seen, CancellationToken cancellationToken)
    {
        var guild = await warcraftCachedData.GetForeverGuild(guildSlug, region);
        var roster = await warcraftCachedData.GetForeverGuildRoster(guildSlug, region);
        if (guild?.Ruleset == null || roster?.Members == null)
        {
            return;
        }
        var members = roster.Members
            .Select(m => m.Character)
            .Where(c => c != null && c.Level >= MinimumLevel && !string.IsNullOrEmpty(c.Slug))
            .ToList();

        var known = (await warcraftCachedData.GetForeverStatsCharacters())
            .Where(c => c.Region == region)
            .ToDictionary(c => c.Slug);

        //step 1: the roster
        var records = new List<ForeverStatsCharacter>();
        foreach (var member in members)
        {
            var slug = member.Slug.ToLowerInvariant();
            var specName = "";
            var specChecked = false;
            if (known.TryGetValue(slug, out var previous))
            {
                specName = previous.SpecName;
                specChecked = previous.SpecChecked;
            }
            records.Add(new ForeverStatsCharacter
            {
                Region = region,
                Slug = slug,
                Name = member.Name ?? "",
                Surname = member.Surname ?? "",
                GuildName = guild.Name ?? "",
                RulesetId = guild.Ruleset.Id,
                RulesetName = guild.Ruleset.Name ?? "",
                Faction = member.Faction?.Type ?? guild.Faction?.Type ?? "",
                ClassName = NameOf(names.Classes, member.PlayableClass?.Id),
                RaceName = NameOf(names.Races, member.PlayableRace?.Id),
                SpecName = specName,
                SpecChecked = specChecked,
                Level = member.Level,
                GuildSlug = guildSlug,
                SeenAt = seen,
            });
        }
        await warcraftCachedData.SaveForeverStatsCharacters(records);
        //only worth a recount when the roster brought characters the page hasn't counted yet
        if (records.Any(r => !known.ContainsKey(r.Slug)))
        {
            await Summarize(seen);
        }

        //step 2: specs. Most come from the three-day cache; a failed call leaves the character
        //unchecked, to be tried again on the next run
        await Parallel.ForEachAsync(records, ParallelOptions(cancellationToken), async (record, _) =>
        {
            var specName = await warcraftCachedData.GetForeverSpecName(record.Slug, region);
            if (specName != null)
            {
                record.SpecName = specName;
                record.SpecChecked = true;
            }
        });
        await warcraftCachedData.SaveForeverStatsCharacters(records);
    }

    //drops characters not seen for 30 days, then counts the rest by every combination the page filters on
    private async Task Summarize(DateTimeOffset now)
    {
        var characters = await warcraftCachedData.GetForeverStatsCharacters();
        var expired = characters.Where(c => now - c.SeenAt > KeepFor).ToList();
        await warcraftCachedData.RemoveForeverStatsCharacters(expired);
        var current = characters.Where(c => now - c.SeenAt <= KeepFor).ToList();

        var groups = current
            .GroupBy(c => (c.Region, c.RulesetId, c.RulesetName, c.Faction, c.ClassName, c.SpecName, c.RaceName))
            .Select(g => new ForeverStatsGroup
            {
                Region = g.Key.Region,
                RulesetId = g.Key.RulesetId,
                RulesetName = g.Key.RulesetName,
                Faction = g.Key.Faction,
                ClassName = g.Key.ClassName,
                SpecName = g.Key.SpecName,
                RaceName = g.Key.RaceName,
                Count = g.Count(),
            })
            .ToList();

        await warcraftCachedData.SaveForeverStatsSummary(new ForeverStatsSummary
        {
            UpdatedAt = now,
            Characters = current.Count,
            Guilds = current.Select(c => c.Region + ":" + c.GuildSlug).Distinct().Count(),
            SpecsPending = current.Count(c => !c.SpecChecked),
            Groups = groups,
        });
    }

    //The guild's slug, e.g. "olympus-prime". Profiles cached before GuildReference had a Slug
    //field don't carry it, but the guild's link always ends in it:
    //https://us.api.blizzard.com/data/wow/guild/olympus-prime?namespace=profile-forever-us
    public static string GuildSlugOf(GuildReference? guild)
    {
        if (guild == null)
        {
            return "";
        }
        if (!string.IsNullOrEmpty(guild.Slug))
        {
            return guild.Slug;
        }
        var href = guild.Key?.Href;
        if (href == null)
        {
            return "";
        }
        var lastSegment = href.Segments.LastOrDefault() ?? "";
        return Uri.UnescapeDataString(lastSegment.TrimEnd('/'));
    }

    private static string NameOf(Dictionary<int, string> names, int? id)
    {
        if (id != null && names.TryGetValue(id.Value, out var name))
        {
            return name;
        }
        return "Unknown";
    }

    private static ParallelOptions ParallelOptions(CancellationToken cancellationToken)
    {
        return new ParallelOptions { MaxDegreeOfParallelism = ParallelCalls, CancellationToken = cancellationToken };
    }
}

//Guilds waiting to be crawled because one of their members was just looked up. A guild queued
//in the last hour isn't queued again: it was just crawled, and the hourly run covers it after that.
public class ForeverStatsQueue
{
    private readonly Channel<(string Region, string GuildSlug)> guilds = Channel.CreateUnbounded<(string, string)>();
    private readonly ConcurrentDictionary<string, DateTimeOffset> queuedAt = new();

    public void QueueGuild(string region, string guildSlug)
    {
        if (guildSlug == "")
        {
            return;
        }
        var key = region + ":" + guildSlug;
        var now = DateTimeOffset.UtcNow;
        if (queuedAt.TryGetValue(key, out var last) && now - last < TimeSpan.FromHours(1))
        {
            return;
        }
        queuedAt[key] = now;
        guilds.Writer.TryWrite((region, guildSlug));
    }

    public ChannelReader<(string Region, string GuildSlug)> Reader => guilds.Reader;
}

//Runs ForeverStatsService: the whole sample on startup and then every hour, and any guild
//ForeverStatsQueue hands it as soon as it arrives. Guilds and rosters are cached for 12 hours
//and specs for 3 days, so most runs only fetch what is new. The two never run at once, since
//each ends by recounting the whole sample.
public class ForeverStatsJob(IServiceProvider serviceProvider, ForeverStatsQueue queue, ILogger<ForeverStatsJob> logger) : BackgroundService
{
    private readonly SemaphoreSlim oneAtATime = new(1, 1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        //the server finishes starting before the first run
        await Task.Yield();
        await Task.WhenAll(RunHourly(stoppingToken), RunQueued(stoppingToken));
    }

    private async Task RunHourly(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        do
        {
            await RunExclusively(service => service.Run(stoppingToken), stoppingToken);
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task RunQueued(CancellationToken stoppingToken)
    {
        await foreach (var (region, guildSlug) in queue.Reader.ReadAllAsync(stoppingToken))
        {
            await RunExclusively(service => service.CrawlGuildNow(region, guildSlug, stoppingToken), stoppingToken);
        }
    }

    private async Task RunExclusively(Func<ForeverStatsService, Task> work, CancellationToken stoppingToken)
    {
        await oneAtATime.WaitAsync(stoppingToken);
        try
        {
            using var scope = serviceProvider.CreateScope();
            await work(scope.ServiceProvider.GetRequiredService<ForeverStatsService>());
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Error building the Forever stats sample.");
        }
        finally
        {
            oneAtATime.Release();
        }
    }
}
