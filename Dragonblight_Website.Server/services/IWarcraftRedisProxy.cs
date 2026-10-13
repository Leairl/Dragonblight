using ArgentPonyWarcraftClient;

public interface IWarcraftRedisProxy
{
    Task<PlayableSpecializationsIndex?> PlayableSpecializationsIndex(string region, GameFlavor flavor = GameFlavor.Retail);
    Task<List<LadderBracket>> GetLadderBrackets(string region, GameFlavor flavor = GameFlavor.MistsClassic);
    Task<PlayableSpecialization?> PlayableSpecialization(int specializationId, string region, GameFlavor flavor = GameFlavor.Retail);
    Task<PvpLeaderboardsIndex> GetLeaderboardIndex(string region, GameFlavor flavor = GameFlavor.MistsClassic); 
    Task<PvpLeaderboard> GetLeaderboard(string region, string bracket, GameFlavor flavor = GameFlavor.MistsClassic);
    Task InsertCacheCharacter(string characterName, string server, string region, GameFlavor flavor = GameFlavor.MistsClassic);
    Task InsertCacheClassCharacter(string bracket, PvpLeaderboardEntry player, CharacterProfileSummary summary, string region, GameFlavor flavor = GameFlavor.MistsClassic);
    Task ClearAllCachedClassCharacters(string bracket, string region, GameFlavor flavor = GameFlavor.MistsClassic);
    Task<List<string>> CachedCharacters(GameFlavor flavor = GameFlavor.MistsClassic);
    Task<List<PvpLeaderboardEntry?>> CachedClassCharacters(string region, string characterClass, string bracket, GameFlavor flavor = GameFlavor.MistsClassic);
    Task<IEnumerable<PvpLeaderboardAndTime?>> GetLadderHistory(string key, string region, GameFlavor flavor = GameFlavor.MistsClassic);
    Task InsertToPlayerPageActivity(string bracket, string region, PvpLeaderboardEntry player, GameFlavor flavor = GameFlavor.MistsClassic);
    Task<IEnumerable<PvpLeaderboardEntryandTime?>> GetPlayerPageActivity(string bracket, string region, string characterId, GameFlavor flavor = GameFlavor.MistsClassic);
    Task BracketPlayerExpiration(string bracket, string region, GameFlavor flavor = GameFlavor.MistsClassic);
    Task InsertToBracketActivityPage(string bracket, string region, PvpLeaderboardEntry oldPlayer, PvpLeaderboardEntry newPlayer, GameFlavor flavor = GameFlavor.MistsClassic);
    Task<IEnumerable<PlayerActivity?>> GetBracketActivityPage(string bracket, string region, GameFlavor flavor = GameFlavor.MistsClassic);
    Task<CharacterProfileSummary> GetCharSummary(string server, string characterName, string region, GameFlavor flavor = GameFlavor.MistsClassic);
    Task<PvpRewardsIndex> GetPvPRewards(string region, GameFlavor flavor = GameFlavor.MistsClassic);
    Task<CharacterAppearanceSummary> GetCharAppearance(string server, string characterName, string region, GameFlavor flavor = GameFlavor.MistsClassic);
    Task<CharacterEquipmentSummary> GetCharEquipment(string server, string characterName, string region, GameFlavor flavor = GameFlavor.MistsClassic);
    Task<bool> ClearCharacterCache(string server, string characterName, string region, GameFlavor flavor = GameFlavor.MistsClassic);
    Task<PlayableClass?> GetPlayableClass(int classId, string region, GameFlavor flavor = GameFlavor.Retail);
    Task<CharacterPvpBracketStatistics> GetPvpBracketRating(string server, string characterName, string pvpBracket, string region, GameFlavor flavor = GameFlavor.MistsClassic);
    Task<CharacterStatisticsSummary> GetCharacterStats(string server, string characterName, string region, GameFlavor flavor = GameFlavor.MistsClassic);
    Task<CharacterAchievementsSummary> GetCharacterAchievements(string server, string characterName, string region, GameFlavor flavor = GameFlavor.MistsClassic);
    Task ClearLeaderboard(string bracket, string region, GameFlavor flavor = GameFlavor.MistsClassic);
    Task<IEnumerable<PlayerActivity?>> GetBracketClassFilteredActivityPage(string bracket, string region, string characterClass, GameFlavor flavor = GameFlavor.MistsClassic);
    Task<string> GetCharacterSpecName(string server, string characterName, string region, GameFlavor flavor = GameFlavor.MistsClassic);
    WarcraftClient? overrideClient{get; set;}
    //namespace builders, exposed so callers can reproduce a cached key exactly
    string GetProfileRegion(string region, GameFlavor flavor = GameFlavor.MistsClassic);
    string GetDynamicRegion(string region, GameFlavor flavor = GameFlavor.MistsClassic);
    string GetStaticRegion(string region, GameFlavor flavor = GameFlavor.MistsClassic);
    Task<ItemDisplayInfo?> GetItemDisplayInfo(int itemId, string region, GameFlavor flavor);
    Task<ItemMedia?> GetItemIcon(int itemId, string region, GameFlavor flavor = GameFlavor.MistsClassic);
    Task<CharacterSpecializationsSummary> GetPlayerTalents(string server, string characterName, string region, GameFlavor flavor = GameFlavor.MistsClassic);
    Task<TalentTree?> GetTalentTree(int specId, string region, GameFlavor flavor = GameFlavor.Retail);
    Task InsertActivityCacheClassCharacter(string bracket, PvpLeaderboardEntry oldPlayer, PvpLeaderboardEntry newPlayer, CharacterProfileSummary characterClass, string region, GameFlavor flavor = GameFlavor.MistsClassic);
    Task BracketClassPlayerExpiration(string bracket, string region, string characterClass, GameFlavor flavor = GameFlavor.MistsClassic);
    Task<int> GetSeason(string region, GameFlavor flavor = GameFlavor.MistsClassic);
    Task<DateTimeOffset?> GetSeasonStart(string region, GameFlavor flavor = GameFlavor.MistsClassic);
    Task SavePvpCharacterSummary(PvpCharacterSummary newPvpCharacterSummary, string bracket, string region, GameFlavor flavor = GameFlavor.MistsClassic);
    Task<List<PvpCharacterSummary?>> GetPvpLeaderSummaries(string bracket, string region, GameFlavor flavor = GameFlavor.MistsClassic);
    Task ClearPvpCharacterSummary(string bracket, string region, GameFlavor flavor = GameFlavor.MistsClassic);
    Task InsertAltList(string server, string characterName, string region, CharacterAchievementsSummary achievements, GameFlavor flavor = GameFlavor.MistsClassic);
    Task IndexAltList(string server, string characterName, string region, GameFlavor flavor = GameFlavor.MistsClassic);
    Task<List<string>> GetAlts(string server, string characterName, string region, GameFlavor flavor = GameFlavor.MistsClassic);
    Task<RealmsIndex?> GetRealms(string region, GameFlavor flavor = GameFlavor.MistsClassic);
    Task ReplacePvpCharacterSummary(int index, PvpCharacterSummary summary, string bracket, string region, GameFlavor flavor = GameFlavor.MistsClassic);
}

