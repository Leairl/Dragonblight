using ArgentPonyWarcraftClient;
using StackExchange.Redis;

//A character's profile endpoints: summary, appearance, achievements, equipment, stats and bracket
//ratings. Each comes from Blizzard and is cached, and an empty result is fetched once more in
//case the first call caught Blizzard mid-failure.
partial class WarcraftRedisProxy
{
    // get character summary in redis
    public async Task<CharacterPvpBracketStatistics> GetPvpBracketRating(string server, string characterName, string pvpBracket, string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        //creates unique character key from their server, character name, and region (this will prevent any duplicates)
        region = GetProfileRegion(region, flavor);
        var result = await GetBlizzardDataCached<CharacterPvpBracketStatistics>("GetCharacterRating" + server + characterName + pvpBracket + region, async () =>
        {
            //gets character data from wow api
            //storing into GetCharacter and pulls data with server, characterName, and region
            var GetCharacter = await warcraftClient.GetCharacterPvpBracketStatisticsAsync(server, characterName, pvpBracket, region, GetRegion(region), GetLocale(region));
            if (GetCharacter != null)
            {
                return GetCharacter.Value;
            }
            return new CharacterPvpBracketStatistics();
        }, TimeSpan.FromHours(2)); //uses getredisproxy generic type of characterprofilesummer to get profile summary + region from redis
        if (result == new CharacterPvpBracketStatistics())
        {
            redis.GetDatabase().KeyDelete(VersionedKey("GetCharacterRating" + server + characterName + pvpBracket + region));
            result = await GetBlizzardDataCached<CharacterPvpBracketStatistics>("GetCharacterRating" + server + characterName + pvpBracket + region, async () =>
            {
                //gets character data from wow api
                //storing into GetCharacter and pulls data with server, characterName, and region
                var GetCharacter = await warcraftClient.GetCharacterPvpBracketStatisticsAsync(server, characterName, pvpBracket, region, GetRegion(region), GetLocale(region));
                if (GetCharacter != null)
                {
                    return GetCharacter.Value;
                }
                return new CharacterPvpBracketStatistics();
            }, TimeSpan.FromHours(2)); //uses getredisproxy generic type of characterprofilesummer to get profile summary + region from redis
        }
        return result;
    }
    public async Task<CharacterStatisticsSummary> GetCharacterStats(string server, string characterName, string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        //creates unique character key from their server, character name, and region (this will prevent any duplicates)
        region = GetProfileRegion(region, flavor);
        var result = await GetBlizzardDataCached<CharacterStatisticsSummary>("GetCharacterStats" + server + characterName + region, async () =>
        {
            //gets character data from wow api
            //storing into GetCharacter and pulls data with server, characterName, and region
            var GetCharacterStats = await warcraftClient.GetCharacterStatisticsSummaryAsync(server, characterName, region, GetRegion(region), GetLocale(region));
            if (GetCharacterStats != null)
            {
                return GetCharacterStats.Value;
            }
            return new CharacterStatisticsSummary();
        }, TimeSpan.FromHours(6)); //uses getredisproxy generic type of characterprofilesummer to get profile summary + region from redis
        if (result == new CharacterStatisticsSummary())
        {
            redis.GetDatabase().KeyDelete(VersionedKey("GetCharacterStats" + server + characterName + region));
            result = await GetBlizzardDataCached<CharacterStatisticsSummary>("GetCharacterStats" + server + characterName + region, async () =>
            {
                //gets character data from wow api
                //storing into GetCharacter and pulls data with server, characterName, and region
                var GetCharacterStats = await warcraftClient.GetCharacterStatisticsSummaryAsync(server, characterName, region, GetRegion(region), GetLocale(region));
                if (GetCharacterStats != null)
                {
                    return GetCharacterStats.Value;
                }
                return new CharacterStatisticsSummary();
            }, TimeSpan.FromHours(6)); //uses getredisproxy generic type of characterprofilesummer to get profile summary + region from redis
        }
        return result;
    }

