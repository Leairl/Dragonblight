using System.Text.Json;
using ArgentPonyWarcraftClient;
using Dragonblight_Website.Server.Helpers;
using StackExchange.Redis;

//Estimated cutoffs for the percentage titles: rank one on retail 3v3, Shuffle and Blitz, and rank
//one and Gladiator on classic 3v3. Recounted after every ladder sync, one spot per battle.net account.
partial class WarcraftRedisProxy
{
    private static string EstimateKey(string ladder, int achievementId, string region, GameFlavor flavor)
        => flavor.KeyPrefix() + "EstimatedCutoff-" + ladder + "-" + achievementId + "-" + region;

    private static string SpotsKey(string ladder, int cutoff, string region, GameFlavor flavor)
        => flavor.KeyPrefix() + "TitleSpots-" + ladder + "-" + cutoff + "-" + region;

    private static string HistoryKey(string ladder, int achievementId, string region, GameFlavor flavor)
        => flavor.KeyPrefix() + "EstimateHistory-" + ladder + "-" + achievementId + "-" + region;

    //rule 1-3: only the titles that are a share of the ladder
    private static bool IsEstimatedTitle(PvpSeasonReward reward, GameFlavor flavor)
    {
        var seasonal = PvpTitles.SeasonalTitles(reward.Achievement?.Name);
        if (seasonal == null)
        {
            return false;
        }
        var tier = seasonal.Value.tier;
        var type = reward.Bracket?.Type;
        if (flavor == GameFlavor.Retail)
        {
            if (type == "ARENA_3v3" && tier == PvpTitles.Tier.RankOne)
            {
                return true;
            }
            if (type == "SHUFFLE" && tier == PvpTitles.Tier.LegendRankOne)
            {
                return true;
            }
            if (type == "BLITZ" && tier == PvpTitles.Tier.BlitzRankOne)
            {
                return true;
            }
            return false;
        }
        if (type == "ARENA_3v3")
        {
            return tier == PvpTitles.Tier.RankOne || tier == PvpTitles.Tier.Gladiator;
        }
        return false;
    }

    //the ladder a reward is earned on: 3v3, rbg, or the spec's own Shuffle or Blitz ladder
    public async Task<string> RewardLadder(string bracketType, string region, int? specId, GameFlavor flavor)
    {
        var bracket = bracketType.Replace("ARENA_", "").Replace("BATTLEGROUNDS", "rbg");
        if (bracketType == "SHUFFLE" || bracketType == "BLITZ")
        {
            var spec = await PlayableSpecialization(specId ?? 0, region, flavor);
            bracket = LadderNames.ForSpec(LadderNames.BracketName(bracketType), spec?.PlayableClass?.Name, spec?.Name);
        }
        return bracket;
    }

    //inserts the battle.net account for each character, so alts can be counted under the same account
    // reads from the AltKey redis keys, which are set during the ladder sync
    private async Task<Dictionary<int, string>> GetAccountKeys(List<PvpLeaderboardEntry> entries, string region, GameFlavor flavor)
    {
        var db = redis.GetDatabase();
        var keys = entries
            .Select(e => (RedisKey)VersionedKey("AltKey" + e.Character.Realm.Slug.ToLowerInvariant() + e.Character.Name.ToLowerInvariant() + region + flavor.KeyPrefix()))
            .ToArray(); 
        var values = await db.StringGetAsync(keys);
        var accounts = new Dictionary<int, string>();
        for (var i = 0; i < entries.Count; i++)
        {
            //value of the altkey is the hash of the battle.net account to find mains and alts under
            var account = "char" + entries[i].Character.Id;
            if (values[i].HasValue)
            {
                account = values[i].ToString();
            }
            accounts[entries[i].Character.Id] = account;
        }
        //accounts here are the hashes of the battle.net accounts, not the characters themselves
        return accounts;
    }
    // finds the number of unique accounts inside the cutoff, including alts
    private async Task<int> GetSpots(string ladder, int cutoff, List<PvpLeaderboardEntry> entries, Dictionary<int, string> accounts, string region, GameFlavor flavor)
    {
        var db = redis.GetDatabase();
        var key = SpotsKey(ladder, cutoff, region, flavor);
        var saved = await db.StringGetAsync(key);
        if (saved.HasValue)
        {
            return (int)saved;
        }
        var seen = new HashSet<string>();
        foreach (var entry in entries.Where(e => e.Rating >= cutoff))
        {
            seen.Add(accounts[entry.Character.Id]);
        }
        await db.StringSetAsync(key, seen.Count, TimeSpan.FromDays(30));
        return seen.Count;
    }

