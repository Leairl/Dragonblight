namespace ArgentPonyWarcraftClient;

//WoW: Forever characters. The paths match the other profile endpoints except that a
//character is addressed by "name-surname" with no realm segment.
public partial class WarcraftClient
{
    /// <summary>
    /// Gets a WoW: Forever character's profile.
    /// </summary>
    /// <param name="characterSlug">The character's name and surname, lowercase and joined by a hyphen, e.g. "joe-gun".</param>
    /// <param name="namespace">The profile namespace, e.g. "profile-forever-us".</param>
    /// <param name="region">The region to query.</param>
    /// <param name="locale">The locale for the response.</param>
    public async Task<RequestResult<ForeverCharacterProfile>> GetForeverCharacterProfileAsync(string characterSlug, string @namespace, Region region, Locale locale)
    {
        string host = GetHost(region);
        return await GetAsync<ForeverCharacterProfile>($"{host}/profile/wow/character/{ForeverSlug(characterSlug)}?namespace={@namespace}&locale={locale}");
    }

    /// <summary>
    /// Gets the items a WoW: Forever character has equipped.
    /// </summary>
    public async Task<RequestResult<CharacterEquipmentSummary>> GetForeverCharacterEquipmentAsync(string characterSlug, string @namespace, Region region, Locale locale)
    {
        string host = GetHost(region);
        return await GetAsync<CharacterEquipmentSummary>($"{host}/profile/wow/character/{ForeverSlug(characterSlug)}/equipment?namespace={@namespace}&locale={locale}");
    }

    /// <summary>
    /// Gets a WoW: Forever character's rendered images.
    /// </summary>
    public async Task<RequestResult<CharacterMediaSummary>> GetForeverCharacterMediaAsync(string characterSlug, string @namespace, Region region, Locale locale)
    {
        string host = GetHost(region);
        return await GetAsync<CharacterMediaSummary>($"{host}/profile/wow/character/{ForeverSlug(characterSlug)}/character-media?namespace={@namespace}&locale={locale}");
    }

    /// <summary>
    /// Gets a WoW: Forever character's talent trees and the points in them.
    /// </summary>
    public async Task<RequestResult<ForeverSpecializations>> GetForeverCharacterSpecializationsAsync(string characterSlug, string @namespace, Region region, Locale locale)
    {
        string host = GetHost(region);
        return await GetAsync<ForeverSpecializations>($"{host}/profile/wow/character/{ForeverSlug(characterSlug)}/specializations?namespace={@namespace}&locale={locale}");
    }

    /// <summary>
    /// Gets a WoW: Forever character's professions, skills and known recipes.
    /// </summary>
    public async Task<RequestResult<CharacterProfessionsSummary>> GetForeverCharacterProfessionsAsync(string characterSlug, string @namespace, Region region, Locale locale)
    {
        string host = GetHost(region);
        return await GetAsync<CharacterProfessionsSummary>($"{host}/profile/wow/character/{ForeverSlug(characterSlug)}/professions?namespace={@namespace}&locale={locale}");
    }

    /// <summary>
    /// Gets a WoW: Forever character's honor rank, kills and battleground results.
    /// </summary>
    public async Task<RequestResult<ForeverPvpSummary>> GetForeverCharacterPvpSummaryAsync(string characterSlug, string @namespace, Region region, Locale locale)
    {
        string host = GetHost(region);
        return await GetAsync<ForeverPvpSummary>($"{host}/profile/wow/character/{ForeverSlug(characterSlug)}/pvp-summary?namespace={@namespace}&locale={locale}");
    }

    /// <summary>
    /// Gets a WoW: Forever character's reported character-sheet statistics.
    /// </summary>
    public async Task<RequestResult<ForeverCharacterStatistics>> GetForeverCharacterStatisticsAsync(string characterSlug, string @namespace, Region region, Locale locale)
    {
        string host = GetHost(region);
        return await GetAsync<ForeverCharacterStatistics>($"{host}/profile/wow/character/{ForeverSlug(characterSlug)}/statistics?namespace={@namespace}&locale={locale}");
    }

    /// <summary>
    /// Gets a WoW: Forever character's factions, reputation standings and progress.
    /// </summary>
    public async Task<RequestResult<ForeverReputationsSummary>> GetForeverCharacterReputationsAsync(string characterSlug, string @namespace, Region region, Locale locale)
    {
        string host = GetHost(region);
        return await GetAsync<ForeverReputationsSummary>($"{host}/profile/wow/character/{ForeverSlug(characterSlug)}/reputations?namespace={@namespace}&locale={locale}");
    }

    /// <summary>Gets a Forever character's completed achievements and reported criteria progress.</summary>
    public async Task<RequestResult<ForeverAchievementsSummary>> GetForeverCharacterAchievementsAsync(string characterSlug, string @namespace, Region region, Locale locale)
    {
        string host = GetHost(region);
        return await GetAsync<ForeverAchievementsSummary>($"{host}/profile/wow/character/{ForeverSlug(characterSlug)}/achievements?namespace={@namespace}&locale={locale}");
    }

    /// <summary>Gets a Forever achievement definition, including Legacy reward text and nested criteria.</summary>
    public async Task<RequestResult<ForeverAchievement>> GetForeverAchievementAsync(int achievementId, string @namespace, Region region, Locale locale)
    {
        string host = GetHost(region);
        return await GetAsync<ForeverAchievement>($"{host}/data/wow/achievement/{achievementId}?namespace={@namespace}&locale={locale}");
    }

    //names can carry accented letters, so the slug is escaped after lowercasing
    private static string ForeverSlug(string characterSlug)
    {
        return Uri.EscapeDataString(characterSlug.ToLowerInvariant());
    }
}