    public async Task<CharacterProfileSummary> GetCharSummary(string server, string characterName, string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        logger.LogInformation("Getting char summary for" + " " + characterName + " " + server);
        //creates unique character key from their server, character name, and region (this will prevent any duplicates)
        region = GetProfileRegion(region, flavor);
        var result = await GetBlizzardDataCached<CharacterProfileSummary>("GetCharacter" + server + characterName + region, async () =>
        {
            //gets character data from wow api
            //storing into GetCharacter and pulls data with server, characterName, and region
            var GetCharacter = await warcraftClient.GetCharacterProfileSummaryAsync(server, characterName, region, GetRegion(region), GetLocale(region));
            if (GetCharacter != null)
            {
                //call method to insert char name in cache
                await InsertCacheCharacter(characterName, server, region, flavor);
                return GetCharacter.Value;
            }
            return new CharacterProfileSummary();
        }, TimeSpan.FromDays(1)); //uses getredisproxy generic type of characterprofilesummer to get profile summary + region from redis
        if (result == new CharacterProfileSummary())
        {
            redis.GetDatabase().KeyDelete(VersionedKey("GetCharacter" + server + characterName + region));
            result = await GetBlizzardDataCached<CharacterProfileSummary>("GetCharacter" + server + characterName + region, async () =>
            {
                //gets character data from wow api
                //storing into GetCharacter and pulls data with server, characterName, and region
                var GetCharacter = await warcraftClient.GetCharacterProfileSummaryAsync(server, characterName, region, GetRegion(region), GetLocale(region));
                if (GetCharacter != null)
                {
                    //call method to insert char name in cache
                    return GetCharacter.Value;
                }
                return new CharacterProfileSummary();
            }, TimeSpan.FromDays(1)); //uses getredisproxy generic type of characterprofilesummer to get profile summary + region from redis
        }
        return result;
    }

    // get character summary in redis for character appearance
    public async Task<CharacterAppearanceSummary> GetCharAppearance(string server, string characterName, string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        region = GetProfileRegion(region, flavor);
        var result = await GetBlizzardDataCached<CharacterAppearanceSummary>("GetCharacterAppearance" + server + characterName + region, async () =>
        {
            //gets character data from wow api
            //storing into GetCharacter and pulls data with server, characterName, and region
            var GetCharacter = await warcraftClient.GetCharacterAppearanceSummaryAsync(server, characterName, region, GetRegion(region), GetLocale(region));
            if (GetCharacter != null)
            {
                //call method to insert char name in cache
                return GetCharacter.Value;
            }
            return new CharacterAppearanceSummary();
        }, TimeSpan.FromDays(1)); //uses getredisproxy generic type of characterprofilesummer to get profile summary + region from redis
        if (result == new CharacterAppearanceSummary())
        {
            redis.GetDatabase().KeyDelete(VersionedKey("GetCharacterAppearance" + server + characterName + region));
            result = await GetBlizzardDataCached<CharacterAppearanceSummary>("GetCharacterAppearance" + server + characterName + region, async () =>
            {
                //gets character data from wow api
                //storing into GetCharacter and pulls data with server, characterName, and region
                var GetCharacter = await warcraftClient.GetCharacterAppearanceSummaryAsync(server, characterName, region, GetRegion(region), GetLocale(region));
                if (GetCharacter != null)
                {
                    //call method to insert char name in cache
                    return GetCharacter.Value;
                }
                return new CharacterAppearanceSummary();
            }, TimeSpan.FromDays(1)); //uses getredisproxy generic type of characterprofilesummer to get profile summary + region from redis
        }
        return result;
    }
    // get character summary in redis for character appearance
    public async Task<CharacterAchievementsSummary> GetCharacterAchievements(string server, string characterName, string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        //the alt list is keyed by the region the caller asked for, so hold on to it before the line
        //below overwrites region with the blizzard namespace
        var altRegion = region;
        region = GetProfileRegion(region, flavor);
        var result = await GetBlizzardDataCached<CharacterAchievementsSummary>("GetCharacterAchievements" + server + characterName + region, async () =>
        {
            //gets character data from wow api
            //storing into GetCharacter and pulls data with server, characterName, and region
            var GetCharacter = await warcraftClient.GetCharacterAchievementsSummaryAsync(server, characterName, region, GetRegion(region), GetLocale(region));
            if (GetCharacter != null)
            {
                //call method to insert char name in cache
                return GetCharacter.Value;
            }
            return new CharacterAchievementsSummary();
        }, TimeSpan.FromDays(1)); //uses getredisproxy generic type of characterprofilesummer to get profile summary + region from redis
        if (result == new CharacterAchievementsSummary())
        {
            redis.GetDatabase().KeyDelete(VersionedKey("GetCharacterAchievements" + server + characterName + region));
            result = await GetBlizzardDataCached<CharacterAchievementsSummary>("GetCharacterAchievements" + server + characterName + region, async () =>
            {
                //gets character data from wow api
                //storing into GetCharacter and pulls data with server, characterName, and region
                var GetCharacter = await warcraftClient.GetCharacterAchievementsSummaryAsync(server, characterName, region, GetRegion(region), GetLocale(region));
                if (GetCharacter != null)
                {
                    //call method to insert char name in cache
                    return GetCharacter.Value;
                }
                return new CharacterAchievementsSummary();
            }, TimeSpan.FromDays(1)); //uses getredisproxy generic type of characterprofilesummer to get profile summary + region from redis
        }
        //every character whose achievements are read joins its account's alt list, so viewing one
        //character is what puts it within reach of the others
        await InsertAltList(server, characterName, altRegion, result, flavor);
        return result;
    }
    // get character summary in redis for character equipment
    public async Task<CharacterEquipmentSummary> GetCharEquipment(string server, string characterName, string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        region = GetProfileRegion(region, flavor);
        var result = await GetBlizzardDataCached<CharacterEquipmentSummary>("GetCharacterEquipment" + server + characterName + region, async () =>
        {
            //gets character data from wow api
            //storing into GetCharacter and pulls data with server, characterName, and region
            var GetCharacter = await warcraftClient.GetCharacterEquipmentSummaryAsync(server, characterName, region, GetRegion(region), GetLocale(region));
            if (GetCharacter != null)
            {
                //call method to insert char name in cache
                return GetCharacter.Value;
            }
            return new CharacterEquipmentSummary();
        }, TimeSpan.FromDays(1)); //uses getredisproxy generic type of characterprofilesummer to get profile summary + region from redis
        if (result == new CharacterEquipmentSummary())
        {
            redis.GetDatabase().KeyDelete(VersionedKey("GetCharacterEquipment" + server + characterName + region));
            result = await GetBlizzardDataCached<CharacterEquipmentSummary>("GetCharacterEquipment" + server + characterName + region, async () =>
            {
                //gets character data from wow api
                //storing into GetCharacter and pulls data with server, characterName, and region
                var GetCharacter = await warcraftClient.GetCharacterEquipmentSummaryAsync(server, characterName, region, GetRegion(region), GetLocale(region));
                if (GetCharacter != null)
                {
                    //call method to insert char name in cache
                    return GetCharacter.Value;
                }
                return new CharacterEquipmentSummary();
            }, TimeSpan.FromDays(1)); //uses getredisproxy generic type of characterprofilesummer to get profile summary + region from redis
        }
        return result;
    }

