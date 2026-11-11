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

    /// <summary>Gets the mounts a Forever character has collected.</summary>
    public async Task<RequestResult<ForeverMountsCollection>> GetForeverCharacterMountsAsync(string characterSlug, string @namespace, Region region, Locale locale)
    {
        string host = GetHost(region);
        return await GetAsync<ForeverMountsCollection>($"{host}/profile/wow/character/{ForeverSlug(characterSlug)}/collections/mounts?namespace={@namespace}&locale={locale}");
    }

    /// <summary>Gets the pets a Forever character has collected.</summary>
    public async Task<RequestResult<ForeverPetsCollection>> GetForeverCharacterPetsAsync(string characterSlug, string @namespace, Region region, Locale locale)
    {
        string host = GetHost(region);
        return await GetAsync<ForeverPetsCollection>($"{host}/profile/wow/character/{ForeverSlug(characterSlug)}/collections/pets?namespace={@namespace}&locale={locale}");
    }

    /// <summary>Gets the toys a Forever character has collected.</summary>
    public async Task<RequestResult<ForeverToysCollection>> GetForeverCharacterToysAsync(string characterSlug, string @namespace, Region region, Locale locale)
    {
        string host = GetHost(region);
        return await GetAsync<ForeverToysCollection>($"{host}/profile/wow/character/{ForeverSlug(characterSlug)}/collections/toys?namespace={@namespace}&locale={locale}");
    }

    /// <summary>Gets the item appearances a Forever character has collected, by equipment slot.</summary>
    public async Task<RequestResult<ForeverTransmogsCollection>> GetForeverCharacterTransmogsAsync(string characterSlug, string @namespace, Region region, Locale locale)
    {
        string host = GetHost(region);
        return await GetAsync<ForeverTransmogsCollection>($"{host}/profile/wow/character/{ForeverSlug(characterSlug)}/collections/transmogs?namespace={@namespace}&locale={locale}");
    }

    /// <summary>Gets every mount in Forever's game data.</summary>
    public async Task<RequestResult<ForeverMountsIndex>> GetForeverMountsIndexAsync(string @namespace, Region region, Locale locale)
    {
        string host = GetHost(region);
        return await GetAsync<ForeverMountsIndex>($"{host}/data/wow/mount/index?namespace={@namespace}&locale={locale}");
    }

    /// <summary>Gets every pet species in Forever's game data.</summary>
    public async Task<RequestResult<ForeverPetsIndex>> GetForeverPetsIndexAsync(string @namespace, Region region, Locale locale)
    {
        string host = GetHost(region);
        return await GetAsync<ForeverPetsIndex>($"{host}/data/wow/pet/index?namespace={@namespace}&locale={locale}");
    }

    /// <summary>Gets every toy in Forever's game data.</summary>
    public async Task<RequestResult<ForeverToysIndex>> GetForeverToysIndexAsync(string @namespace, Region region, Locale locale)
    {
        string host = GetHost(region);
        return await GetAsync<ForeverToysIndex>($"{host}/data/wow/toy/index?namespace={@namespace}&locale={locale}");
    }

    /// <summary>Gets a Forever mount's creature displays.</summary>
    public async Task<RequestResult<ForeverMount>> GetForeverMountAsync(int mountId, string @namespace, Region region, Locale locale)
    {
        string host = GetHost(region);
        return await GetAsync<ForeverMount>($"{host}/data/wow/mount/{mountId}?namespace={@namespace}&locale={locale}");
    }

    /// <summary>Gets a Forever pet species, including its icon.</summary>
    public async Task<RequestResult<ForeverPet>> GetForeverPetAsync(int petId, string @namespace, Region region, Locale locale)
    {
        string host = GetHost(region);
        return await GetAsync<ForeverPet>($"{host}/data/wow/pet/{petId}?namespace={@namespace}&locale={locale}");
    }

    /// <summary>Gets a Forever toy and the item media its icon comes from.</summary>
    public async Task<RequestResult<ForeverToy>> GetForeverToyAsync(int toyId, string @namespace, Region region, Locale locale)
    {
        string host = GetHost(region);
        return await GetAsync<ForeverToy>($"{host}/data/wow/toy/{toyId}?namespace={@namespace}&locale={locale}");
    }

    /// <summary>Gets up to 1000 equippable Forever items with an id of at least fromId, in id order.</summary>
    public async Task<RequestResult<ForeverItemSearch>> SearchForeverEquippableItemsAsync(int fromId, string @namespace, Region region)
    {
        string host = GetHost(region);
        return await GetAsync<ForeverItemSearch>($"{host}/data/wow/search/item?namespace={@namespace}&is_equippable=true&id=%5B{fromId},%5D&orderby=id&_pageSize=1000");
    }

    /// <summary>Gets up to 1000 Forever consumables of one subclass (potions, elixirs, flasks, enhancements) with an id of at least fromId, in id order.</summary>
    public async Task<RequestResult<ForeverItemSearch>> SearchForeverConsumablesAsync(int subclassId, int fromId, string @namespace, Region region)
    {
        string host = GetHost(region);
        return await GetAsync<ForeverItemSearch>($"{host}/data/wow/search/item?namespace={@namespace}&item_class.id=0&item_subclass.id={subclassId}&id=%5B{fromId},%5D&orderby=id&_pageSize=1000");
    }

    /// <summary>Gets a Forever item appearance and the item media its icon comes from.</summary>
    public async Task<RequestResult<ForeverItemAppearance>> GetForeverItemAppearanceAsync(int appearanceId, string @namespace, Region region, Locale locale)
    {
        string host = GetHost(region);
        return await GetAsync<ForeverItemAppearance>($"{host}/data/wow/item-appearance/{appearanceId}?namespace={@namespace}&locale={locale}");
    }

    //names can carry accented letters, so the slug is escaped after lowercasing
    private static string ForeverSlug(string characterSlug)
    {
        return Uri.EscapeDataString(characterSlug.ToLowerInvariant());
    }
}