    // walks the ladder until the number of unique accounts inside the cutoff is reached
    // counting alts and saving the last character's rating and rank
    private static EstimatedCutoff WalkSpots(List<PvpLeaderboardEntry> entries, Dictionary<int, string> accounts, int spots)
    {
        var estimate = new EstimatedCutoff { Spots = spots };
        if (spots == 0)
        {
            return estimate;
        }
        var seen = new HashSet<string>();
        var holders = new Dictionary<string, string>();
        foreach (var entry in entries)
        {
            var account = accounts[entry.Character.Id];
            var isAlt = !seen.Add(account);
            var mainName = "";
            if (isAlt)
            {
                estimate.AltsInside++;
                mainName = holders[account];
            }
            //the last account inside the cutoff sets the rating and rank
            else
            {
                holders[account] = entry.Character.Name;
                estimate.EstimatedRating = entry.Rating;
                estimate.EstimatedRank = entry.Rank;
            }
            //the estimate inside list is used to show the characters that hold the spots, and which are alts of those accounts
            estimate.Inside.Add(new EstimateInsideEntry
            {
                CharacterId = entry.Character.Id,
                Account = account,
                IsAlt = isAlt,
                Name = entry.Character.Name,
                Realm = entry.Character.Realm.Slug,
                Rank = entry.Rank,
                Rating = entry.Rating,
                MainName = mainName
            });
            //cutoff reached, but keep going to count alts of the accounts already inside
            if (!isAlt && seen.Count == spots)
            {
                break;
            }
        }
        return estimate;
    }

    private static void CompareWithPrevious(EstimatedCutoff estimate, EstimatedCutoff previous)
    {
        estimate.PreviousRank = previous.EstimatedRank;
        estimate.PreviousRating = previous.EstimatedRating;
        //list of character in the previous estimate and the new one, to see which alts entered or left, and which accounts changed holders
        var nowIds = estimate.Inside.Select(i => i.CharacterId).ToHashSet();
        var beforeIds = previous.Inside.Select(i => i.CharacterId).ToHashSet();
        //set of main characters inside the cutoff, to see which accounts entered or left. One id per account, alts are ignored
        var nowHolders = estimate.Inside.Where(i => !i.IsAlt).ToDictionary(i => i.Account, i => i.CharacterId);
        var beforeHolders = previous.Inside.Where(i => !i.IsAlt).ToDictionary(i => i.Account, i => i.CharacterId);

        estimate.AltsLeft = previous.Inside.Count(i => i.IsAlt && !nowIds.Contains(i.CharacterId));
        estimate.AltsEntered = estimate.Inside.Count(i => i.IsAlt && !beforeIds.Contains(i.CharacterId));
        estimate.AccountsEntered = nowHolders.Keys.Count(a => !beforeHolders.ContainsKey(a));
        estimate.AccountsLeft = beforeHolders.Keys.Count(a => !nowHolders.ContainsKey(a));
        //holderreplaced looks at the current sync and says on this entry does it have the same b.net hash, if so save to before. 
        //if before has a different id it just moved one alt to a main
        estimate.HoldersReplaced = nowHolders.Count(h => beforeHolders.TryGetValue(h.Key, out var before) && before != h.Value);
    }

    // shows 300 syncs on the timeline graph at a maximum and expires after 30 days.
    private async Task AddEstimateHistory(EstimatedCutoff estimate, string region, GameFlavor flavor)
    {
        var db = redis.GetDatabase();
        var key = HistoryKey(estimate.Bracket, estimate.AchievementId, region, flavor);
        var point = new EstimateHistoryPoint
        {
            Time = DateTimeOffset.UtcNow,
            EstimatedRating = estimate.EstimatedRating,
            EstimatedRank = estimate.EstimatedRank,
            RatingCutoff = estimate.RatingCutoff,
            Spots = estimate.Spots,
            AltsInside = estimate.AltsInside
        };
        await db.ListRightPushAsync(key, JsonSerializer.Serialize(point));
        await db.ListTrimAsync(key, -300, -1);
        await db.KeyExpireAsync(key, TimeSpan.FromDays(30));
    }

