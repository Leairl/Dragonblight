using System.Text;
using ArgentPonyWarcraftClient;
using Microsoft.AspNetCore.Mvc;

namespace Dragonblight_Website.Server.Controllers
{
    //WoW: Forever character pages. Kept apart from ProfileController because Forever
    //characters have no realm: they are looked up by region and "name-surname".
    [ApiController]
    [Route("api/[controller]")]
    public partial class ForeverCharacterController : ControllerBase
    {
        private readonly ILogger<ForeverCharacterController> _logger;
        private readonly IWarcraftRedisProxy _warcraftCachedData;
        private readonly ForeverStatsQueue _statsQueue;

        public ForeverCharacterController(ILogger<ForeverCharacterController> logger, IWarcraftRedisProxy warcraftCachedData, ForeverStatsQueue statsQueue)
        {
            _logger = logger;
            _warcraftCachedData = warcraftCachedData;
            _statsQueue = statsQueue;
        }

        //a name, a hyphen and a surname, each made of letters (accented ones included)
        private static bool IsCharacterSlug(string slug)
        {
            var parts = slug.Split('-');
            if (parts.Length != 2)
            {
                return false;
            }
            foreach (var part in parts)
            {
                if (part.Length == 0 || !part.All(char.IsLetter))
                {
                    return false;
                }
            }
            return true;
        }

