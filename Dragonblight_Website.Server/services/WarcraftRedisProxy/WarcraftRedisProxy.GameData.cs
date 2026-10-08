using ArgentPonyWarcraftClient;

//Game data that belongs to no character: items and realms. From Blizzard, cached for a month.
partial class WarcraftRedisProxy
{
    //gets an item's icon media, scoped to the game flavor so retail and classic
    //never share a cache entry for the same item id
    public async Task<ItemMedia?> GetItemIcon(int itemId, string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        region = GetStaticRegion(region, flavor);
        return await GetBlizzardDataCached<ItemMedia?>("ItemIcon" + itemId + region, async () =>
        {
            var getItemIcon = await warcraftClient.GetItemMediaAsync(itemId, region, GetRegion(region), GetLocale(region));
            //a failed request still returns a result object, with Success false and a null Value.
            //returning null keeps the failure out of the cache so the next call retries.
            return getItemIcon.Success ? getItemIcon.Value : null;
        }, TimeSpan.FromDays(30));
    }
    public async Task<PlayableClass?> GetPlayableClass(int classId, string region, GameFlavor flavor = GameFlavor.Retail)
    {
        var ns = GetStaticRegion(region, flavor);
        return await GetBlizzardDataCached<PlayableClass?>("PlayableClass" + classId + ns, async () =>
        {
            var playableClass = await warcraftClient.GetPlayableClassAsync(classId, ns, GetRegion(ns), GetLocale(ns));
            return playableClass.Success ? playableClass.Value : null;
        }, TimeSpan.FromDays(30));
    }
    //inventory type names Blizzard returns, mapped to the numbers the model viewer files armor under
    private static readonly Dictionary<string, int> InventoryTypes = new()
    {
        ["HEAD"] = 1, ["NECK"] = 2, ["SHOULDER"] = 3, ["BODY"] = 4, ["CHEST"] = 5, ["WAIST"] = 6,
        ["LEGS"] = 7, ["FEET"] = 8, ["WRIST"] = 9, ["HAND"] = 10, ["FINGER"] = 11, ["TRINKET"] = 12,
        ["WEAPON"] = 13, ["SHIELD"] = 14, ["RANGED"] = 15, ["CLOAK"] = 16, ["TWOHWEAPON"] = 17,
        ["BAG"] = 18, ["TABARD"] = 19, ["ROBE"] = 20, ["WEAPONMAINHAND"] = 21, ["WEAPONOFFHAND"] = 22,
        ["HOLDABLE"] = 23, ["AMMO"] = 24, ["THROWN"] = 25, ["RANGEDRIGHT"] = 26, ["QUIVER"] = 27, ["RELIC"] = 28,
    };

    //Model viewer display info for an item: item -> appearance -> item_display_info_id.
    //Retail only - Blizzard has no item-appearance endpoint for classic (it 404s).
    //Raid and PvP gear lists one appearance per variant and the equipment response can't say
    //which is worn, so this takes the first, which is also the one Wowhead shows.
    //Failures return null and are not cached, so the next request retries.
    public async Task<ItemDisplayInfo?> GetItemDisplayInfo(int itemId, string region, GameFlavor flavor)
    {
        var ns = GetStaticRegion(region, flavor);
        return await GetBlizzardDataCached<ItemDisplayInfo?>("ItemDisplayInfo" + itemId + ns, async () =>
        {
            var item = await warcraftClient.GetItemAsync(itemId, ns, GetRegion(ns), GetLocale(ns));
            var appearanceId = item.Success ? item.Value.Appearances?.FirstOrDefault()?.Id : null;
            if (appearanceId == null)
            {
                return null;
            }
            var appearance = await warcraftClient.GetItemAppearanceAsync(appearanceId.Value, ns, GetRegion(ns), GetLocale(ns));
            if (!appearance.Success)
            {
                return null;
            }
            var inventoryType = InventoryTypes.GetValueOrDefault(item.Value.InventoryType?.Type ?? "", 0);
            return new ItemDisplayInfo(itemId, inventoryType, appearance.Value.Id, appearance.Value.ItemDisplayInfoId);
        }, TimeSpan.FromDays(30));
    }

    public async Task<RealmsIndex?> GetRealms(string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        var ns = GetDynamicRegion(region, flavor);
        return await GetBlizzardDataCached<RealmsIndex?>("Realmindex_" + ns, async () =>
        {
            var getRealmIndex = await warcraftClient.GetRealmsIndexAsync(ns, GetRegion(ns), GetLocale(ns));
            return getRealmIndex.Success ? getRealmIndex.Value: throw new Exception("Failure to Retrieve Realms");
        }, TimeSpan.FromDays(30));
    }
}
