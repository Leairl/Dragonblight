using System.Net.Http.Headers;
using System.Text.Json;
using ArgentPonyWarcraftClient;
using Microsoft.AspNetCore.Mvc;
using TwitchLib.Api;

namespace Dragonblight_Website.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TwitchController : ControllerBase
    {
        private readonly ILogger<TwitchController> _logger;
        private readonly IConfiguration _config;


        public TwitchController(ILogger<TwitchController> logger, IConfiguration config)
        {
            _logger = logger;
            _config = config;
        }

        private async Task<OAuthAccessToken> GetOAuthTokenAsync(string ClientId, string ClientSecret)
        {
            using HttpClient Client = new HttpClient();
            string credentials = $"{ClientId}:{ClientSecret}";
            string host = "https://id.twitch.tv";

            //use httpclient from ratelimitedhttpclient
            Client.DefaultRequestHeaders.Accept.Clear(); 
            Client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            var requestBody = new FormUrlEncodedContent(new[]
            {                    
                new KeyValuePair<string, string>("client_id", ClientId),
                new KeyValuePair<string, string>("client_secret", ClientSecret),
                new KeyValuePair<string, string>("grant_type", "client_credentials")
            });

            HttpResponseMessage responseMessage = await Client.PostAsync($"{host}/oauth2/token", requestBody);
            responseMessage.EnsureSuccessStatusCode();
            string response = await responseMessage.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<OAuthAccessToken>(response) ?? throw new Exception("Failed to get OAuth token from Twitch API.");
        }

        [HttpGet("GetWowTwitchStreams")]
        public async Task<ActionResult<IEnumerable<TwitchLib.Api.Helix.Models.Streams.GetStreams.Stream>>> GetWowTwitchStreams()
        {
            try
            {
                var clientId = _config["TwitchApi:clientId"];
                var clientSecret = _config["TwitchApi:clientSecret"];
                if (clientId == null || clientSecret == null)
                {
                    return BadRequest("Twitch API credentials not found.");
                }
                var api = new TwitchAPI();
                api.Settings.ClientId = clientId;
                api.Settings.AccessToken = (await GetOAuthTokenAsync(clientId, clientSecret))?.AccessToken;

                //Twitch has no WoW: Forever category; Forever streams are World of Warcraft streams that
                //name it in their title. Forever looks through the top 100 for those, and shows the usual
                //top streams when none do.
                if (HttpContext.GetGameFlavor() == GameFlavor.Forever)
                {
                    var top = await api.Helix.Streams.GetStreamsAsync(gameIds: new List<string> { "18122" }, first: 100);
                    var forever = top.Streams.Where(stream => (stream.Title ?? "").Contains("Forever", StringComparison.OrdinalIgnoreCase)).Take(10).ToArray();
                    if (forever.Length > 0)
                    {
                        return Ok(forever);
                    }
                    return Ok(top.Streams.Take(10));
                }
                var result = await api.Helix.Streams.GetStreamsAsync(gameIds: new List<string> { "18122" }, first: 10);
                return Ok(result.Streams);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching Twitch streams.");
                return StatusCode(500, "An error occurred while processing your request.");
            }

        }
    }
}