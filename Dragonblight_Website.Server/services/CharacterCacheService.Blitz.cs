using ArgentPonyWarcraftClient;

//Blitz ladder syncs. Blitz keeps a separate ladder per spec, so each spec gets its own
//Cache method here; CacheAllLadders calls them on retail passes only.
partial class CharacterCacheService
{
    public async Task CacheBlitzWarriorFuryLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzWarriorFuryLeaderboard method in warcraftclient
            var oldleaderboardBlitzWarriorFury = await redisProxy.GetBlitzWarriorFuryLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-warrior-fury", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzWarriorFury = await redisProxy.GetBlitzWarriorFuryLeaderboard(region);
            await BatchCacheCharSummary("blitz-warrior-fury", region, oldleaderboardBlitzWarriorFury.Entries.ToArray(), newleaderboardBlitzWarriorFury.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzWarriorFuryLadder");
        }
    }
    public async Task CacheBlitzDeathKnightBloodLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzDeathKnightBloodLeaderboard method in warcraftclient
            var oldleaderboardBlitzDeathKnightBlood = await redisProxy.GetBlitzDeathKnightBloodLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-deathknight-blood", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzDeathKnightBlood = await redisProxy.GetBlitzDeathKnightBloodLeaderboard(region);
            await BatchCacheCharSummary("blitz-deathknight-blood", region, oldleaderboardBlitzDeathKnightBlood.Entries.ToArray(), newleaderboardBlitzDeathKnightBlood.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzDeathKnightBloodLadder");
        }
    }
    public async Task CacheBlitzDeathKnightFrostLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzDeathKnightFrostLeaderboard method in warcraftclient
            var oldleaderboardBlitzDeathKnightFrost = await redisProxy.GetBlitzDeathKnightFrostLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-deathknight-frost", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzDeathKnightFrost = await redisProxy.GetBlitzDeathKnightFrostLeaderboard(region);
            await BatchCacheCharSummary("blitz-deathknight-frost", region, oldleaderboardBlitzDeathKnightFrost.Entries.ToArray(), newleaderboardBlitzDeathKnightFrost.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzDeathKnightFrostLadder");
        }
    }
    public async Task CacheBlitzDeathKnightUnholyLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzDeathKnightUnholyLeaderboard method in warcraftclient
            var oldleaderboardBlitzDeathKnightUnholy = await redisProxy.GetBlitzDeathKnightUnholyLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-deathknight-unholy", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzDeathKnightUnholy = await redisProxy.GetBlitzDeathKnightUnholyLeaderboard(region);
            await BatchCacheCharSummary("blitz-deathknight-unholy", region, oldleaderboardBlitzDeathKnightUnholy.Entries.ToArray(), newleaderboardBlitzDeathKnightUnholy.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzDeathKnightUnholyLadder");
        }
    }
    public async Task CacheBlitzDemonHunterDevourerLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzDemonHunterDevourerLeaderboard method in warcraftclient
            var oldleaderboardBlitzDemonHunterDevourer = await redisProxy.GetBlitzDemonHunterDevourerLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-demonhunter-devourer", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzDemonHunterDevourer = await redisProxy.GetBlitzDemonHunterDevourerLeaderboard(region);
            await BatchCacheCharSummary("blitz-demonhunter-devourer", region, oldleaderboardBlitzDemonHunterDevourer.Entries.ToArray(), newleaderboardBlitzDemonHunterDevourer.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzDemonHunterDevourerLadder");
        }
    }
    public async Task CacheBlitzDemonHunterHavocLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzDemonHunterHavocLeaderboard method in warcraftclient
            var oldleaderboardBlitzDemonHunterHavoc = await redisProxy.GetBlitzDemonHunterHavocLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-demonhunter-havoc", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzDemonHunterHavoc = await redisProxy.GetBlitzDemonHunterHavocLeaderboard(region);
            await BatchCacheCharSummary("blitz-demonhunter-havoc", region, oldleaderboardBlitzDemonHunterHavoc.Entries.ToArray(), newleaderboardBlitzDemonHunterHavoc.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzDemonHunterHavocLadder");
        }
    }
    public async Task CacheBlitzDemonHunterVengeanceLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzDemonHunterVengeanceLeaderboard method in warcraftclient
            var oldleaderboardBlitzDemonHunterVengeance = await redisProxy.GetBlitzDemonHunterVengeanceLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-demonhunter-vengeance", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzDemonHunterVengeance = await redisProxy.GetBlitzDemonHunterVengeanceLeaderboard(region);
            await BatchCacheCharSummary("blitz-demonhunter-vengeance", region, oldleaderboardBlitzDemonHunterVengeance.Entries.ToArray(), newleaderboardBlitzDemonHunterVengeance.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzDemonHunterVengeanceLadder");
        }
    }
    public async Task CacheBlitzDruidBalanceLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzDruidBalanceLeaderboard method in warcraftclient
            var oldleaderboardBlitzDruidBalance = await redisProxy.GetBlitzDruidBalanceLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-druid-balance", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzDruidBalance = await redisProxy.GetBlitzDruidBalanceLeaderboard(region);
            await BatchCacheCharSummary("blitz-druid-balance", region, oldleaderboardBlitzDruidBalance.Entries.ToArray(), newleaderboardBlitzDruidBalance.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzDruidBalanceLadder");
        }
    }
    public async Task CacheBlitzDruidFeralLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzDruidFeralLeaderboard method in warcraftclient
            var oldleaderboardBlitzDruidFeral = await redisProxy.GetBlitzDruidFeralLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-druid-feral", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzDruidFeral = await redisProxy.GetBlitzDruidFeralLeaderboard(region);
            await BatchCacheCharSummary("blitz-druid-feral", region, oldleaderboardBlitzDruidFeral.Entries.ToArray(), newleaderboardBlitzDruidFeral.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzDruidFeralLadder");
        }
    }
    public async Task CacheBlitzDruidGuardianLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzDruidGuardianLeaderboard method in warcraftclient
            var oldleaderboardBlitzDruidGuardian = await redisProxy.GetBlitzDruidGuardianLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-druid-guardian", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzDruidGuardian = await redisProxy.GetBlitzDruidGuardianLeaderboard(region);
            await BatchCacheCharSummary("blitz-druid-guardian", region, oldleaderboardBlitzDruidGuardian.Entries.ToArray(), newleaderboardBlitzDruidGuardian.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzDruidGuardianLadder");
        }
    }
    public async Task CacheBlitzDruidRestorationLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzDruidRestorationLeaderboard method in warcraftclient
            var oldleaderboardBlitzDruidRestoration = await redisProxy.GetBlitzDruidRestorationLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-druid-restoration", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzDruidRestoration = await redisProxy.GetBlitzDruidRestorationLeaderboard(region);
            await BatchCacheCharSummary("blitz-druid-restoration", region, oldleaderboardBlitzDruidRestoration.Entries.ToArray(), newleaderboardBlitzDruidRestoration.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzDruidRestorationLadder");
        }
    }
    public async Task CacheBlitzEvokerDevastationLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzEvokerDevastationLeaderboard method in warcraftclient
            var oldleaderboardBlitzEvokerDevastation = await redisProxy.GetBlitzEvokerDevastationLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-evoker-devastation", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzEvokerDevastation = await redisProxy.GetBlitzEvokerDevastationLeaderboard(region);
            await BatchCacheCharSummary("blitz-evoker-devastation", region, oldleaderboardBlitzEvokerDevastation.Entries.ToArray(), newleaderboardBlitzEvokerDevastation.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzEvokerDevastationLadder");
        }
    }
    public async Task CacheBlitzEvokerPreservationLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzEvokerPreservationLeaderboard method in warcraftclient
            var oldleaderboardBlitzEvokerPreservation = await redisProxy.GetBlitzEvokerPreservationLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-evoker-preservation", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzEvokerPreservation = await redisProxy.GetBlitzEvokerPreservationLeaderboard(region);
            await BatchCacheCharSummary("blitz-evoker-preservation", region, oldleaderboardBlitzEvokerPreservation.Entries.ToArray(), newleaderboardBlitzEvokerPreservation.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzEvokerPreservationLadder");
        }
    }
    public async Task CacheBlitzEvokerAugmentationLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzEvokerAugmentationLeaderboard method in warcraftclient
            var oldleaderboardBlitzEvokerAugmentation = await redisProxy.GetBlitzEvokerAugmentationLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-evoker-augmentation", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzEvokerAugmentation = await redisProxy.GetBlitzEvokerAugmentationLeaderboard(region);
            await BatchCacheCharSummary("blitz-evoker-augmentation", region, oldleaderboardBlitzEvokerAugmentation.Entries.ToArray(), newleaderboardBlitzEvokerAugmentation.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzEvokerAugmentationLadder");
        }
    }
    public async Task CacheBlitzHunterBeastMasteryLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzHunterBeastMasteryLeaderboard method in warcraftclient
            var oldleaderboardBlitzHunterBeastMastery = await redisProxy.GetBlitzHunterBeastMasteryLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-hunter-beastmastery", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzHunterBeastMastery = await redisProxy.GetBlitzHunterBeastMasteryLeaderboard(region);
            await BatchCacheCharSummary("blitz-hunter-beastmastery", region, oldleaderboardBlitzHunterBeastMastery.Entries.ToArray(), newleaderboardBlitzHunterBeastMastery.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzHunterBeastMasteryLadder");
        }
    }
    public async Task CacheBlitzHunterMarksmanshipLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzHunterMarksmanshipLeaderboard method in warcraftclient
            var oldleaderboardBlitzHunterMarksmanship = await redisProxy.GetBlitzHunterMarksmanshipLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-hunter-marksmanship", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzHunterMarksmanship = await redisProxy.GetBlitzHunterMarksmanshipLeaderboard(region);
            await BatchCacheCharSummary("blitz-hunter-marksmanship", region, oldleaderboardBlitzHunterMarksmanship.Entries.ToArray(), newleaderboardBlitzHunterMarksmanship.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzHunterMarksmanshipLadder");
        }
    }
    public async Task CacheBlitzHunterSurvivalLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzHunterSurvivalLeaderboard method in warcraftclient
            var oldleaderboardBlitzHunterSurvival = await redisProxy.GetBlitzHunterSurvivalLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-hunter-survival", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzHunterSurvival = await redisProxy.GetBlitzHunterSurvivalLeaderboard(region);
            await BatchCacheCharSummary("blitz-hunter-survival", region, oldleaderboardBlitzHunterSurvival.Entries.ToArray(), newleaderboardBlitzHunterSurvival.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzHunterSurvivalLadder");
        }
    }
    public async Task CacheBlitzMageArcaneLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzMageArcaneLeaderboard method in warcraftclient
            var oldleaderboardBlitzMageArcane = await redisProxy.GetBlitzMageArcaneLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-mage-arcane", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzMageArcane = await redisProxy.GetBlitzMageArcaneLeaderboard(region);
            await BatchCacheCharSummary("blitz-mage-arcane", region, oldleaderboardBlitzMageArcane.Entries.ToArray(), newleaderboardBlitzMageArcane.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzMageArcaneLadder");
        }
    }
    public async Task CacheBlitzMageFireLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzMageFireLeaderboard method in warcraftclient
            var oldleaderboardBlitzMageFire = await redisProxy.GetBlitzMageFireLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-mage-fire", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzMageFire = await redisProxy.GetBlitzMageFireLeaderboard(region);
            await BatchCacheCharSummary("blitz-mage-fire", region, oldleaderboardBlitzMageFire.Entries.ToArray(), newleaderboardBlitzMageFire.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzMageFireLadder");
        }
    }
    public async Task CacheBlitzMageFrostLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzMageFrostLeaderboard method in warcraftclient
            var oldleaderboardBlitzMageFrost = await redisProxy.GetBlitzMageFrostLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-mage-frost", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzMageFrost = await redisProxy.GetBlitzMageFrostLeaderboard(region);
            await BatchCacheCharSummary("blitz-mage-frost", region, oldleaderboardBlitzMageFrost.Entries.ToArray(), newleaderboardBlitzMageFrost.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzMageFrostLadder");
        }
    }
    public async Task CacheBlitzMonkBrewmasterLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzMonkBrewmasterLeaderboard method in warcraftclient
            var oldleaderboardBlitzMonkBrewmaster = await redisProxy.GetBlitzMonkBrewmasterLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-monk-brewmaster", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzMonkBrewmaster = await redisProxy.GetBlitzMonkBrewmasterLeaderboard(region);
            await BatchCacheCharSummary("blitz-monk-brewmaster", region, oldleaderboardBlitzMonkBrewmaster.Entries.ToArray(), newleaderboardBlitzMonkBrewmaster.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzMonkBrewmasterLadder");
        }
    }
    public async Task CacheBlitzMonkWindwalkerLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzMonkWindwalkerLeaderboard method in warcraftclient
            var oldleaderboardBlitzMonkWindwalker = await redisProxy.GetBlitzMonkWindwalkerLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-monk-windwalker", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzMonkWindwalker = await redisProxy.GetBlitzMonkWindwalkerLeaderboard(region);
            await BatchCacheCharSummary("blitz-monk-windwalker", region, oldleaderboardBlitzMonkWindwalker.Entries.ToArray(), newleaderboardBlitzMonkWindwalker.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzMonkWindwalkerLadder");
        }
    }
    public async Task CacheBlitzMonkMistweaverLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzMonkMistweaverLeaderboard method in warcraftclient
            var oldleaderboardBlitzMonkMistweaver = await redisProxy.GetBlitzMonkMistweaverLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-monk-mistweaver", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzMonkMistweaver = await redisProxy.GetBlitzMonkMistweaverLeaderboard(region);
            await BatchCacheCharSummary("blitz-monk-mistweaver", region, oldleaderboardBlitzMonkMistweaver.Entries.ToArray(), newleaderboardBlitzMonkMistweaver.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzMonkMistweaverLadder");
        }
    }
    public async Task CacheBlitzPaladinHolyLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzPaladinHolyLeaderboard method in warcraftclient
            var oldleaderboardBlitzPaladinHoly = await redisProxy.GetBlitzPaladinHolyLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-paladin-holy", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzPaladinHoly = await redisProxy.GetBlitzPaladinHolyLeaderboard(region);
            await BatchCacheCharSummary("blitz-paladin-holy", region, oldleaderboardBlitzPaladinHoly.Entries.ToArray(), newleaderboardBlitzPaladinHoly.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzPaladinHolyLadder");
        }
    }
    public async Task CacheBlitzPaladinProtectionLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzPaladinProtectionLeaderboard method in warcraftclient
            var oldleaderboardBlitzPaladinProtection = await redisProxy.GetBlitzPaladinProtectionLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-paladin-protection", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzPaladinProtection = await redisProxy.GetBlitzPaladinProtectionLeaderboard(region);
            await BatchCacheCharSummary("blitz-paladin-protection", region, oldleaderboardBlitzPaladinProtection.Entries.ToArray(), newleaderboardBlitzPaladinProtection.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzPaladinProtectionLadder");
        }
    }
    public async Task CacheBlitzPaladinRetributionLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzPaladinRetributionLeaderboard method in warcraftclient
            var oldleaderboardBlitzPaladinRetribution = await redisProxy.GetBlitzPaladinRetributionLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-paladin-retribution", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzPaladinRetribution = await redisProxy.GetBlitzPaladinRetributionLeaderboard(region);
            await BatchCacheCharSummary("blitz-paladin-retribution", region, oldleaderboardBlitzPaladinRetribution.Entries.ToArray(), newleaderboardBlitzPaladinRetribution.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzPaladinRetributionLadder");
        }
    }
    public async Task CacheBlitzPriestDisciplineLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzPriestDisciplineLeaderboard method in warcraftclient
            var oldleaderboardBlitzPriestDiscipline = await redisProxy.GetBlitzPriestDisciplineLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-priest-discipline", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzPriestDiscipline = await redisProxy.GetBlitzPriestDisciplineLeaderboard(region);
            await BatchCacheCharSummary("blitz-priest-discipline", region, oldleaderboardBlitzPriestDiscipline.Entries.ToArray(), newleaderboardBlitzPriestDiscipline.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzPriestDisciplineLadder");
        }
    }
    public async Task CacheBlitzPriestHolyLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzPriestHolyLeaderboard method in warcraftclient
            var oldleaderboardBlitzPriestHoly = await redisProxy.GetBlitzPriestHolyLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-priest-holy", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzPriestHoly = await redisProxy.GetBlitzPriestHolyLeaderboard(region);
            await BatchCacheCharSummary("blitz-priest-holy", region, oldleaderboardBlitzPriestHoly.Entries.ToArray(), newleaderboardBlitzPriestHoly.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzPriestHolyLadder");
        }
    }
    public async Task CacheBlitzPriestShadowLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzPriestShadowLeaderboard method in warcraftclient
            var oldleaderboardBlitzPriestShadow = await redisProxy.GetBlitzPriestShadowLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-priest-shadow", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzPriestShadow = await redisProxy.GetBlitzPriestShadowLeaderboard(region);
            await BatchCacheCharSummary("blitz-priest-shadow", region, oldleaderboardBlitzPriestShadow.Entries.ToArray(), newleaderboardBlitzPriestShadow.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzPriestShadowLadder");
        }
    }
    public async Task CacheBlitzRogueAssassinationLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzRogueAssassinationLeaderboard method in warcraftclient
            var oldleaderboardBlitzRogueAssassination = await redisProxy.GetBlitzRogueAssassinationLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-rogue-assassination", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzRogueAssassination = await redisProxy.GetBlitzRogueAssassinationLeaderboard(region);
            await BatchCacheCharSummary("blitz-rogue-assassination", region, oldleaderboardBlitzRogueAssassination.Entries.ToArray(), newleaderboardBlitzRogueAssassination.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzRogueAssassinationLadder");
        }
    }
    public async Task CacheBlitzRogueOutlawLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzRogueOutlawLeaderboard method in warcraftclient
            var oldleaderboardBlitzRogueOutlaw = await redisProxy.GetBlitzRogueOutlawLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-rogue-outlaw", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzRogueOutlaw = await redisProxy.GetBlitzRogueOutlawLeaderboard(region);
            await BatchCacheCharSummary("blitz-rogue-outlaw", region, oldleaderboardBlitzRogueOutlaw.Entries.ToArray(), newleaderboardBlitzRogueOutlaw.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzRogueOutlawLadder");
        }
    }
    public async Task CacheBlitzRogueSubtletyLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzRogueSubtletyLeaderboard method in warcraftclient
            var oldleaderboardBlitzRogueSubtlety = await redisProxy.GetBlitzRogueSubtletyLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-rogue-subtlety", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzRogueSubtlety = await redisProxy.GetBlitzRogueSubtletyLeaderboard(region);
            await BatchCacheCharSummary("blitz-rogue-subtlety", region, oldleaderboardBlitzRogueSubtlety.Entries.ToArray(), newleaderboardBlitzRogueSubtlety.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzRogueSubtletyLadder");
        }
    }
    public async Task CacheBlitzShamanElementalLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzShamanElementalLeaderboard method in warcraftclient
            var oldleaderboardBlitzShamanElemental = await redisProxy.GetBlitzShamanElementalLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-shaman-elemental", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzShamanElemental = await redisProxy.GetBlitzShamanElementalLeaderboard(region);
            await BatchCacheCharSummary("blitz-shaman-elemental", region, oldleaderboardBlitzShamanElemental.Entries.ToArray(), newleaderboardBlitzShamanElemental.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzShamanElementalLadder");
        }
    }
    public async Task CacheBlitzShamanEnhancementLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzShamanEnhancementLeaderboard method in warcraftclient
            var oldleaderboardBlitzShamanEnhancement = await redisProxy.GetBlitzShamanEnhancementLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-shaman-enhancement", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzShamanEnhancement = await redisProxy.GetBlitzShamanEnhancementLeaderboard(region);
            await BatchCacheCharSummary("blitz-shaman-enhancement", region, oldleaderboardBlitzShamanEnhancement.Entries.ToArray(), newleaderboardBlitzShamanEnhancement.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzShamanEnhancementLadder");
        }
    }
    public async Task CacheBlitzShamanRestorationLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzShamanRestorationLeaderboard method in warcraftclient
            var oldleaderboardBlitzShamanRestoration = await redisProxy.GetBlitzShamanRestorationLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-shaman-restoration", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzShamanRestoration = await redisProxy.GetBlitzShamanRestorationLeaderboard(region);
            await BatchCacheCharSummary("blitz-shaman-restoration", region, oldleaderboardBlitzShamanRestoration.Entries.ToArray(), newleaderboardBlitzShamanRestoration.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzShamanRestorationLadder");
        }
    }
    public async Task CacheBlitzWarlockAfflictionLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzWarlockAfflictionLeaderboard method in warcraftclient
            var oldleaderboardBlitzWarlockAffliction = await redisProxy.GetBlitzWarlockAfflictionLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-warlock-affliction", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzWarlockAffliction = await redisProxy.GetBlitzWarlockAfflictionLeaderboard(region);
            await BatchCacheCharSummary("blitz-warlock-affliction", region, oldleaderboardBlitzWarlockAffliction.Entries.ToArray(), newleaderboardBlitzWarlockAffliction.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzWarlockAfflictionLadder");
        }
    }
    public async Task CacheBlitzWarlockDemonologyLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzWarlockDemonologyLeaderboard method in warcraftclient
            var oldleaderboardBlitzWarlockDemonology = await redisProxy.GetBlitzWarlockDemonologyLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-warlock-demonology", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzWarlockDemonology = await redisProxy.GetBlitzWarlockDemonologyLeaderboard(region);
            await BatchCacheCharSummary("blitz-warlock-demonology", region, oldleaderboardBlitzWarlockDemonology.Entries.ToArray(), newleaderboardBlitzWarlockDemonology.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzWarlockDemonologyLadder");
        }
    }
    public async Task CacheBlitzWarlockDestructionLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzWarlockDestructionLeaderboard method in warcraftclient
            var oldleaderboardBlitzWarlockDestruction = await redisProxy.GetBlitzWarlockDestructionLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-warlock-destruction", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzWarlockDestruction = await redisProxy.GetBlitzWarlockDestructionLeaderboard(region);
            await BatchCacheCharSummary("blitz-warlock-destruction", region, oldleaderboardBlitzWarlockDestruction.Entries.ToArray(), newleaderboardBlitzWarlockDestruction.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzWarlockDestructionLadder");
        }
    }
    public async Task CacheBlitzWarriorArmsLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzWarriorArmsLeaderboard method in warcraftclient
            var oldleaderboardBlitzWarriorArms = await redisProxy.GetBlitzWarriorArmsLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-warrior-arms", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzWarriorArms = await redisProxy.GetBlitzWarriorArmsLeaderboard(region);
            await BatchCacheCharSummary("blitz-warrior-arms", region, oldleaderboardBlitzWarriorArms.Entries.ToArray(), newleaderboardBlitzWarriorArms.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzWarriorArmsLadder");
        }
    }
    public async Task CacheBlitzWarriorProtectionLadder(string region)
    {
        try
        {
            //not using string since we are executing from GetBlitzWarriorProtectionLeaderboard method in warcraftclient
            var oldleaderboardBlitzWarriorProtection = await redisProxy.GetBlitzWarriorProtectionLeaderboard(region);
            await redisProxy.ClearLeaderboard("blitz-warrior-protection", region, GameFlavor.Retail);
            //only compares because the backgroundservice shorter than ladderupdate, updates new leaderboard after deleting the old one and is able to be compared because of this
            var newleaderboardBlitzWarriorProtection = await redisProxy.GetBlitzWarriorProtectionLeaderboard(region);
            await BatchCacheCharSummary("blitz-warrior-protection", region, oldleaderboardBlitzWarriorProtection.Entries.ToArray(), newleaderboardBlitzWarriorProtection.Entries.ToArray(), 5, GameFlavor.Retail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in CacheBlitzWarriorProtectionLadder");
        }
    }
}
