namespace ArgentPonyWarcraftClient;

//WoW: Forever character collections. Only the fields the site shows are kept: the transmog list
//alone is about 50 KB from Blizzard, mostly links, and dropping them keeps the cached copy small.
//Blizzard leaves an array out entirely when the character has none of that kind.

public record ForeverIdReference
{
    [JsonPropertyName("id")]
    public int Id { get; init; }
}

public record ForeverNamedReference
{
    [JsonPropertyName("id")]
    public int Id { get; init; }
    [JsonPropertyName("name")]
    public string? Name { get; init; }
}

public record ForeverMountsCollection
{
    [JsonPropertyName("mounts")]
    public ForeverCollectedMount[]? Mounts { get; init; }
}

public record ForeverCollectedMount
{
    [JsonPropertyName("mount")]
    public ForeverNamedReference? Mount { get; init; }
    [JsonPropertyName("is_useable")]
    public bool? IsUseable { get; init; }
}

public record ForeverPetsCollection
{
    [JsonPropertyName("pets")]
    public ForeverCollectedPet[]? Pets { get; init; }
    [JsonPropertyName("unlocked_battle_pet_slots")]
    public int? UnlockedBattlePetSlots { get; init; }
}

public record ForeverCollectedPet
{
    //the character's own pet; species is what kind of pet it is
    [JsonPropertyName("id")]
    public int Id { get; init; }
    [JsonPropertyName("species")]
    public ForeverNamedReference? Species { get; init; }
    [JsonPropertyName("level")]
    public int? Level { get; init; }
    [JsonPropertyName("quality")]
    public EnumType? Quality { get; init; }
}

public record ForeverToysCollection
{
    [JsonPropertyName("toys")]
    public ForeverCollectedToy[]? Toys { get; init; }
}

public record ForeverCollectedToy
{
    [JsonPropertyName("toy")]
    public ForeverNamedReference? Toy { get; init; }
}

public record ForeverTransmogsCollection
{
    [JsonPropertyName("slots")]
    public ForeverTransmogSlot[]? Slots { get; init; }
}

public record ForeverTransmogSlot
{
    [JsonPropertyName("slot")]
    public EnumType? Slot { get; init; }
    [JsonPropertyName("appearances")]
    public ForeverIdReference[]? Appearances { get; init; }
}

//---- static game data: what exists in Forever, and what each collectible looks like ----

public record ForeverMountsIndex
{
    [JsonPropertyName("mounts")]
    public ForeverNamedReference[]? Mounts { get; init; }
}

public record ForeverPetsIndex
{
    [JsonPropertyName("pets")]
    public ForeverNamedReference[]? Pets { get; init; }
}

public record ForeverToysIndex
{
    [JsonPropertyName("toys")]
    public ForeverNamedReference[]? Toys { get; init; }
}

//Forever mounts have no icon, only creature displays whose render is the mount's picture.
public record ForeverMount
{
    [JsonPropertyName("id")]
    public int Id { get; init; }
    [JsonPropertyName("creature_displays")]
    public ForeverIdReference[]? CreatureDisplays { get; init; }
}

//Unlike mounts and toys, a pet species carries its icon URL directly.
public record ForeverPet
{
    [JsonPropertyName("id")]
    public int Id { get; init; }
    [JsonPropertyName("icon")]
    public string? Icon { get; init; }
}

//A toy's icon is its item's icon, found through the item media it links to.
public record ForeverToy
{
    [JsonPropertyName("id")]
    public int Id { get; init; }
    [JsonPropertyName("media")]
    public ForeverIdReference? Media { get; init; }
}
