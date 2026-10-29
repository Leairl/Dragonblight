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
            var activeSpecialization = talents?.SpecializationGroups.Where(s => s.IsActive).FirstOrDefault();
            var specName = activeSpecialization?.Specializations?.OrderByDescending(spec => spec.SpentPoints)?.FirstOrDefault()?.SpecializationName;
            return specName ?? "";

        }, TimeSpan.FromHours(6));
    }
}
