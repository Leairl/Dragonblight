using System.Text.Json;
using ArgentPonyWarcraftClient;

//PvP ladders, seasons and rewards. The ladders and seasons come from Blizzard and are cached;
//ladder history is our own record, kept as Redis lists.
partial class WarcraftRedisProxy
{
    public async Task<PvpLeaderboard> Get2v2Leaderboard(string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        var ns = GetDynamicRegion(region, flavor);
        return await GetBlizzardDataCached<PvpLeaderboard>("get2v2Leaderboard" + ns, async () =>
        {
            var curr2v2Leaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, flavor), "2v2", ns, GetRegion(ns), GetLocale(ns));
            return curr2v2Leaderboard.Value;
        }, TimeSpan.FromHours(3)); //uses getredisproxy generic type of pvpleaderboard to get rbg ladder + region from redis
    }
    
    public async Task<PvpLeaderboard> Get3v3Leaderboard(string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        var ns = GetDynamicRegion(region, flavor);
        return await GetBlizzardDataCached<PvpLeaderboard>("get3v3Leaderboard" + ns, async () =>
        {
            var curr3v3Leaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, flavor), "3v3", ns, GetRegion(ns), GetLocale(ns));
            return curr3v3Leaderboard.Value;
        }, TimeSpan.FromHours(3)); //uses getredisproxy generic type of pvpleaderboard to get rbg ladder + region from redis
    }


    public async Task<PvpLeaderboard> Get5v5Leaderboard(string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        var ns = GetDynamicRegion(region, flavor);
        return await GetBlizzardDataCached<PvpLeaderboard>("get5v5Leaderboard" + ns, async () =>
        {
            var curr5v5Leaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, flavor), "5v5", ns, GetRegion(ns), GetLocale(ns));
            return curr5v5Leaderboard.Value;
        }, TimeSpan.FromHours(3)); //uses getredisproxy generic type of pvpleaderboard to get rbg ladder + region from redis
    }

    public async Task<PvpLeaderboard> GetRBGLeaderboard(string region, GameFlavor flavor = GameFlavor.MistsClassic) //get rbgLeaderboard in redis
    {
        var ns = GetDynamicRegion(region, flavor);
        return await GetBlizzardDataCached<PvpLeaderboard>("currRbgLadder" + ns, async () =>
        {
            var currRbgLadder = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, flavor), "rbg", ns, GetRegion(ns), GetLocale(ns));
            return currRbgLadder.Value;
        }, TimeSpan.FromHours(3)); //uses getredisproxy generic type of pvpleaderboard to get rbg ladder + region from redis
    }
    public async Task<PvpRewardsIndex> GetPvPRewards(string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {

        var ns = GetDynamicRegion(region, flavor);
        int season = await GetSeason(region, flavor);
        return await GetBlizzardDataCached<PvpRewardsIndex>("GetPvPRewards" + season + ns, async () =>
        {
            var ActivePvpRewards = await warcraftClient.GetPvpRewardsIndexAsync(season, ns, GetRegion(ns), GetLocale(ns));
            return ActivePvpRewards.Value;
        }, TimeSpan.FromHours(6)); //uses getredisproxy generic type of pvpleaderboard to get rbg ladder + region from redis
    }
    public async Task AddToLadderHistory(string key, string region, PvpLeaderboard currLadder, GameFlavor flavor = GameFlavor.MistsClassic) //get rbgLeaderboard in redis
    {
        var currLadderAndTime = new PvpLeaderboardAndTime
        {
            Entries = currLadder.Entries,
            Links = currLadder.Links,
            Name = currLadder.Name,
            Season = currLadder.Season,
            Time = DateTime.Now
        };
        var db = redis.GetDatabase();
        await db.ListRightPushAsync(flavor.KeyPrefix() + key + region, JsonSerializer.Serialize(currLadderAndTime));
    }

    public async Task<IEnumerable<PvpLeaderboardAndTime?>> GetLadderHistory(string key, string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        region = GetDynamicRegion(region, flavor);
        var db = redis.GetDatabase(); //var to redis database
        string keyAndRegion = flavor.KeyPrefix() + key + region;

        var ladder = await db.ListRangeAsync(keyAndRegion);
        //convert player to pvpleaderboardentry (for our filtered list of strings)
        return ladder.Where(p => p.HasValue).Select(player =>
        {
            //deserialized out of json to become an object.
            return JsonSerializer.Deserialize<PvpLeaderboardAndTime>(player!.ToString());
        }).ToList();
    }

    //seasons differ per flavor, so the namespace is derived here rather than assumed
    public async Task<int> GetSeason(string region, GameFlavor flavor = GameFlavor.MistsClassic) // get currSeason in redis
    {
        var ns = GetDynamicRegion(region, flavor);
        return await GetBlizzardDataCached<int>("GetCurrSeason" + ns, async () =>
        {
            var GetCurrSeason = await warcraftClient.GetPvpSeasonsIndexAsync(ns, GetRegion(ns), GetLocale(ns));
            return GetCurrSeason.Value.CurrentSeason.Id;
        }, TimeSpan.FromDays(1)); //uses getredisproxy generic type of pvpleaderboard to get rbg ladder + region from redis
    }
    //when the current season began, so season achievements can be told apart from last season's
    //nullable so a cache miss reads as null and reaches Blizzard; a bare DateTimeOffset would read as year 1
    public async Task<DateTimeOffset?> GetSeasonStart(string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        var ns = GetDynamicRegion(region, flavor);
        int season = await GetSeason(region, flavor);
        return await GetBlizzardDataCached<DateTimeOffset?>("GetSeasonStart" + season + ns, async () =>
        {
            var currSeason = await warcraftClient.GetPvpSeasonAsync(season, ns, GetRegion(ns), GetLocale(ns));
            return currSeason.Success ? currSeason.Value.SeasonStartTimestamp : null;
        }, TimeSpan.FromDays(1));
    }

    public async Task ClearLeaderboard(string bracket, string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        region = GetDynamicRegion(region, flavor);
        string key = "";
        if (bracket == "rbg")
        {
            key = "currRbgLadder" + region;
        }
        if (bracket == "shuffle-warrior-fury")
        {
            key = "getShuffleWarriorFuryLeaderboard" + region;
        }
        if (bracket == "shuffle-deathknight-blood")
        {
            key = "getShuffleDeathKnightBloodLeaderboard" + region;
        }
        if (bracket == "shuffle-deathknight-frost")
        {
            key = "getShuffleDeathKnightFrostLeaderboard" + region;
        }
        if (bracket == "shuffle-deathknight-unholy")
        {
            key = "getShuffleDeathKnightUnholyLeaderboard" + region;
        }
        if (bracket == "shuffle-demonhunter-devourer")
        {
            key = "getShuffleDemonHunterDevourerLeaderboard" + region;
        }
        if (bracket == "shuffle-demonhunter-havoc")
        {
            key = "getShuffleDemonHunterHavocLeaderboard" + region;
        }
        if (bracket == "shuffle-demonhunter-vengeance")
        {
            key = "getShuffleDemonHunterVengeanceLeaderboard" + region;
        }
        if (bracket == "shuffle-druid-balance")
        {
            key = "getShuffleDruidBalanceLeaderboard" + region;
        }
        if (bracket == "shuffle-druid-feral")
        {
            key = "getShuffleDruidFeralLeaderboard" + region;
        }
        if (bracket == "shuffle-druid-guardian")
        {
            key = "getShuffleDruidGuardianLeaderboard" + region;
        }
        if (bracket == "shuffle-druid-restoration")
        {
            key = "getShuffleDruidRestorationLeaderboard" + region;
        }
        if (bracket == "shuffle-evoker-devastation")
        {
            key = "getShuffleEvokerDevastationLeaderboard" + region;
        }
        if (bracket == "shuffle-evoker-preservation")
        {
            key = "getShuffleEvokerPreservationLeaderboard" + region;
        }
        if (bracket == "shuffle-evoker-augmentation")
        {
            key = "getShuffleEvokerAugmentationLeaderboard" + region;
        }
        if (bracket == "shuffle-hunter-beastmastery")
        {
            key = "getShuffleHunterBeastMasteryLeaderboard" + region;
        }
        if (bracket == "shuffle-hunter-marksmanship")
        {
            key = "getShuffleHunterMarksmanshipLeaderboard" + region;
        }
        if (bracket == "shuffle-hunter-survival")
        {
            key = "getShuffleHunterSurvivalLeaderboard" + region;
        }
        if (bracket == "shuffle-mage-arcane")
        {
            key = "getShuffleMageArcaneLeaderboard" + region;
        }
        if (bracket == "shuffle-mage-fire")
        {
            key = "getShuffleMageFireLeaderboard" + region;
        }
        if (bracket == "shuffle-mage-frost")
        {
            key = "getShuffleMageFrostLeaderboard" + region;
        }
        if (bracket == "shuffle-monk-brewmaster")
        {
            key = "getShuffleMonkBrewmasterLeaderboard" + region;
        }
        if (bracket == "shuffle-monk-windwalker")
        {
            key = "getShuffleMonkWindwalkerLeaderboard" + region;
        }
        if (bracket == "shuffle-monk-mistweaver")
        {
            key = "getShuffleMonkMistweaverLeaderboard" + region;
        }
        if (bracket == "shuffle-paladin-holy")
        {
            key = "getShufflePaladinHolyLeaderboard" + region;
        }
        if (bracket == "shuffle-paladin-protection")
        {
            key = "getShufflePaladinProtectionLeaderboard" + region;
        }
        if (bracket == "shuffle-paladin-retribution")
        {
            key = "getShufflePaladinRetributionLeaderboard" + region;
        }
        if (bracket == "shuffle-priest-discipline")
        {
            key = "getShufflePriestDisciplineLeaderboard" + region;
        }
        if (bracket == "shuffle-priest-holy")
        {
            key = "getShufflePriestHolyLeaderboard" + region;
        }
        if (bracket == "shuffle-priest-shadow")
        {
            key = "getShufflePriestShadowLeaderboard" + region;
        }
        if (bracket == "shuffle-rogue-assassination")
        {
            key = "getShuffleRogueAssassinationLeaderboard" + region;
        }
        if (bracket == "shuffle-rogue-outlaw")
        {
            key = "getShuffleRogueOutlawLeaderboard" + region;
        }
        if (bracket == "shuffle-rogue-subtlety")
        {
            key = "getShuffleRogueSubtletyLeaderboard" + region;
        }
        if (bracket == "shuffle-shaman-elemental")
        {
            key = "getShuffleShamanElementalLeaderboard" + region;
        }
        if (bracket == "shuffle-shaman-enhancement")
        {
            key = "getShuffleShamanEnhancementLeaderboard" + region;
        }
        if (bracket == "shuffle-shaman-restoration")
        {
            key = "getShuffleShamanRestorationLeaderboard" + region;
        }
        if (bracket == "shuffle-warlock-affliction")
        {
            key = "getShuffleWarlockAfflictionLeaderboard" + region;
        }
        if (bracket == "shuffle-warlock-demonology")
        {
            key = "getShuffleWarlockDemonologyLeaderboard" + region;
        }
        if (bracket == "shuffle-warlock-destruction")
        {
            key = "getShuffleWarlockDestructionLeaderboard" + region;
        }
        if (bracket == "shuffle-warrior-arms")
        {
            key = "getShuffleWarriorArmsLeaderboard" + region;
        }
        if (bracket == "shuffle-warrior-protection")
        {
            key = "getShuffleWarriorProtectionLeaderboard" + region;
        }
        if (bracket == "2v2")
        {
            key = "get2v2Leaderboard" + region;
        }
        if (bracket == "3v3")
        {
            key = "get3v3Leaderboard" + region;
        }
        if (bracket == "5v5")
        {
            key = "get5v5Leaderboard" + region;
        }
        var db = redis.GetDatabase();
        await db.KeyDeleteAsync(VersionedKey(key));
    }
}
