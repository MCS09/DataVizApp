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
var cosmosConnectionString = builder.Configuration.GetConnectionString("CosmosDb");
var cosmosDatabaseName = builder.Configuration["CosmosDb:DatabaseName"];

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

builder.Services.AddDbContext<CosmosDbContext>(options =>
{
    options.UseCosmos(
        cosmosConnectionString,
        cosmosDatabaseName);
});

builder.Services.AddScoped<DatasetService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("DevelopmentCorsPolicy", builder =>
    {
        builder.WithOrigins("http://localhost:3000")
               .AllowAnyMethod()
               .AllowAnyHeader();
    });
});

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
