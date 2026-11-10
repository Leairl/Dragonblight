using System.Collections.Concurrent;
using System.Text.Json;
using Dragonblight_Website.Server.Helpers;
using ArgentPonyWarcraftClient;
using Microsoft.Extensions.Caching.Memory;
using StackExchange.Redis;

//The Redis-backed front for the Blizzard API, split across files by area:
//  this file              - the cache helpers every lookup goes through, and Blizzard namespaces
//  .Leaderboards          - PvP ladders, seasons, and rewards.
//  .Shuffle               - Solo Shuffle ladders, one per spec (retail only)
//  .Characters            - a character's profile endpoints
//  .Talents               - character talents and the retail talent trees
//  .Activity              - rating changes between ladder syncs (Redis only)
//  .CachedLists           - looked-up characters and per-class ladder lists (Redis only)
//  .Alts                  - grouping characters by battle.net account
//  .Estimates             - live cutoff estimates for the percentage titles, and their history
//  .GameData              - items and realms
partial class WarcraftRedisProxy(WarcraftClient _warcraftClient, IConnectionMultiplexer redis, IMemoryCache memoryCache, ILogger<WarcraftRedisProxy> logger) : IWarcraftRedisProxy
{
    public WarcraftClient? overrideClient{get; set;}
    private WarcraftClient warcraftClient{get {
        if (overrideClient != null){
            return overrideClient;
        }
        return _warcraftClient;
    }}
    //Cached entries are JSON of the models these methods return, so adding a field to one of those
    //models changes nothing already in Redis: a character looked up before the change keeps coming
    //back with the new field empty until its key expires, which is a day for some of them. Raising
    //this number retires every cached entry at once, and it has to be raised whenever a cached model
    //gains a field the site reads.
    //v5: equipment items gained limit_category, which is how embellishments are recognised
    //v6: character stats gained rating_normalized, the name retail now reports ratings under
    private const string SchemaVersion = "v6:";

    //the key a cache entry actually lives under
    public static string VersionedKey(string key) => SchemaVersion + key;
    public string ExternalVersionedKey(string key) => VersionedKey(key);
    public async Task<T?> GetRedisData<T>(string key)
    {  //async call to return data (of generic type), second type is to define the type.
        var db = redis.GetDatabase(); //var to redis database
        var StringRedis = await db.StringGetAsync(key); //json from redis, gzipped if it was large
        return RedisCompression.Unpack<T>(StringRedis); //null if nothing for key
    }

    public async Task SaveToRedis<T>(string key, T value, TimeSpan? expiration) //no inital generic type T since it's not needed to show saved redis data
    {
        var db = redis.GetDatabase(); //var to redis database
        await db.StringSetAsync(key, RedisCompression.Pack(value), expiration); //saves json in redis, gzipped if it is large
    }

    public async Task<T> GetBlizzardData<T>(string key, Func<Task<T>> BlizzardCall, TimeSpan expiration)
    {
        var BlizzardData = await BlizzardCall(); //setting var of generic function
        await SaveToRedis(VersionedKey(key), BlizzardData, expiration); //calls to savetoredis method with blizzardData (set in other methods below, and is currently a generic function here)
        return BlizzardData; //returns warcraftclient data after saved to redis on UI
    }

    public async Task<T> GetBlizzardDataCached<T>(string key, Func<Task<T>> BlizzardCall, TimeSpan expiration)
    {
        //has unique key for each character, results in no duplicate characters pulled from redis
        var res = await GetRedisData<T>(VersionedKey(key));
        if (res == null || res is 0)
        {
            res = await FetchOnce(key, () => GetBlizzardData(key, BlizzardCall, expiration));
        }
        return res;
    }

    //Blizzard calls in progress, by cache key. A profile page asks for the same data from several
    //components at once (the achievements are read by four of them), and on a cold cache each one
    //used to make its own Blizzard call - for achievements, a 1-4 MB download each. Requests that
    //arrive while a call is running now wait on that call. Static because the proxy is scoped per request.
    private static readonly ConcurrentDictionary<string, object> InFlight = new();

    private static async Task<T> FetchOnce<T>(string key, Func<Task<T>> fetch)
    {
        //the type is part of the key so a cast below can never meet a call made for another type
        var flightKey = typeof(T).FullName + "|" + key;
        var call = (Lazy<Task<T>>)InFlight.GetOrAdd(flightKey, _ => new Lazy<Task<T>>(fetch));
        try
        {
            return await call.Value;
        }
        finally
        {
            //only removes this call, never a newer one that started after it finished
            InFlight.TryRemove(new KeyValuePair<string, object>(flightKey, call));
        }
    }

    //GetPvPRewards with each reward's rank on its ladder. Kept until the next sync, which deletes it.
    public static string RewardRanksKey(string region, GameFlavor flavor)
        => VersionedKey(flavor.KeyPrefix() + "RewardRanks-" + region.ToLowerInvariant());

    public Region GetRegion(string region)
    {
        if (region == "us" || region.Contains("-us"))
        {
            return Region.US;
        }
        return Region.Europe;
    }
    public Locale GetLocale(string region)
    {
        if (region == "us" || region.Contains("-us"))
        {
            return Locale.en_US;
        }
        return Locale.en_GB;
    }

    public string GetProfileRegion(string region, GameFlavor flavor)
        => "profile-" + flavor.NamespaceSegment() + region;
    public string GetDynamicRegion(string region, GameFlavor flavor)
        => "dynamic-" + flavor.NamespaceSegment() + region;
    public string GetStaticRegion(string region, GameFlavor flavor)
        => "static-" + flavor.NamespaceSegment() + region;
}
