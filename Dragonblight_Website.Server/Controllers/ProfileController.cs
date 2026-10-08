using System.Globalization;
using System.Text;
using System.Text.Json.Serialization;
using ArgentPonyWarcraftClient;
using Microsoft.AspNetCore.Mvc;
using StackExchange.Redis;

namespace Dragonblight_Website.Server.Controllers
{
    //uses "api/ to seperate our backend controllers from our frontend
    [ApiController]
    [Route("api/[controller]")]
    public class ProfileController : ControllerBase
    {
        private readonly ILogger<ProfileController> _logger;
        private readonly IWarcraftRedisProxy _warcraftCachedData; //underscore is syntax to global variable

        public ProfileController(ILogger<ProfileController> logger, IWarcraftRedisProxy warcraftCachedData)
        {
            _logger = logger;
            _warcraftCachedData = warcraftCachedData; //dependency injection to IWarcraftRedisProxy cs file
        }
        //runs after the response has been sent, so the flavor is passed in rather than read
        //from HttpContext, which may already belong to a different request by then
        private async Task UpdateBracketSummary(string bracket, string region, string characterName, string server, CharacterProfileSummary result, string specName, GameFlavor flavor)
        {
            var ladder = await _warcraftCachedData.GetPvpLeaderSummaries(bracket, region, flavor);
            var playerSummary = ladder.FirstOrDefault(x => x?.charSummary.Name.ToLower() == characterName.ToLower() 
                                                    && x.charSummary.Realm.Slug.ToLower() == server.ToLower());
            if (playerSummary != null && playerSummary.PvpEntry != null) 
            {
                await _warcraftCachedData.SavePvpCharacterSummary(new PvpCharacterSummary
                {
                    charSummary = result,
                    spec = specName,
                    PvpEntry = playerSummary.PvpEntry
                }, bracket, region, flavor);
            }
        }
        /* 
        Allows a user to load up character profiles from blizzard API.
        */
        [HttpGet("GetProfile")]
        //Iactionresult used when you have action results incoming (200/401/404)
        public async Task<ActionResult<CharacterProfileSummaryAndSpec>> GetProfile(string server, string characterName, string region)
        {
            try
            {
                var result = await _warcraftCachedData.GetCharSummary(server.ToLower(), characterName.ToLower(), region, HttpContext.GetGameFlavor());
                var specName = await _warcraftCachedData.GetCharacterSpecName(server.ToLower(), characterName.ToLower(), region, HttpContext.GetGameFlavor());
                // spin off a background thread to update each bracket's char summary and spec name
                var flavor = HttpContext.GetGameFlavor();
                _ = Task.Run(async () => {
                    foreach (var bracket in flavor.Brackets())
                    {
                        await UpdateBracketSummary(bracket, region, characterName, server, result, specName, flavor);
                    }
                });
                return Ok(new CharacterProfileSummaryAndSpec
                {
                    // 2 properties pulled from class below (rbgEntry is pulling all leaderboad data & ProfileSummaryEntry is pulling CharacterSummary data)
                    charSummary = result,
                    spec = specName
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while getting character profile.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetAppearance")]
        public async Task<ActionResult<CharacterAppearanceSummary>> GetAppearance(string server, string characterName, string region)
        {
            try
            {
                var result = await _warcraftCachedData.GetCharAppearance(server.ToLower(), characterName.ToLower(), region, HttpContext.GetGameFlavor());
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while getting character appearance.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("GetEquipment")]
        public async Task<ActionResult<CharacterEquipmentSummary>> GetEquipment(string server, string characterName, string region)
        {
            try
            {
                var result = await _warcraftCachedData.GetCharEquipment(server.ToLower(), characterName.ToLower(), region, HttpContext.GetGameFlavor());
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while getting character equipment.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        //The profile page's refresh button: drops the character's cached data so the page reloads it
        //from Blizzard. 429 while the character was refreshed in the last few minutes.
        [HttpPost("RefreshCharacter")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<ActionResult> RefreshCharacter(string server, string characterName, string region)
        {
            try
            {
                var cleared = await _warcraftCachedData.ClearCharacterCache(server.ToLower(), characterName.ToLower(), region, HttpContext.GetGameFlavor());
                if (!cleared)
                {
                    return StatusCode(429, "This character was refreshed recently. Try again in a few minutes.");
                }
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while refreshing a character.");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }
        public class CharacterProfileSummaryAndSpec
        {
            [JsonPropertyName("charSummary")]
            public required CharacterProfileSummary charSummary { get; init; }
            
            [JsonPropertyName("spec")]
            public required string spec { get; init; }
        }
    }
}
