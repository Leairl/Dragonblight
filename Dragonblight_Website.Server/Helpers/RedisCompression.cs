using System.IO.Compression;
using System.Text.Json;
using StackExchange.Redis;

namespace Dragonblight_Website.Server.Helpers;

//Cached Blizzard JSON is gzipped before it goes into Redis: ladders and achievements shrink several times
//over, which is what lets Redis fit in memory on a small server, and every read moves fewer bytes.
//Values written before this, and small values that are not worth compressing, are plain JSON. Reads tell
//the two apart by gzip's first two bytes (JSON never starts with them), so both can sit in Redis together.
//
//Only for values that are read and replaced whole. A list the code removes items from by value
//(ListRemove) must stay plain JSON, since compressed bytes are not guaranteed to match from run to run.
public static class RedisCompression
{
    //below this, gzip's header and the CPU are not worth the few bytes saved
    private const int MinCompressBytes = 1024;

    public static RedisValue Pack<T>(T value)
    {
        var json = JsonSerializer.SerializeToUtf8Bytes(value);
        if (json.Length < MinCompressBytes)
        {
            return json;
        }
        using var output = new MemoryStream(json.Length / 4);
        using (var gzip = new GZipStream(output, CompressionLevel.Optimal, leaveOpen: true))
        {
            gzip.Write(json);
        }
        return output.ToArray();
    }

    public static T? Unpack<T>(RedisValue value)
    {
        if (!value.HasValue)
        {
            return default;
        }
        var bytes = (byte[])value!;
        if (bytes.Length >= 2 && bytes[0] == 0x1F && bytes[1] == 0x8B)
        {
            using var input = new MemoryStream(bytes);
            using var gzip = new GZipStream(input, CompressionMode.Decompress);
            return JsonSerializer.Deserialize<T>(gzip);
        }
        return JsonSerializer.Deserialize<T>(bytes);
    }
}
