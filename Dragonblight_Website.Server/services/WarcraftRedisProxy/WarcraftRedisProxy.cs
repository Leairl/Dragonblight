using System.Text.Json;
using ArgentPonyWarcraftClient;
using StackExchange.Redis;

//The Redis-backed front for the Blizzard API, split across files by area:
//  this file              - the cache helpers every lookup goes through, and Blizzard namespaces
//  .Leaderboards          - PvP ladders, seasons, rewards and ladder history
//  .Shuffle               - Solo Shuffle ladders, one per spec (retail only)
//  .Characters            - a character's profile endpoints
//  .Talents               - character talents and the retail talent trees
//  .Activity              - rating changes between ladder syncs (Redis only)
//  .CachedLists           - looked-up characters and per-class ladder lists (Redis only)
//  .Alts                  - grouping characters by battle.net account
//  .GameData              - items and realms
partial class WarcraftRedisProxy(WarcraftClient _warcraftClient, IConnectionMultiplexer redis, ILogger<WarcraftRedisProxy> logger) : IWarcraftRedisProxy
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
    private const string SchemaVersion = "v4:";

    //the key a cache entry actually lives under
    private static string VersionedKey(string key) => SchemaVersion + key;

    public async Task<T?> GetRedisData<T>(string key)
    {  //async call to return data (of generic type), second type is to define the type.
        var db = redis.GetDatabase(); //var to redis database
        var StringRedis = await db.StringGetAsync(key); //var to get jsonstring from redis of key
        if (!StringRedis.HasValue) //return null if nothing for key
        {
            return default(T);
        }
        var result = JsonSerializer.Deserialize<T>(StringRedis!.ToString()); //deserialize jsonstring redis to obj of key
        return result;
    }

    public async Task SaveToRedis<T>(string key, T wowClass, TimeSpan expiration) //no inital generic type T since it's not needed to show saved redis data
    {
        var db = redis.GetDatabase(); //var to redis database
        var res = JsonSerializer.Serialize(wowClass); //serializes warcraftclient to string
        await db.StringSetAsync(key, res, expiration); //saves string in redis database
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
            res = await GetBlizzardData(key, BlizzardCall, expiration);
        }
        return res;
    }

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

    public string GetProfileRegion(string region, GameFlavor flavor = GameFlavor.MistsClassic)
        => "profile-" + flavor.NamespaceSegment() + region;
    public string GetDynamicRegion(string region, GameFlavor flavor = GameFlavor.MistsClassic)
        => "dynamic-" + flavor.NamespaceSegment() + region;
    public string GetStaticRegion(string region, GameFlavor flavor = GameFlavor.MistsClassic)
        => "static-" + flavor.NamespaceSegment() + region;
}
