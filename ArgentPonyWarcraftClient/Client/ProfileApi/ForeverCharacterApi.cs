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

    //names can carry accented letters, so the slug is escaped after lowercasing
    private static string ForeverSlug(string characterSlug)
    {
        return Uri.EscapeDataString(characterSlug.ToLowerInvariant());
    }
}