        //Everything the Forever character page shows, in one call. Blizzard's API has no profile
        //for some characters its guild rosters and the Armory already show, so when the profile
        //is missing the page gets what the stats crawl last saw of the character in a roster
        //instead. 404 only when there is neither.
        [HttpGet("GetCharacter")]
        public async Task<ActionResult<ForeverCharacterPage>> GetCharacter(string region, string characterSlug)
        {
            region = region.ToLowerInvariant();
            if (region != "us" && region != "eu")
            {
                return BadRequest("region must be us or eu");
            }
            characterSlug = characterSlug.ToLowerInvariant();
            if (characterSlug.Length > 64 || !IsCharacterSlug(characterSlug))
            {
                return BadRequest("characterSlug must be name-surname");
            }
            try
            {
                var profileTask = _warcraftCachedData.GetForeverCharacter(characterSlug, region);
                var equipmentTask = _warcraftCachedData.GetForeverEquipment(characterSlug, region);
                var mediaTask = _warcraftCachedData.GetForeverMedia(characterSlug, region);
                await Task.WhenAll(profileTask, equipmentTask, mediaTask);

                var profile = profileTask.Result;
                if (profile == null)
                {
                    var rosterCharacter = await _warcraftCachedData.GetForeverStatsCharacter(characterSlug, region);
                    if (rosterCharacter == null)
                    {
                        return NotFound();
                    }
                    return Ok(new ForeverCharacterPage
                    {
                        rosterCharacter = rosterCharacter,
                    });
                }
                //found characters become suggestions in the Forever search box. Blizzard finds
                //"lucid-dreamx" for "Lucid Ðreamx" too, so the list records the name as Blizzard
                //spells it rather than as it was typed, or one character would be listed twice
                await _warcraftCachedData.InsertForeverCachedCharacter((profile.Name + "-" + profile.Surname).ToLowerInvariant(), region);
                //their guild joins the stats sample now rather than at the next hourly run, which
                //also lets guildmates Blizzard has no profile for show from the roster right away
                _statsQueue.QueueGuild(region, ForeverStatsService.GuildSlugOf(profile.Guild));
                return Ok(new ForeverCharacterPage
                {
                    profile = profile,
                    equipment = equipmentTask.Result,
                    media = mediaTask.Result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while getting Forever character {Slug} in {Region}.", characterSlug, region);
                return StatusCode(500);
            }
        }

        [HttpGet("GetProfessions")]
        [ProducesResponseType(typeof(CharacterProfessionsSummary), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<CharacterProfessionsSummary>> GetProfessions(string region, string characterSlug)
        {
            region = region.ToLowerInvariant();
            if (region != "us" && region != "eu")
            {
                return BadRequest("region must be us or eu");
            }
            characterSlug = characterSlug.ToLowerInvariant();
            if (characterSlug.Length > 64 || !IsCharacterSlug(characterSlug))
            {
                return BadRequest("characterSlug must be name-surname");
            }
            try
            {
                var result = await _warcraftCachedData.GetForeverProfessions(characterSlug, region);
                if (result == null)
                {
                    return NotFound(new ProblemDetails
                    {
                        Status = StatusCodes.Status404NotFound,
                        Title = "Profession data is not available for this character."
                    });
                }
                CacheCharacterData();
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while getting Forever professions for {Slug} in {Region}.", characterSlug, region);
                return StatusCode(500);
            }
        }

        [HttpGet("GetPvpSummary")]
        [ProducesResponseType(typeof(ForeverPvpSummary), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ForeverPvpSummary>> GetPvpSummary(string region, string characterSlug)
        {
            region = region.ToLowerInvariant();
            if (region != "us" && region != "eu")
            {
                return BadRequest("region must be us or eu");
            }
            characterSlug = characterSlug.ToLowerInvariant();
            if (characterSlug.Length > 64 || !IsCharacterSlug(characterSlug))
            {
                return BadRequest("characterSlug must be name-surname");
            }
            try
            {
                var result = await _warcraftCachedData.GetForeverPvpSummary(characterSlug, region);
                if (result == null)
                {
                    return NotFound(new ProblemDetails
                    {
                        Status = StatusCodes.Status404NotFound,
                        Title = "PvP data is not available for this character."
                    });
                }
                CacheCharacterData();
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while getting Forever PvP summary for {Slug} in {Region}.", characterSlug, region);
                return StatusCode(500);
            }
        }

        [HttpGet("GetStats")]
        [ProducesResponseType(typeof(ForeverCharacterStatistics), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ForeverCharacterStatistics>> GetStats(string region, string characterSlug)
        {
            region = region.ToLowerInvariant();
            if (region != "us" && region != "eu")
            {
                return BadRequest("region must be us or eu");
            }
            characterSlug = characterSlug.ToLowerInvariant();
            if (characterSlug.Length > 64 || !IsCharacterSlug(characterSlug))
            {
                return BadRequest("characterSlug must be name-surname");
            }
            try
            {
                var result = await _warcraftCachedData.GetForeverCharacterStats(characterSlug, region);
                if (result == null)
                {
                    return NotFound(new ProblemDetails
                    {
                        Status = StatusCodes.Status404NotFound,
                        Title = "Stats are not available for this character."
                    });
                }
                CacheCharacterData();
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while getting Forever stats for {Slug} in {Region}.", characterSlug, region);
                return StatusCode(500);
            }
        }

        [HttpGet("GetReputations")]
        [ProducesResponseType(typeof(ForeverReputationsSummary), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ForeverReputationsSummary>> GetReputations(string region, string characterSlug)
        {
            region = region.ToLowerInvariant();
            if (region != "us" && region != "eu")
            {
                return BadRequest("region must be us or eu");
            }
            characterSlug = characterSlug.ToLowerInvariant();
            if (characterSlug.Length > 64 || !IsCharacterSlug(characterSlug))
            {
                return BadRequest("characterSlug must be name-surname");
            }
            try
            {
                var result = await _warcraftCachedData.GetForeverReputations(characterSlug, region);
                if (result == null)
                {
                    return NotFound(new ProblemDetails
                    {
                        Status = StatusCodes.Status404NotFound,
                        Title = "Reputation data is not available for this character."
                    });
                }
                CacheCharacterData();
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while getting Forever reputations for {Slug} in {Region}.", characterSlug, region);
                return StatusCode(500);
            }
        }

        [HttpGet("GetAchievements")]
        [ProducesResponseType(typeof(ForeverAchievementsSummary), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ForeverAchievementsSummary>> GetAchievements(string region, string characterSlug)
        {
            region = region.ToLowerInvariant();
            if (region != "us" && region != "eu") return BadRequest("region must be us or eu");
            characterSlug = characterSlug.ToLowerInvariant();
            if (characterSlug.Length > 64 || !IsCharacterSlug(characterSlug)) return BadRequest("characterSlug must be name-surname");
            try
            {
                var result = await _warcraftCachedData.GetForeverAchievements(characterSlug, region);
                if (result == null) return NotFound(new ProblemDetails
                {
                    Status = StatusCodes.Status404NotFound,
                    Title = "Achievement data is not available for this character."
                });
                CacheCharacterData();
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while getting Forever achievements for {Slug} in {Region}.", characterSlug, region);
                return StatusCode(500);
            }
        }

        //A character's mounts, pets, toys and appearances in one call, with Forever's totals for each.
        //Appearances are counted per slot: there are hundreds and none has a name in the collection.
        //404 when Blizzard has none of the four for the character.
        [HttpGet("GetCollections")]
        [ProducesResponseType(typeof(ForeverCollectionsPage), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ForeverCollectionsPage>> GetCollections(string region, string characterSlug)
        {
            region = region.ToLowerInvariant();
            if (region != "us" && region != "eu") return BadRequest("region must be us or eu");
            characterSlug = characterSlug.ToLowerInvariant();
            if (characterSlug.Length > 64 || !IsCharacterSlug(characterSlug)) return BadRequest("characterSlug must be name-surname");
            try
            {
                var mountsTask = _warcraftCachedData.GetForeverMounts(characterSlug, region);
                var petsTask = _warcraftCachedData.GetForeverPets(characterSlug, region);
                var toysTask = _warcraftCachedData.GetForeverToys(characterSlug, region);
                var transmogsTask = _warcraftCachedData.GetForeverTransmogs(characterSlug, region);
                var totalsTask = _warcraftCachedData.GetForeverCollectionTotals(region);
                await Task.WhenAll(mountsTask, petsTask, toysTask, transmogsTask, totalsTask);
                var (mounts, pets, toys, transmogs) = (mountsTask.Result, petsTask.Result, toysTask.Result, transmogsTask.Result);
                if (mounts == null && pets == null && toys == null && transmogs == null) return NotFound(new ProblemDetails
                {
                    Status = StatusCodes.Status404NotFound,
                    Title = "Collection data is not available for this character."
                });
                CacheCharacterData();
                return Ok(new ForeverCollectionsPage
                {
                    mounts = mounts?.Mounts?.Where(m => m.Mount != null).OrderBy(m => m.Mount!.Name).ToArray() ?? [],
                    pets = pets?.Pets?.Where(p => p.Species != null).OrderBy(p => p.Species!.Name).ToArray() ?? [],
                    toys = toys?.Toys?.Where(t => t.Toy != null).OrderBy(t => t.Toy!.Name).ToArray() ?? [],
                    unlockedBattlePetSlots = pets?.UnlockedBattlePetSlots,
                    appearanceSlots = await AppearanceSlots(transmogs, region),
                    totals = totalsTask.Result,
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while getting Forever collections for {Slug} in {Region}.", characterSlug, region);
                return StatusCode(500);
            }
        }

        //Blizzard splits some slots that share a name (chest and robe, both "Chest"), so slots are merged
        //by name, in Blizzard's order, listing each appearance once. Names come from Forever's item
        //catalog. Appearances with no item in it, and the game's "Hidden Helm"-style items that hide a
        //slot, aren't anything a player collected, so they are left out of the lists and the counts.
        //When the catalog can't be read the page still gets every appearance, just unnamed.
        private async Task<ForeverAppearanceSlot[]> AppearanceSlots(ForeverTransmogsCollection? transmogs, string region)
        {
            var groups = (transmogs?.Slots ?? [])
                .GroupBy(slot => slot.Slot?.Name ?? slot.Slot?.Type ?? "Unknown slot")
                .Select(group => (type: group.First().Slot?.Type ?? "", name: group.Key,
                    ids: group.SelectMany(slot => slot.Appearances ?? []).Select(a => a.Id).Distinct().ToArray()))
                .ToArray();
            Dictionary<int, ForeverAppearanceName>? names = null;
            try
            {
                names = await _warcraftCachedData.GetForeverAppearanceNames(groups.SelectMany(g => g.ids).ToArray(), region);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Forever appearance catalog unavailable in {Region}; appearances are sent unnamed.", region);
            }
            bool Shown(int id)
            {
                if (names == null)
                {
                    return true;
                }
                var name = names.GetValueOrDefault(id)?.name;
                return !string.IsNullOrEmpty(name) && !name.StartsWith("Hidden ", StringComparison.OrdinalIgnoreCase);
            }
            return groups.Select(group => (group.type, group.name, ids: group.ids.Where(Shown).ToArray())).Select(group => new ForeverAppearanceSlot
            {
                type = group.type,
                name = group.name,
                count = group.ids.Length,
                appearances = group.ids.Select(id => new ForeverAppearance
                {
                    id = id,
                    name = names?.GetValueOrDefault(id)?.name,
                    quality = names?.GetValueOrDefault(id)?.quality,
                }).ToArray(),
            }).ToArray();
        }

        public const int MaxCollectionIconBatch = 50;

        //Pictures for a page of collected mounts, pets or toys. Each kind finds its picture differently
        //(a mount's creature render, a pet's own icon, a toy's item icon), so the kind is part of the request.
        [HttpGet("GetCollectionIcons")]
        public async Task<ActionResult<ForeverCollectionIcon[]>> GetCollectionIcons(string region, string kind, [FromQuery] int[] ids)
        {
            region = region.ToLowerInvariant();
            if (region != "us" && region != "eu") return BadRequest("region must be us or eu");
            Func<int, string, Task<string?>>? lookup = kind switch
            {
                "mount" => _warcraftCachedData.GetForeverMountImage,
                "pet" => _warcraftCachedData.GetForeverPetIcon,
                "toy" => _warcraftCachedData.GetForeverToyIcon,
                "appearance" => (_, _) => Task.FromResult<string?>(null),
                _ => null,
            };
            if (lookup == null) return BadRequest("kind must be mount, pet, toy or appearance");
            if (ids.Length == 0 || ids.Length > MaxCollectionIconBatch || ids.Any(id => id <= 0))
                return BadRequest($"Provide between 1 and {MaxCollectionIconBatch} positive IDs.");
            try
            {
                if (kind == "appearance")
                {
                    //one catalog read for the whole batch gives most appearances their item's icon media
                    var names = await _warcraftCachedData.GetForeverAppearanceNames(ids, region);
                    lookup = (id, r) => _warcraftCachedData.GetForeverAppearanceIcon(id, names.GetValueOrDefault(id)?.mediaId, r);
                }
                var rows = await Task.WhenAll(ids.Distinct().Select(async id => new ForeverCollectionIcon { id = id, icon = await lookup(id, region) }));
                CacheStaticRows(rows.All(row => row.icon != null));
                return Ok(rows);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while getting Forever {Kind} icons in {Region}.", kind, region);
                return StatusCode(500);
            }
        }

        //Legacy Points the character's account has earned, out of every point Forever's achievements
        //award. Blizzard has no Legacy Point endpoint, so this counts completed achievements whose
        //reward is Legacy Points. Points spent, or earned some other way, aren't in the API.
        [HttpGet("GetLegacyPoints")]
        [ProducesResponseType(typeof(ForeverLegacyPoints), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ForeverLegacyPoints>> GetLegacyPoints(string region, string characterSlug)
        {
            region = region.ToLowerInvariant();
            if (region != "us" && region != "eu") return BadRequest("region must be us or eu");
            characterSlug = characterSlug.ToLowerInvariant();
            if (characterSlug.Length > 64 || !IsCharacterSlug(characterSlug)) return BadRequest("characterSlug must be name-surname");
            try
            {
                var achievementsTask = _warcraftCachedData.GetForeverAchievements(characterSlug, region);
                var rewardsTask = _warcraftCachedData.GetForeverLegacyRewards(region);
                await Task.WhenAll(achievementsTask, rewardsTask);
                var achievements = achievementsTask.Result;
                if (achievements == null) return NotFound(new ProblemDetails
                {
                    Status = StatusCodes.Status404NotFound,
                    Title = "Achievement data is not available for this character."
                });
                var rewards = rewardsTask.Result;
                if (rewards == null) throw new HttpRequestException("Forever achievement definitions could not all be read.");
                //the same test the achievements tab uses for "completed"
                var completed = (achievements.Achievements ?? [])
                    .Where(a => a.Criteria?.IsCompleted == true || a.CompletedTimestamp > 0)
                    .Select(a => a.Id > 0 ? a.Id : a.Achievement?.Id ?? 0)
                    .ToHashSet();
                CacheCharacterData();
                return Ok(new ForeverLegacyPoints
                {
                    earned = completed.Sum(id => rewards.GetValueOrDefault(id)),
                    total = rewards.Values.Sum(),
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while getting Forever Legacy Points for {Slug} in {Region}.", characterSlug, region);
                return StatusCode(500);
            }
        }

        //Static definitions and icons for a character's whole achievement list. Forever characters report a few
        //dozen, so one request covers them. Cached lookups answer at once; Blizzard calls on a cold cache are
        //throttled process-wide in the proxy, not per request.
        public const int MaxAchievementBatch = 50;

        [HttpGet("GetAchievementDetails")]
        public async Task<ActionResult<ForeverAchievementDetails[]>> GetAchievementDetails(string region, [FromQuery] int[] achievementIds)
        {
            region = region.ToLowerInvariant();
            if (region != "us" && region != "eu") return BadRequest("region must be us or eu");
            if (achievementIds.Length == 0 || achievementIds.Length > MaxAchievementBatch || achievementIds.Any(id => id <= 0))
                return BadRequest($"Provide between 1 and {MaxAchievementBatch} positive achievement IDs.");
            try
            {
                var rows = await Task.WhenAll(achievementIds.Distinct().Select(async id =>
                {
                    var achievement = _warcraftCachedData.GetForeverAchievement(id, region);
                    var icon = _warcraftCachedData.GetForeverAchievementIcon(id, region);
                    return new ForeverAchievementDetails { id = id, achievement = await achievement, icon = await icon };
                }));
                CacheStaticRows(rows.All(row => row.achievement != null && row.icon != null));
                return Ok(rows);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while getting Forever achievement details in {Region}.", region);
                return StatusCode(500);
            }
        }

        //Only the visible page is enriched, ten recipes at a time.
        [HttpGet("GetRecipes")]
        public async Task<ActionResult<ForeverRecipeDetails[]>> GetRecipes(string region, [FromQuery] int[] recipeIds)
        {
            region = region.ToLowerInvariant();
            if (region != "us" && region != "eu")
            {
                return BadRequest("region must be us or eu");
            }
            if (recipeIds.Length == 0 || recipeIds.Length > 10 || recipeIds.Any(id => id <= 0))
            {
                return BadRequest("Provide between 1 and 10 positive recipe IDs.");
            }
            try
            {
                var results = await Task.WhenAll(recipeIds.Distinct().Select(async id =>
                {
                    var recipe = _warcraftCachedData.GetForeverRecipe(id, region);
                    var icon = _warcraftCachedData.GetForeverRecipeIcon(id, region);
                    return new ForeverRecipeDetails { id = id, recipe = await recipe, icon = await icon };
                }));
                CacheStaticRows(results.All(row => row.recipe != null && row.icon != null));
                return Ok(results);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while getting Forever recipes in {Region}.", region);
                return StatusCode(500);
            }
        }

        //Every recipe in one of a character's skill tiers, for the professions tab's "not learned" list:
        //the page takes away the ones the character knows. 404 when Blizzard has no such tier.
        [HttpGet("GetSkillTierRecipes")]
        [ProducesResponseType(typeof(ForeverSkillTierRecipe[]), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ForeverSkillTierRecipe[]>> GetSkillTierRecipes(string region, int professionId, int skillTierId)
        {
            region = region.ToLowerInvariant();
            if (region != "us" && region != "eu")
            {
                return BadRequest("region must be us or eu");
            }
            if (professionId <= 0 || skillTierId <= 0)
            {
                return BadRequest("professionId and skillTierId must be positive");
            }
            try
            {
                var recipes = await _warcraftCachedData.GetForeverSkillTierRecipes(professionId, skillTierId, region);
                if (recipes == null)
                {
                    return NotFound(new ProblemDetails { Status = StatusCodes.Status404NotFound, Title = "Blizzard has no recipe list for this skill tier." });
                }
                CacheStaticRows(true);
                return Ok(recipes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while getting Forever skill tier {Profession}/{Tier} recipes in {Region}.", professionId, skillTierId, region);
                return StatusCode(500);
            }
        }

        //Static game data changes with patches, not with play, so a complete answer can sit in the browser and
        //any shared cache for a day. A batch missing a definition or icon is left uncached, since a transient failure
        //looks the same as a missing row, and "Retry details" has to reach the server.
        private void CacheStaticRows(bool complete)
        {
            if (complete)
            {
                Response.Headers.CacheControl = "public, max-age=86400";
            }
        }

        //A character's tabs are cached for two hours on the server; a few minutes in the browser makes a reload or
        //a second tab instant without showing anything older than the server would.
        private void CacheCharacterData()
        {
            Response.Headers.CacheControl = "private, max-age=300";
        }

        //Letters typed with alt codes that have no accent to strip, so RemoveDiacritics leaves
        //them alone, mapped to the plain letters people type instead: "Ðreamx" is found by "dreamx".
        private static readonly Dictionary<char, string> PlainLetters = new()
        {
            ['ð'] = "d", ['đ'] = "d", ['ø'] = "o", ['ł'] = "l", ['ı'] = "i",
            ['æ'] = "ae", ['œ'] = "oe", ['þ'] = "th", ['ß'] = "b",
        };

        //a name reduced to plain lowercase letters: accents stripped, alt-code letters mapped,
        //and any spaces or hyphens between name and surname made a single hyphen
        private static string FoldName(string text)
        {
            var folded = SearchController.RemoveDiacritics(text.Trim().ToLowerInvariant());
            var builder = new StringBuilder(folded.Length);
            foreach (var c in folded)
            {
                if (char.IsWhiteSpace(c) || c == '-')
                {
                    //only the first of a run of separators is kept; the text was trimmed, so a
                    //separator never comes first
                    if (builder.Length > 0 && builder[^1] != '-')
                    {
                        builder.Append('-');
                    }
                }
                else if (PlainLetters.TryGetValue(c, out var plain))
                {
                    builder.Append(plain);
                }
                else
                {
                    builder.Append(c);
                }
            }
            return builder.ToString();
        }

        //Suggestions for the Forever search box: up to 10 characters already looked up whose
        //"name surname" starts with what was typed. Matches the realm search in SearchController,
        //with a space or hyphen between name and surname, and ignores accents and alt-code letters
        //on both sides, so "lucid dreamx" and "Lucid Ðreamx" find the same character.
        [HttpGet("Search")]
        public async Task<ActionResult<ForeverCharacterProfile[]>> Search(string search)
        {
            try
            {
                var typed = FoldName(search);
                if (typed == "")
                {
                    return Ok(Array.Empty<ForeverCharacterProfile>());
                }
                var allCharacters = await _warcraftCachedData.ForeverCachedCharacters();
                var matches = allCharacters
                    .Where(entry => FoldName(entry).StartsWith(typed, StringComparison.Ordinal))
                    .Take(10)
                    .Select(async entry =>
                    {
                        var parts = entry.Split(',');
                        return await _warcraftCachedData.GetForeverCharacter(parts[0], parts[1]);
                    });
                var found = await Task.WhenAll(matches);
                var result = found.Where(p => p != null).Select(p => p!).DistinctBy(p => p.Links?.Self?.Href).ToArray();
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while searching Forever characters for {Search}.", search);
                return StatusCode(500);
            }
        }
    }

    public class ForeverAchievementDetails
    {
        public int id { get; init; }
        public ForeverAchievement? achievement { get; init; }
        public string? icon { get; init; }
    }

    public class ForeverRecipeDetails
    {
        public int id { get; init; }
        //Keep the known recipe visible even when Blizzard has no static details or icon.
        public Recipe? recipe { get; init; }
        public string? icon { get; init; }
    }

    public class ForeverCollectionsPage
    {
        //each list is sorted by name and empty, never null, when the character has none
        public ForeverCollectedMount[] mounts { get; init; } = [];
        public ForeverCollectedPet[] pets { get; init; } = [];
        public ForeverCollectedToy[] toys { get; init; } = [];
        public int? unlockedBattlePetSlots { get; init; }
        public ForeverAppearanceSlot[] appearanceSlots { get; init; } = [];
        //null when Forever's game data couldn't be read; the page shows counts without totals then
        public ForeverCollectionTotals? totals { get; init; }
    }

    public class ForeverAppearanceSlot
    {
        public string type { get; init; } = "";
        public string name { get; init; } = "";
        public int count { get; init; }
        public ForeverAppearance[] appearances { get; init; } = [];
    }

    public class ForeverAppearance
    {
        public int id { get; init; }
        //null for an appearance with no item in Blizzard's API, or when the catalog couldn't be read
        public string? name { get; init; }
        //e.g. "EPIC"
        public string? quality { get; init; }
    }

    public class ForeverCollectionIcon
    {
        public int id { get; init; }
        //null when Blizzard has no picture for it, or the lookup failed and will be tried again
        public string? icon { get; init; }
    }

    public class ForeverLegacyPoints
    {
        public int earned { get; init; }
        //every Legacy Point Forever's achievements award
        public int total { get; init; }
    }

    public partial class ForeverCharacterController
    {
        //The talents tab: the character's class's three trees as the game lays them out, and the
        //points in each of the character's talent groups (two with dual spec). 404 when Blizzard
        //has no profile for the character, since the class comes from it.
        [HttpGet("GetTalents")]
        public async Task<ActionResult<ForeverTalentsPage>> GetTalents(string region, string characterSlug)
        {
            region = region.ToLowerInvariant();
            if (region != "us" && region != "eu")
            {
                return BadRequest("region must be us or eu");
            }
            characterSlug = characterSlug.ToLowerInvariant();
            if (characterSlug.Length > 64 || !IsCharacterSlug(characterSlug))
            {
                return BadRequest("characterSlug must be name-surname");
            }
            try
            {
                //the character's talents don't need the class, so they load alongside the profile
                var specializationsTask = _warcraftCachedData.GetForeverSpecializations(characterSlug, region);
                var profile = await _warcraftCachedData.GetForeverCharacter(characterSlug, region);
                if (profile?.CharacterClass == null)
                {
                    await specializationsTask;
                    return NotFound();
                }
                var talentsTask = _warcraftCachedData.GetForeverClassTalents(profile.CharacterClass.Id, region);
                await Task.WhenAll(talentsTask, specializationsTask);

                var page = new ForeverTalentsPage();
                if (talentsTask.Result != null)
                {
                    page.Trees = talentsTask.Result.Trees;
                }
                foreach (var group in specializationsTask.Result?.SpecializationGroups ?? [])
                {
                    var ranks = new Dictionary<int, int>();
                    foreach (var tree in group.Specializations ?? [])
                    {
                        foreach (var talent in tree.Talents ?? [])
                        {
                            if (talent.Talent != null)
                            {
                                ranks[talent.Talent.Id] = talent.TalentRank;
                            }
                        }
                    }
                    page.Groups.Add(new ForeverTalentGroup { IsActive = group.IsActive, Ranks = ranks });
                }
                return Ok(page);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while getting Forever talents for {Slug} in {Region}.", characterSlug, region);
                return StatusCode(500);
            }
        }
    }

    public class ForeverCharacterPage
    {
        //null when Blizzard's API has no profile for the character; rosterCharacter is set then
        public ForeverCharacterProfile? profile { get; set; }
        //what the stats crawl last saw of the character in a guild roster, sent only when the
        //profile is missing
        public ForeverStatsCharacter? rosterCharacter { get; set; }
        //null when Blizzard returned nothing; the page shows the profile without gear
        public CharacterEquipmentSummary? equipment { get; set; }
        //null while Blizzard's render of a new character is still missing
        public CharacterMediaSummary? media { get; set; }
    }
}
