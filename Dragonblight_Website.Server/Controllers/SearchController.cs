using System.Globalization;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using ArgentPonyWarcraftClient;
using FuzzySharp;
using FuzzySharp.SimilarityRatio;
using FuzzySharp.SimilarityRatio.Scorer.StrategySensitive;
using Microsoft.AspNetCore.Mvc;

namespace Dragonblight_Website.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SearchController : ControllerBase
    {
        private readonly ILogger<SearchController> _logger;
        private readonly IWarcraftRedisProxy _warcraftCachedData; //underscore is syntax to global variable

        static string RemoveDiacritics(string text)
        {
            var normalizedString = text.Normalize(NormalizationForm.FormD);
            var stringBuilder = new StringBuilder(capacity: normalizedString.Length);

            for (int i = 0; i < normalizedString.Length; i++)
            {
                char c = normalizedString[i];
                var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(c);
                if (unicodeCategory != UnicodeCategory.NonSpacingMark)
                {
                    stringBuilder.Append(c);
                }
            }

            return stringBuilder
                .ToString()
                .Normalize(NormalizationForm.FormC);
        }
        public SearchController(ILogger<SearchController> logger, IWarcraftRedisProxy warcraftCachedData)
        {
            _logger = logger;
            _warcraftCachedData = warcraftCachedData; //dependency injection to IWarcraftRedisProxy cs file
        }
        /* 
        Allows a user to do a character search from the Home screen.
        Does CharacterSearch by searching all characters (server & character name) for containing search string
        */
        [HttpGet("SearchChar")]
        //Iactionresult used when you have action results incoming (200/401/404)
        public async Task<ActionResult<CharacterProfileSummary[]>> SearchChar(string search)
        {
            try
            {
                //CachedCharacters saves data in redis seperated by comma (used for our split data to seperate characterName, Region, and Server)
                //this will replace dash in our Search method with comma from redis data.
                search = search.Replace('-', ',');
                //return character name and character score with descending order of outscore, uses select for specific properties in a list.
                var allCharacters = await _warcraftCachedData.CachedCharacters(HttpContext.GetGameFlavor());
                //takes top 10 closest typed characters in search bar.
                // var SearchChars = Process.ExtractTop(search.ToLower(), allCharacters, s => s.ToLower(), ScorerCache.Get<PartialRatioScorer>(), limit: 10)
                //     .Where(s => s.Score >= 80)
                //     .OrderByDescending(s => s.Score);
                var SearchChars = allCharacters.Where(s => RemoveDiacritics(s).StartsWith(RemoveDiacritics(search), StringComparison.CurrentCultureIgnoreCase)).Take(10);
                var top10CharSummaries = SearchChars.Select(async player =>
                {
                    //when pulled out of redis, rearrange back into original key
                    //GetCharSummary is using InsertCacheCharacter (we split and rearrange this data after pulling from redis)
                    var playerSplit = player.Split(',');
                    return await _warcraftCachedData.GetCharSummary(playerSplit[1], playerSplit[0], RegionHelper.SimplifyRegion(playerSplit[2]), HttpContext.GetGameFlavor());
                });
                var result = await Task.WhenAll(top10CharSummaries);
                // makes sure the cached name doesn't appear twice
                result = result.Where(r => r != null).DistinctBy(r => r.Id).ToArray();
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while searching for characters.");
                return StatusCode(500, "An error occurred while processing your request.");
            }

        }
    }
}
