using Microsoft.Azure.Cosmos;
using DataVizApp.Data;
using DotNetEnv;
using Microsoft.EntityFrameworkCore;
using DataVizApp.Services;
using Azure.AI.Projects;
using Azure.Identity;
using DataVizApp.Models;
var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Load .env file
Env.Load();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

// Configure Entity Framework Core with SQL Server
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString)
);

// Bind AzureAIAgents section to AzureAIAgentsOptions
builder.Services.Configure<AzureAIAgentsOptions>(
    builder.Configuration.GetSection("AzureAIAgents")
);

// Also register AIProjectClient using the bound config
builder.Services.AddSingleton(sp =>
{
    var options = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<AzureAIAgentsOptions>>().Value;
    return new AIProjectClient(new Uri(options.Endpoint), new DefaultAzureCredential());
});

builder.Services.AddSingleton<AgentService>();

// Configure Azure Cosmos DB (SQL API)
string? cosmosAccountEndpoint = builder.Configuration["CosmosDb:AccountEndpoint"];
string? cosmosAccountKey = builder.Configuration["CosmosDb:AccountKey"];
string? cosmosDatabaseName = builder.Configuration["CosmosDb:DatabaseName"];

if (string.IsNullOrEmpty(cosmosAccountEndpoint) || string.IsNullOrEmpty(cosmosAccountKey) || string.IsNullOrEmpty(cosmosDatabaseName))
{
    throw new InvalidOperationException("Cosmos DB configuration is missing.");
}

builder.Services.AddDbContext<CosmosDbContext>(options =>
{
    options.UseCosmos(
        cosmosAccountEndpoint,
        cosmosAccountKey,
        cosmosDatabaseName);
});

builder.Services.AddScoped<DatasetService>();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseRouting();

app.UseAuthorization();

app.MapControllers();

app.Run();