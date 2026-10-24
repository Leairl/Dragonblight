using StackExchange.Redis;
using ArgentPonyWarcraftClient.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection;
using AspNetCore.Proxy;
using AspNetCore.Proxy.Options;
using Serilog;
var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("appsettings.json", optional: false, reloadOnChange: true);
builder.Configuration.AddJsonFile("appsettings.development", optional: true, reloadOnChange: true);
//the two lines above are added after the defaults, so they outrank them - environment variables and
//command line arguments have to be re-added here to win again, which is what lets a launch profile
//point the app at a redis running somewhere else (localhost rather than the container name)
builder.Configuration.AddEnvironmentVariables();
builder.Configuration.AddCommandLine(args);

// Add services to the container.
var configuration = builder.Configuration;
var redisConnectionString = configuration.GetSection("Redis")["ConnectionString"] ?? "localhost:6379";
var battlenetClient = configuration.GetSection("BattlenetApi")["clientId"];
var battlenetSecret = configuration.GetSection("BattlenetApi")["clientSecret"];

builder.Services.AddSerilog((services, lc) => lc
    .ReadFrom.Configuration(configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext()
);

builder.Services.AddProxies();
builder.Services.AddControllers();
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient("BlizzardForums", client => { client.Timeout = TimeSpan.FromSeconds(20); client.DefaultRequestHeaders.UserAgent.ParseAdd("Dragonblight/1.0"); });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddWarcraftClients(battlenetClient, battlenetSecret);
builder.Services.AddScoped<IWarcraftRedisProxy, WarcraftRedisProxy>();
builder.Services.AddScoped<CharacterCacheService>();
if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") != "NSWAG")
{
    var redisOptions = ConfigurationOptions.Parse(redisConnectionString);
    redisOptions.AbortOnConnectFail = false;
    redisOptions.ConnectRetry = 10;
    redisOptions.ConnectTimeout = 5000;
    redisOptions.SyncTimeout = 5000;

    builder.Services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(redisOptions));
    builder.Services.AddHostedService<BgService>();
}

var options = HttpProxyOptionsBuilder.Instance
.WithShouldAddForwardedHeaders(false)
.WithHttpClientName("ProxyClient")
.WithIntercept(context =>
{
    if (context.Request.Method == "OPTIONS")
    {
        context.Response.StatusCode = 204;
        context.Response.Headers["Access-Control-Allow-Origin"] = "*";
        context.Response.Headers["Access-Control-Allow-Methods"] = "*";
        context.Response.Headers["Access-Control-Allow-Headers"] = "*";
        context.Response.Headers["Access-Control-Allow-Max-Age"] = "86400";


        return ValueTask.FromResult(true);
    }

    return ValueTask.FromResult(false);
}).WithAfterReceive((context, response) =>
{
    const string header = "Access-Control-Allow-Origin";
    
    if (response.Headers.Contains(header))
    {
        response.Headers.Remove(header);
    }
    
    response.Headers.Add(header, "*");

    return Task.CompletedTask;
});

builder.Services.AddSingleton(options);
builder.Services.AddSwaggerDocument(d =>
{
    d.Title = "Dragonblight API";
});
builder.Services.Configure<HostOptions>(hostOptions =>
{
    hostOptions.BackgroundServiceExceptionBehavior = BackgroundServiceExceptionBehavior.Ignore;
});
var app = builder.Build();
app.UseDefaultFiles();
app.UseStaticFiles();


// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.MapFallbackToFile("/index.html");
CSVLoader.LoadAll();
//calling character cache service to cache all character data into redis
app.Run();
