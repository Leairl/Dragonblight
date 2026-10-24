using System.Threading.Tasks;
using AspNetCore.Proxy;
using AspNetCore.Proxy.Options;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace CORSProxy
{
    [ApiExplorerSettings(IgnoreApi = true)]
    public class ProxyController : Controller
    {
        private readonly IConfiguration Configuration;
        private readonly HttpProxyOptions proxyOptions;
        private readonly ILogger<ProxyController> _logger;

        public ProxyController(IConfiguration configuration, IHttpProxyOptionsBuilder proxyOptions, ILogger<ProxyController> logger)
        {
            Configuration = configuration;
            this.proxyOptions = proxyOptions.Build();
            _logger = logger;
        }

        [Route("data/modelviewer/mists/background-classic-181818.png")]
        [Route("data/modelviewer/live/background-classic-181818.png")]
        public FileContentResult image()
        {
            try
            {
                return File(System.IO.File.ReadAllBytes("background.png"), "image/png", System.IO.Path.GetFileName("background.png")); 
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while processing the image request.");
                throw new Exception("An error occurred while processing the data forwarding request.");
            }
        }

        //data forwarding to wowhead
        [Route("data/{*args}")]
        public Task Index()
        {
            try
            {
                return this.ProxyAsync("https://wow.zamimg.com/" + Request.Path.Value?.Replace("/data", "", StringComparison.InvariantCultureIgnoreCase) + Request.QueryString, null, httpProxyOptions: proxyOptions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while processing the data forwarding request.");
                throw new Exception("An error occurred while processing the data forwarding request.");
            }
        }
    }
}