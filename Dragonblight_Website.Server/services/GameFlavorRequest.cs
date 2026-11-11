/// <summary>
/// Reads the game flavor for the current request.
/// The client sends it as a header so the flavor never has to be added to every
/// action signature (which would mean regenerating the TypeScript client).
/// Controllers still pass the value down explicitly - nothing below this reads it
/// from request state.
/// </summary>
public static class GameFlavorRequest
{
    public const string HeaderName = "X-Game-Flavor";

    public static GameFlavor GetGameFlavor(this HttpContext? context)
    {
        var raw = context?.Request?.Headers[HeaderName].ToString();
        if (string.Equals(raw, "retail", StringComparison.OrdinalIgnoreCase))
        {
            return GameFlavor.Retail;
        }
        if (string.Equals(raw, "forever", StringComparison.OrdinalIgnoreCase))
        {
            return GameFlavor.Forever;
        }
        //anything unrecognised, including no header at all, stays on classic
        return GameFlavor.MistsClassic;
    }
}
