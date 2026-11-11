using Microsoft.AspNetCore.Mvc;

namespace Dragonblight_Website.Server.Controllers
{
    public partial class ForeverCharacterController
    {
        //The Optimize tab: the best enchant for each enchantable item the character wears, and the best
        //elixirs, flasks and potions for their level, ranked by their spec's stat weights. 404 when
        //Blizzard has no profile for the character, since the class and level come from it.
        [HttpGet("GetOptimization")]
        [ProducesResponseType(typeof(ForeverOptimizePage), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        //showAll: include what a crafter of the character's level couldn't make yet (not later phases)
        public async Task<ActionResult<ForeverOptimizePage>> GetOptimization(string region, string characterSlug, bool showAll = false)
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
                var specTask = _warcraftCachedData.GetForeverSpecName(characterSlug, region);
                var catalogTask = _warcraftCachedData.GetForeverOptimizerCatalog(region);
                await Task.WhenAll(profileTask, equipmentTask, specTask, catalogTask);

                var profile = profileTask.Result;
                if (profile?.CharacterClass == null)
                {
                    return NotFound(new ProblemDetails { Status = StatusCodes.Status404NotFound, Title = "Blizzard has no profile for this character." });
                }
                if (catalogTask.Result == null)
                {
                    return StatusCode(500);
                }
                var page = ForeverOptimizerPlanner.Build(profile.Level, profile.CharacterClass.Name ?? "", specTask.Result ?? "",
                    equipmentTask.Result, catalogTask.Result, ForeverStatWeights.Current, ForeverRecipes.data, showAll);
                return Ok(page);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while getting Forever optimization for {Slug} in {Region}.", characterSlug, region);
                return StatusCode(500);
            }
        }
    }
}
