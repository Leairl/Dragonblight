    using ArgentPonyWarcraftClient;

//Solo Blitz ladders, one per spec. Retail only, and cached like the other ladders.
partial class WarcraftRedisProxy
{
    
    public async Task<PvpLeaderboard> GetBlitzWarriorFuryLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzWarriorFuryLeaderboard" + ns, async () =>
        {
            var currBlitzWarriorFuryLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-warrior-fury", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzWarriorFuryLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzDeathKnightBloodLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzDeathKnightBloodLeaderboard" + ns, async () =>
        {
            var currBlitzDeathKnightBloodLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-deathknight-blood", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzDeathKnightBloodLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzDeathKnightFrostLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzDeathKnightFrostLeaderboard" + ns, async () =>
        {
            var currBlitzDeathKnightFrostLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-deathknight-frost", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzDeathKnightFrostLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzDeathKnightUnholyLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzDeathKnightUnholyLeaderboard" + ns, async () =>
        {
            var currBlitzDeathKnightUnholyLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-deathknight-unholy", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzDeathKnightUnholyLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzDemonHunterDevourerLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzDemonHunterDevourerLeaderboard" + ns, async () =>
        {
            var currBlitzDemonHunterDevourerLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-demonhunter-devourer", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzDemonHunterDevourerLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzDemonHunterHavocLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzDemonHunterHavocLeaderboard" + ns, async () =>
        {
            var currBlitzDemonHunterHavocLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-demonhunter-havoc", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzDemonHunterHavocLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzDemonHunterVengeanceLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzDemonHunterVengeanceLeaderboard" + ns, async () =>
        {
            var currBlitzDemonHunterVengeanceLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-demonhunter-vengeance", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzDemonHunterVengeanceLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzDruidBalanceLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzDruidBalanceLeaderboard" + ns, async () =>
        {
            var currBlitzDruidBalanceLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-druid-balance", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzDruidBalanceLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzDruidFeralLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzDruidFeralLeaderboard" + ns, async () =>
        {
            var currBlitzDruidFeralLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-druid-feral", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzDruidFeralLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzDruidGuardianLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzDruidGuardianLeaderboard" + ns, async () =>
        {
            var currBlitzDruidGuardianLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-druid-guardian", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzDruidGuardianLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzDruidRestorationLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzDruidRestorationLeaderboard" + ns, async () =>
        {
            var currBlitzDruidRestorationLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-druid-restoration", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzDruidRestorationLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzEvokerDevastationLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzEvokerDevastationLeaderboard" + ns, async () =>
        {
            var currBlitzEvokerDevastationLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-evoker-devastation", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzEvokerDevastationLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzEvokerPreservationLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzEvokerPreservationLeaderboard" + ns, async () =>
        {
            var currBlitzEvokerPreservationLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-evoker-preservation", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzEvokerPreservationLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzEvokerAugmentationLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzEvokerAugmentationLeaderboard" + ns, async () =>
        {
            var currBlitzEvokerAugmentationLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-evoker-augmentation", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzEvokerAugmentationLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzHunterBeastMasteryLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzHunterBeastMasteryLeaderboard" + ns, async () =>
        {
            var currBlitzHunterBeastMasteryLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-hunter-beastmastery", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzHunterBeastMasteryLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzHunterMarksmanshipLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzHunterMarksmanshipLeaderboard" + ns, async () =>
        {
            var currBlitzHunterMarksmanshipLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-hunter-marksmanship", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzHunterMarksmanshipLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzHunterSurvivalLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzHunterSurvivalLeaderboard" + ns, async () =>
        {
            var currBlitzHunterSurvivalLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-hunter-survival", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzHunterSurvivalLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzMageArcaneLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzMageArcaneLeaderboard" + ns, async () =>
        {
            var currBlitzMageArcaneLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-mage-arcane", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzMageArcaneLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzMageFireLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzMageFireLeaderboard" + ns, async () =>
        {
            var currBlitzMageFireLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-mage-fire", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzMageFireLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzMageFrostLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzMageFrostLeaderboard" + ns, async () =>
        {
            var currBlitzMageFrostLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-mage-frost", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzMageFrostLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzMonkBrewmasterLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzMonkBrewmasterLeaderboard" + ns, async () =>
        {
            var currBlitzMonkBrewmasterLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-monk-brewmaster", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzMonkBrewmasterLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzMonkWindwalkerLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzMonkWindwalkerLeaderboard" + ns, async () =>
        {
            var currBlitzMonkWindwalkerLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-monk-windwalker", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzMonkWindwalkerLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzMonkMistweaverLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzMonkMistweaverLeaderboard" + ns, async () =>
        {
            var currBlitzMonkMistweaverLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-monk-mistweaver", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzMonkMistweaverLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzPaladinHolyLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzPaladinHolyLeaderboard" + ns, async () =>
        {
            var currBlitzPaladinHolyLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-paladin-holy", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzPaladinHolyLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzPaladinProtectionLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzPaladinProtectionLeaderboard" + ns, async () =>
        {
            var currBlitzPaladinProtectionLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-paladin-protection", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzPaladinProtectionLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzPaladinRetributionLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzPaladinRetributionLeaderboard" + ns, async () =>
        {
            var currBlitzPaladinRetributionLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-paladin-retribution", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzPaladinRetributionLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzPriestDisciplineLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzPriestDisciplineLeaderboard" + ns, async () =>
        {
            var currBlitzPriestDisciplineLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-priest-discipline", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzPriestDisciplineLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzPriestHolyLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzPriestHolyLeaderboard" + ns, async () =>
        {
            var currBlitzPriestHolyLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-priest-holy", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzPriestHolyLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzPriestShadowLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzPriestShadowLeaderboard" + ns, async () =>
        {
            var currBlitzPriestShadowLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-priest-shadow", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzPriestShadowLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzRogueAssassinationLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzRogueAssassinationLeaderboard" + ns, async () =>
        {
            var currBlitzRogueAssassinationLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-rogue-assassination", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzRogueAssassinationLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzRogueOutlawLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzRogueOutlawLeaderboard" + ns, async () =>
        {
            var currBlitzRogueOutlawLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-rogue-outlaw", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzRogueOutlawLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzRogueSubtletyLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzRogueSubtletyLeaderboard" + ns, async () =>
        {
            var currBlitzRogueSubtletyLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-rogue-subtlety", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzRogueSubtletyLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzShamanElementalLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzShamanElementalLeaderboard" + ns, async () =>
        {
            var currBlitzShamanElementalLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-shaman-elemental", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzShamanElementalLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzShamanEnhancementLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzShamanEnhancementLeaderboard" + ns, async () =>
        {
            var currBlitzShamanEnhancementLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-shaman-enhancement", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzShamanEnhancementLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzShamanRestorationLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzShamanRestorationLeaderboard" + ns, async () =>
        {
            var currBlitzShamanRestorationLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-shaman-restoration", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzShamanRestorationLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzWarlockAfflictionLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzWarlockAfflictionLeaderboard" + ns, async () =>
        {
            var currBlitzWarlockAfflictionLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-warlock-affliction", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzWarlockAfflictionLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzWarlockDemonologyLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzWarlockDemonologyLeaderboard" + ns, async () =>
        {
            var currBlitzWarlockDemonologyLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-warlock-demonology", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzWarlockDemonologyLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzWarlockDestructionLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzWarlockDestructionLeaderboard" + ns, async () =>
        {
            var currBlitzWarlockDestructionLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-warlock-destruction", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzWarlockDestructionLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzWarriorArmsLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzWarriorArmsLeaderboard" + ns, async () =>
        {
            var currBlitzWarriorArmsLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-warrior-arms", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzWarriorArmsLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
    public async Task<PvpLeaderboard> GetBlitzWarriorProtectionLeaderboard(string region)
    {
        var ns = GetDynamicRegion(region, GameFlavor.Retail);
        return await GetBlizzardDataCached<PvpLeaderboard>("getBlitzWarriorProtectionLeaderboard" + ns, async () =>
        {
            var currBlitzWarriorProtectionLeaderboard = await warcraftClient.GetPvpLeaderboardAsync(await GetSeason(region, GameFlavor.Retail), "blitz-warrior-protection", ns, GetRegion(ns), GetLocale(ns));
            return currBlitzWarriorProtectionLeaderboard.Value;
        }, TimeSpan.FromHours(3)); 
    }
}