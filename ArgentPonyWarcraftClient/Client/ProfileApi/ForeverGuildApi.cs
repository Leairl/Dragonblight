namespace ArgentPonyWarcraftClient;

//WoW: Forever guilds. Like Forever characters they have no realm segment in their paths.
public partial class WarcraftClient
{
    /// <summary>
    /// Gets a WoW: Forever guild, including its ruleset.
    /// </summary>
    /// <param name="guildSlug">The guild's slug, e.g. "the-hidden-king".</param>
    /// <param name="namespace">The profile namespace, e.g. "profile-forever-us".</param>
    /// <param name="region">The region to query.</param>
    /// <param name="locale">The locale for the response.</param>
    public async Task<RequestResult<ForeverGuild>> GetForeverGuildAsync(string guildSlug, string @namespace, Region region, Locale locale)
    {
        string host = GetHost(region);
        return await GetAsync<ForeverGuild>($"{host}/data/wow/guild/{Uri.EscapeDataString(guildSlug)}?namespace={@namespace}&locale={locale}");
    }

    /// <summary>
    /// Gets the members of a WoW: Forever guild.
    /// </summary>
    public async Task<RequestResult<ForeverGuildRoster>> GetForeverGuildRosterAsync(string guildSlug, string @namespace, Region region, Locale locale)
    {
        string host = GetHost(region);
        return await GetAsync<ForeverGuildRoster>($"{host}/data/wow/guild/{Uri.EscapeDataString(guildSlug)}/roster?namespace={@namespace}&locale={locale}");
    }
}
