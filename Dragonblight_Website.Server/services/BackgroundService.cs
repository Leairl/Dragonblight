using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

public class BgService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private ILogger<BgService> _logger;

    public BgService(IServiceProvider serviceProvider, ILogger<BgService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    //A sync can run past the interval, and two at once would clear each other's ladders and send up to
    //double the requests on a key. This waits for each pass to finish, and a tick that passed during one
    //starts the next straight away.
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        //the first pass takes hours, so it can't hold up the server starting
        await Task.Yield();
        using var timer = new PeriodicTimer(TimeSpan.FromHours(2));
        do
        {
            await DoWork();
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task DoWork()
    {
        try 
        {
            using var scope = _serviceProvider.CreateScope();
            var services = scope.ServiceProvider;
            var charService = services.GetRequiredService<CharacterCacheService>();
            await charService.CacheAllLadders("us", GameFlavor.MistsClassic);
            await charService.CacheAllLadders("eu", GameFlavor.MistsClassic);
            await charService.CacheAllLadders("us", GameFlavor.Retail);
            // await charService.CacheAllLadders("eu", GameFlavor.Retail);
        } 
        catch (Exception ex) 
        {
            _logger.LogError(ex, "Error in BgService");
        }
    }
}