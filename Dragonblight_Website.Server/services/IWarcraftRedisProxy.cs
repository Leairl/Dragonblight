using ArgentPonyWarcraftClient;
using Dragonblight_Website.Server.Helpers;

public interface IWarcraftRedisProxy
{
    public string ExternalVersionedKey(string key);
    Task<T?> GetRedisData<T>(string key);
    Task SaveToRedis<T>(string key, T value, TimeSpan? expiration);
    Task<CharacterMediaSummary?> GetCharMedia(string server, string characterName, string region, GameFlavor flavor);
    Task<ForeverCharacterProfile?> GetForeverCharacter(string characterSlug, string region);
    Task<CharacterEquipmentSummary?> GetForeverEquipment(string characterSlug, string region);
    Task<CharacterMediaSummary?> GetForeverMedia(string characterSlug, string region);
    Task<List<string>> ForeverCachedCharacters();
    Task InsertForeverCachedCharacter(string characterSlug, string region);
    Task<ForeverGuild?> GetForeverGuild(string guildSlug, string region);
    Task<ForeverGuildRoster?> GetForeverGuildRoster(string guildSlug, string region);
    Task<string?> GetForeverSpecName(string characterSlug, string region);
    Task<ForeverNameLists?> GetForeverNameLists(string region);
    Task SaveForeverStatsCharacters(IEnumerable<ForeverStatsCharacter> characters);
    Task<List<ForeverStatsCharacter>> GetForeverStatsCharacters();
    Task<ForeverStatsCharacter?> GetForeverStatsCharacter(string characterSlug, string region);
    Task<Dictionary<string, ForeverStatsCharacter>> GetForeverStatsCharacters(IEnumerable<string> characterSlugs, string region);
    Task RemoveForeverStatsCharacters(IEnumerable<ForeverStatsCharacter> characters);
    Task SaveForeverStatsSummary(ForeverStatsSummary summary);
    Task<ForeverStatsSummary?> GetForeverStatsSummary();
    Task RecordCharacter(int id, string name, string realm, string region, GameFlavor flavor);
    Task<CharacterIdentity?> GetCharacterIdentity(int id, string region, GameFlavor flavor);
    Task<PlayableSpecializationsIndex?> PlayableSpecializationsIndex(string region, GameFlavor flavor);
    Task<List<LadderBracket>> GetLadderBrackets(string region, GameFlavor flavor);
    Task<PlayableSpecialization?> PlayableSpecialization(int specializationId, string region, GameFlavor flavor);
    Task<PvpLeaderboardsIndex> GetLeaderboardIndex(string region, GameFlavor flavor);
    Task<List<SpecRatingCounts>> GetSoloSpecStats(string ladder, string region, GameFlavor flavor);
    Task<List<SpecRatingCounts>> GetClassSpecStats(string bracket, string region, GameFlavor flavor);
    Task RefreshCharacterSpec(string server, string characterName, string region, GameFlavor flavor);
    Task RecordCompositions(string bracket, string region, List<List<SyncedPlayer>> teams, GameFlavor flavor);
    Task<List<CompositionCounts>> GetCompositions(string bracket, string region, GameFlavor flavor);
    Task<SpecWinRates> GetSpecWinRates(string bracket, string region, GameFlavor flavor);
    Task<PvpLeaderboard> GetLeaderboard(string region, string bracket, GameFlavor flavor);
    Task InsertCacheCharacter(string characterName, string server, string region, GameFlavor flavor);
    Task InsertCacheClassCharacter(string bracket, PvpLeaderboardEntry player, CharacterProfileSummary summary, string specName, string region, GameFlavor flavor);
    Task ClearAllCachedClassCharacters(string bracket, string region, GameFlavor flavor);
    Task<List<string>> CachedCharacters(GameFlavor flavor);
    Task<List<PvpLeaderboardEntry?>> CachedClassCharacters(string region, string characterClass, string bracket, GameFlavor flavor);
    Task BracketPlayerExpiration(string bracket, string region, GameFlavor flavor);
    Task InsertToBracketActivityPage(string bracket, string region, PvpLeaderboardEntry oldPlayer, PvpLeaderboardEntry newPlayer, string specName, GameFlavor flavor);
    Task<IEnumerable<PlayerActivity?>> GetBracketActivityPage(string bracket, string region, GameFlavor flavor);
    Task<CharacterProfileSummary> GetCharSummary(string server, string characterName, string region, GameFlavor flavor);
    Task<PvpRewardsIndex> GetPvPRewards(string region, GameFlavor flavor);
    Task<CharacterAppearanceSummary> GetCharAppearance(string server, string characterName, string region, GameFlavor flavor);
    Task<CharacterEquipmentSummary> GetCharEquipment(string server, string characterName, string region, GameFlavor flavor);
    Task<bool> ClearCharacterCache(string server, string characterName, string region, GameFlavor flavor);
    Task<PlayableClass?> GetPlayableClass(int classId, string region, GameFlavor flavor);
    Task<CharacterPvpBracketStatistics> GetPvpBracketRating(string server, string characterName, string pvpBracket, string region, GameFlavor flavor);
    Task<CharacterStatisticsSummary> GetCharacterStats(string server, string characterName, string region, GameFlavor flavor);
    Task<CharacterAchievementsSummary> GetCharacterAchievements(string server, string characterName, string region, GameFlavor flavor);
    Task<Dictionary<string, int>> GetHighestRatings(string server, string characterName, string region, GameFlavor flavor);
    Task<PvpLeaderboard> RefreshLeaderboard(string region, string bracket, GameFlavor flavor);
    Task<IEnumerable<PlayerActivity?>> GetBracketClassFilteredActivityPage(string bracket, string region, string characterClass, GameFlavor flavor);
    Task<string> GetCharacterSpecName(string server, string characterName, string region, GameFlavor flavor);
    WarcraftClient? overrideClient { get; set; }
    //namespace builders, exposed so callers can reproduce a cached key exactly
    string GetProfileRegion(string region, GameFlavor flavor);
    string GetDynamicRegion(string region, GameFlavor flavor);
    string GetStaticRegion(string region, GameFlavor flavor);
    Task<ItemDisplayInfo?> GetItemDisplayInfo(int itemId, string region, GameFlavor flavor);
    Task<ItemMedia?> GetItemIcon(int itemId, string region, GameFlavor flavor);
    Task<CharacterSpecializationsSummary> GetPlayerTalents(string server, string characterName, string region, GameFlavor flavor);
    Task<TalentTree?> GetTalentTree(int specId, string region, GameFlavor flavor);
    Task InsertActivityCacheClassCharacter(string bracket, PvpLeaderboardEntry oldPlayer, PvpLeaderboardEntry newPlayer, CharacterProfileSummary characterClass, string specName, string region, GameFlavor flavor);
    Task BracketClassPlayerExpiration(string bracket, string region, string characterClass, GameFlavor flavor);
    Task<int> GetSeason(string region, GameFlavor flavor);
    Task<DateTimeOffset?> GetSeasonStart(string region, GameFlavor flavor);
    Task SavePvpCharacterSummary(PvpCharacterSummary newPvpCharacterSummary, string bracket, string region, GameFlavor flavor,
        IReadOnlyDictionary<string, Dictionary<int, PvpLeaderboardEntry>> specLadderEntries);
    Task<List<PvpCharacterSummary?>> GetPvpLeaderSummaries(string bracket, string region, GameFlavor flavor);
    Task<List<PvpCharacterSummary?>> GetPvpLeaderSummariesPage(string bracket, string region, GameFlavor flavor, int skip, int take);
    Task ClearPvpCharacterSummary(string bracket, string region, GameFlavor flavor);
    Task InsertAltList(string server, string characterName, string region, CharacterAchievementsSummary achievements, GameFlavor flavor);
    Task IndexAltList(string server, string characterName, string region, GameFlavor flavor);
    Task<List<CharacterIdentity>> GetAlts(string server, string characterName, string region, GameFlavor flavor);
    Task<bool> IsDeveloper(string server, string characterName, string region, GameFlavor flavor);
    Task<RealmsIndex?> GetRealms(string region, GameFlavor flavor);
    Task ReplacePvpCharacterSummary(int index, PvpCharacterSummary summary, string bracket, string region, GameFlavor flavor);
    Task<List<WowClass>> GetPlayableClasses(string region, GameFlavor flavor);
    Task<string> RewardLadder(string bracketType, string region, int? specId, GameFlavor flavor);
    Task UpdateEstimatedCutoffs(string bracket, string region, PvpLeaderboardEntry[] ladder, GameFlavor flavor);
    Task<List<EstimatedCutoff>> GetEstimatedCutoffs(string region, GameFlavor flavor);
    Task<EstimateDetail> GetEstimateDetail(string bracket, int achievementId, string region, GameFlavor flavor);

}