    //historykey holds data for each sync and each point is the data from that bracket at a specific timestamp
    public async Task<EstimateDetail> GetEstimateDetail(string bracket, int achievementId, string region, GameFlavor flavor)
    {
        var detail = new EstimateDetail();
        detail.Estimate = await GetRedisData<EstimatedCutoff>(EstimateKey(bracket, achievementId, region, flavor));
        var db = redis.GetDatabase();
        var points = await db.ListRangeAsync(HistoryKey(bracket, achievementId, region, flavor));
        foreach (var point in points)
        {
            var parsed = JsonSerializer.Deserialize<EstimateHistoryPoint>(point.ToString());
            if (parsed != null)
            {
                detail.History.Add(parsed);
            }
        }
        return detail;
    }

    //runs at the end of a ladder sync, once every character on it is filed under its account
    public async Task UpdateEstimatedCutoffs(string bracket, string region, PvpLeaderboardEntry[] ladder, GameFlavor flavor)
    {
        var rewards = await GetPvPRewards(region, flavor);
        var entries = ladder.Where(e => e != null).OrderBy(e => e.Rank).ToList();
        Dictionary<int, string>? accounts = null;
        var cutoffsDone = new HashSet<int>();
        foreach (var reward in rewards?.Rewards ?? [])
        {
            // only titles we want
            if (!IsEstimatedTitle(reward, flavor))
            {
                continue;
            }
            // makes sure we are only doing the estimate for that bracket
            if (await RewardLadder(reward.Bracket.Type, region, reward.Specialization?.Id, flavor) != bracket)
            {
                continue;
            }
            //blitz has two cutoffs for each faction, so we only do one estimate
            if (!cutoffsDone.Add(reward.RatingCutoff))
            {
                continue;
            }
            //makes sure we use the same account dictionary for all rewards
            if (accounts == null)
            {
                accounts = await GetAccountKeys(entries, region, flavor);
            }
            //getting out of blizzards cache
            // so the estimate can be saved for the next sync without having to walk the ladder again
            var spots = await GetSpots(bracket, reward.RatingCutoff, entries, accounts, region, flavor);
            var estimate = WalkSpots(entries, accounts, spots);
            estimate.Title = reward.Achievement?.Name ?? "";
            estimate.Bracket = bracket;
            estimate.RatingCutoff = reward.RatingCutoff;
            estimate.AchievementId = reward.Achievement?.Id ?? 0;

            var key = EstimateKey(bracket, estimate.AchievementId, region, flavor);
            //previous sync's estimate, to compare with the new one and see what changed
            var previous = await GetRedisData<EstimatedCutoff>(key);
            if (previous != null)
            {
                CompareWithPrevious(estimate, previous);
            }
            await SaveToRedis(key, estimate, TimeSpan.FromDays(30));
            await AddEstimateHistory(estimate, region, flavor);
        }
    }

    //every saved estimate for the region, without the inside lists the page doesn't need
    public async Task<List<EstimatedCutoff>> GetEstimatedCutoffs(string region, GameFlavor flavor)
    {
        var rewards = await GetPvPRewards(region, flavor);
        var estimates = new List<EstimatedCutoff>();
        foreach (var reward in rewards?.Rewards ?? [])
        {
            if (!IsEstimatedTitle(reward, flavor))
            {
                continue;
            }
            var ladder = await RewardLadder(reward.Bracket.Type, region, reward.Specialization?.Id, flavor);
            //the other Blitz faction was never saved, so it comes back null here
            var estimate = await GetRedisData<EstimatedCutoff>(EstimateKey(ladder, reward.Achievement?.Id ?? 0, region, flavor));
            if (estimate == null)
            {
                continue;
            }
            estimate.Inside = [];
            estimates.Add(estimate);
        }
        return estimates;
    }
}
