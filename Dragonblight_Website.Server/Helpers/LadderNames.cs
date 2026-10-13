namespace Dragonblight_Website.Server.Helpers;
public static class LadderNames
{
    public static string ForSpec(string ladder, string? className, string? specName)
    {
        return ladder + "-" + BracketName(className) + "-" + BracketName(specName);
    }


    public static string BracketName(string? name) => (name ?? "").Replace(" ", "").ToLowerInvariant();
}