/// <summary>
/// Which version of World of Warcraft a request targets.
/// The Blizzard API exposes all of them through the same endpoints, distinguished
/// only by a segment in the namespace query parameter.
/// Forever is WoW: Forever, Blizzard's 2026 "Classic+". Its API is undocumented;
/// the namespaces here are the ones the community found by probing.
/// </summary>
public enum GameFlavor
{
    Retail,
    MistsClassic,
    Forever
}

public static class GameFlavorExtensions
{
    /// <summary>
    /// The segment this flavor contributes to a Blizzard API namespace, e.g.
    /// "profile-" + segment + "us" gives "profile-us", "profile-classic-us" or
    /// "profile-forever-us".
    /// </summary>
    public static string NamespaceSegment(this GameFlavor flavor) => flavor switch
    {
        GameFlavor.Retail       => "",
        GameFlavor.MistsClassic => "classic-",
        GameFlavor.Forever      => "forever-",
        _ => throw new ArgumentOutOfRangeException(nameof(flavor))
    };

    /// <summary>
    /// Prefix this flavor contributes to Redis keys that are not derived from a
    /// Blizzard namespace. Every flavor contributes a distinct prefix so two
    /// flavors can never share a key.
    /// </summary>
    public static string KeyPrefix(this GameFlavor flavor) => flavor switch
    {
        GameFlavor.Retail       => "retail_",
        GameFlavor.MistsClassic => "classic_",
        GameFlavor.Forever      => "forever_",
        _ => throw new ArgumentOutOfRangeException(nameof(flavor))
    };

    /// <summary>
    /// PvP brackets this flavor has ladders for, in display order. Retail removed 5v5.
    /// Forever has no PvP leaderboard API yet, so it has none.
    /// The client mirrors this list (brackets() in helpers/game-flavor.ts) and labels
    /// rating cards by position, so the two lists must stay in the same order.
    /// </summary>
    public static IReadOnlyList<string> Brackets(this GameFlavor flavor) => flavor switch
    {
        GameFlavor.Retail       => ["2v2", "3v3", "rbg"],
        GameFlavor.MistsClassic => ["2v2", "3v3", "5v5", "rbg"],
        GameFlavor.Forever      => [],
        _ => throw new ArgumentOutOfRangeException(nameof(flavor))
    };
}
