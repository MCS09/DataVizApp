using Microsoft.Azure.Cosmos;
using DataVizApp.Data;
using DotNetEnv;
using Microsoft.EntityFrameworkCore;
using DataVizApp.Services;
using Azure.AI.Projects;
using Azure.Identity;
using DataVizApp.Models;

// Load .env file
Env.Load();

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


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

builder.Services.AddScoped<DatasetService>();

// Read Cosmos DB configuration
string? cosmosAccountEndpoint = builder.Configuration["CosmosDb:AccountEndpoint"];
string? cosmosAccountKey = builder.Configuration["CosmosDb:AccountKey"];
string? cosmosDatabaseName = builder.Configuration["CosmosDb:DatabaseName"];

// Development-only settings
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("DevelopmentCorsPolicy", builder =>
        {
            builder.WithOrigins("http://localhost:3000")
                .AllowAnyMethod()
                .AllowAnyHeader();
        });
    });
}

// Register CosmosDbContext if all config values are present
if (!string.IsNullOrEmpty(cosmosAccountEndpoint) &&
    !string.IsNullOrEmpty(cosmosAccountKey) &&
    !string.IsNullOrEmpty(cosmosDatabaseName))
{
    builder.Services.AddDbContext<CosmosDbContext>(options =>
    {
        options.UseCosmos(
            cosmosAccountEndpoint,
            cosmosAccountKey,
            cosmosDatabaseName);
    });
}
else
{
    throw new Exception("⚠️ Cosmos DB configuration is missing – skipping CosmosDbContext registration.");
}


var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();

    // Enable CORS in development only
    app.UseCors("DevelopmentCorsPolicy");
}

app.UseHttpsRedirection();

app.UseRouting();

app.UseAuthorization();

app.MapControllers();

app.Run();
