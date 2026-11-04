using System.Text.RegularExpressions;
using ArgentPonyWarcraftClient;

//A character's talents and spec, and the retail talent trees they are drawn on. All from Blizzard, cached.
partial class WarcraftRedisProxy
{
    public async Task<CharacterSpecializationsSummary> GetPlayerTalents(string server, string characterName, string region, GameFlavor flavor)
    {
        region = GetProfileRegion(region, flavor);
        return await GetBlizzardDataCached<CharacterSpecializationsSummary>("characterSpecSummary" + characterName + server + region, async () =>
        {
            var charSpecSummary = await warcraftClient.GetCharacterSpecializationsSummaryAsync(server, characterName, region, GetRegion(region), GetLocale(region));
            return charSpecSummary.Value;
        }, TimeSpan.FromHours(6));
    }

    //Fetches a character's current spec past the cache, for a character who has just played. It only
    //replaces what's cached once Blizzard has answered, so a failed lookup leaves the old spec in place.
    //Retail's spec is on the profile, and classic's comes from the talents.
    public async Task RefreshCharacterSpec(string server, string characterName, string region, GameFlavor flavor)
    {
        var ns = GetProfileRegion(region, flavor);
        try
        {
            if (flavor == GameFlavor.Retail)
            {
                var profile = await warcraftClient.GetCharacterProfileSummaryAsync(server, characterName, ns, GetRegion(region), GetLocale(region));
                if (profile.Success && profile.Value != null)
                {
                    await SaveToRedis(VersionedKey("GetCharacter" + server + characterName + ns), profile.Value, TimeSpan.FromDays(1));
                }
                return;
            }
            var talents = await warcraftClient.GetCharacterSpecializationsSummaryAsync(server, characterName, ns, GetRegion(ns), GetLocale(ns));
            if (talents.Success && talents.Value != null)
            {
                await SaveToRedis(VersionedKey("characterSpecSummary" + characterName + server + ns), talents.Value, TimeSpan.FromHours(6));
                await SaveToRedis(VersionedKey(flavor.KeyPrefix() + "characterSpecName" + characterName + server + region), talents.Value.ActiveSpecialization?.Name ?? "", TimeSpan.FromHours(6));
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Could not refresh the spec for " + characterName + " " + server);
        }
    }

    //The retail talent trees a spec draws from: one call returns the class tree, the spec tree
    //and every hero tree, each node carrying the grid position Wowhead lays them out by.
    //Static game data, so it is cached for a month. A failure returns null and is not cached,
    //so the next request retries instead of serving an empty tree for 30 days.
    public async Task<TalentTree?> GetTalentTree(int specId, string region, GameFlavor flavor)
    {
        var ns = GetStaticRegion(region, flavor);
        return await GetBlizzardDataCached<TalentTree?>("TalentTree" + specId + ns, async () =>
        {
            var index = await warcraftClient.GetTalentTreeIndexAsync(ns, GetRegion(ns), GetLocale(ns));
            if (!index.Success)
            {
                return null;
            }
            //a tree belongs to a class, not a spec, and the index is the only place the pairing
            //is published - each spec entry's href ends in the spec id it is for.
            var href = index.Value.SpecTalentTrees?
                .FirstOrDefault(t => t.Key?.Href?.ToString().Contains($"/playable-specialization/{specId}?") == true)
                ?.Key?.Href?.ToString();
            var treeId = TalentTreeIdFromHref(href);
            if (treeId == null)
            {
                return null;
            }
            var tree = await warcraftClient.GetTalentTreeAsync(treeId.Value, specId, ns, GetRegion(ns), GetLocale(ns));
            return tree.Success ? tree.Value : null;
        }, TimeSpan.FromDays(30));
    }

    //pulls 774 out of .../data/wow/talent-tree/774/playable-specialization/253?namespace=...
    private static int? TalentTreeIdFromHref(string? href)
    {
        var match = Regex.Match(href ?? "", @"talent-tree/(\d+)/playable-specialization");
        return match.Success ? int.Parse(match.Groups[1].Value) : null;
    }

    public async Task<string> GetCharacterSpecName(string server, string characterName, string region, GameFlavor flavor)
    {
        return await GetBlizzardDataCached<string>(flavor.KeyPrefix() + "characterSpecName" + characterName + server + region, async () =>
        {
            if (flavor == GameFlavor.Retail)
            {
                return "";
            }
            var talents = await GetPlayerTalents(server, characterName, region, flavor);
            return talents?.ActiveSpecialization?.Name ?? "";
        }, TimeSpan.FromHours(6));
    }
}