    //Forgets everything cached for one character, so the profile's next requests go to Blizzard and
    //come back current. Returns false while the character is on cooldown: a refresh turns every one of
    //those requests into a Blizzard call, so a character can only be refreshed every few minutes.
    public async Task<bool> ClearCharacterCache(string server, string characterName, string region, GameFlavor flavor = GameFlavor.MistsClassic)
    {
        var db = redis.GetDatabase();
        var cooldown = flavor.KeyPrefix() + "RefreshCooldown" + server + characterName + region;
        if (!await db.StringSetAsync(cooldown, "1", TimeSpan.FromMinutes(5), When.NotExists))
        {
            return false;
        }
        var profileRegion = GetProfileRegion(region, flavor);
        var keys = new List<RedisKey>
        {
            VersionedKey("GetCharacter" + server + characterName + profileRegion),
            VersionedKey("GetCharacterAppearance" + server + characterName + profileRegion),
            VersionedKey("GetCharacterAchievements" + server + characterName + profileRegion),
            VersionedKey("GetCharacterEquipment" + server + characterName + profileRegion),
            VersionedKey("GetCharacterStats" + server + characterName + profileRegion),
            VersionedKey("characterSpecSummary" + characterName + server + profileRegion),
            VersionedKey(flavor.KeyPrefix() + "characterSpecName" + characterName + server + region),
        };
        //one rating key per bracket played, and Shuffle and Blitz add one per spec, so these are found
        //by pattern rather than listed
        var ratings = VersionedKey("GetCharacterRating" + server + characterName) + "*" + profileRegion;
        foreach (var endpoint in redis.GetEndPoints())
        {
            await foreach (var key in redis.GetServer(endpoint).KeysAsync(pattern: ratings))
            {
                keys.Add(key);
            }
        }
        await db.KeyDeleteAsync(keys.ToArray());
        return true;
    }
}
