using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

public class BgService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private Timer? _timer;
    private ILogger<BgService> _logger;

    public BgService(IServiceProvider serviceProvider, ILogger<BgService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _timer = new Timer(DoWork, null, TimeSpan.Zero, TimeSpan.FromHours(2));
        return Task.CompletedTask;
    }

    private async void DoWork(object? nullState)
    {
        try 
        {
            using var scope = _serviceProvider.CreateScope();
            var services = scope.ServiceProvider;
            var charService = services.GetRequiredService<CharacterCacheService>();
            // await charService.CacheAllLadders("us", GameFlavor.MistsClassic);
            // await charService.CacheAllLadders("eu", GameFlavor.MistsClassic);
            await charService.CacheAllLadders("us", GameFlavor.Retail);
            // await charService.CacheAllLadders("eu", GameFlavor.Retail);
        } 
        catch (Exception ex) 
        {
            _logger.LogError(ex, "Error in BgService");
        }
    }

    public override void Dispose()
    {
        _timer?.Dispose();
        base.Dispose();
    }
}