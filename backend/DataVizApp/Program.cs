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

static string EnvVarLoader(string envVar)
{
    string var = Environment.GetEnvironmentVariable(envVar) ?? throw new (envVar + " not loaded");
    return var;
}


string connectionString = EnvVarLoader("SQLAzure_DefaultConnection");
string cosmos_endpoint = EnvVarLoader("CosmosDb_AccountEndpoint");
string cosmos_key = EnvVarLoader("CosmosDb_AccountKey");
string cosmos_dbname = EnvVarLoader("CosmosDb_DatabaseName");
string ai_endpoint = EnvVarLoader("AzureAIAgents_Endpoint");
string cleaning_agent = EnvVarLoader("AzureAIAgents_Agent_Cleaning");
string dataset_agent = EnvVarLoader("AzureAIAgents_Agent_Dataset");
string visualization_agent = EnvVarLoader("AzureAIAgents_Agent_Visualization");

// Configure Entity Framework Core with SQL Server
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString)
);

// Also register AIProjectClient using the bound config
builder.Services.AddSingleton(sp =>
{
    return new AIProjectClient(new Uri(ai_endpoint), new DefaultAzureCredential());
});

builder.Services.Configure<AzureAIAgentsOptions>(options =>
{
    options.Endpoint = ai_endpoint;
    options.Agents = new AzureAIAgentsOptions.AgentsConfig
    {
        Cleaning = cleaning_agent,
        Dataset = dataset_agent,
        Visualization = visualization_agent
    };
});

builder.Services.AddSingleton<AgentService>();

// Configure Azure Cosmos DB
builder.Services.AddDbContext<CosmosDbContext>(options =>
{
    options.UseCosmos(
        cosmos_endpoint,
        cosmos_key,
        cosmos_dbname);
});

builder.Services.AddScoped<DatasetService>();

// if (builder.Environment.IsDevelopment())
// {
//     builder.Services.AddCors(options =>
//     {
//         options.AddPolicy("DevelopmentCorsPolicy", builder =>
//         {
//             builder.WithOrigins("http://localhost:3000")
//                    .AllowAnyMethod()
//                    .AllowAnyHeader();
//         });
//     });
// }

if (true) // Force dev environment
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

var app = builder.Build();

// Configure the HTTP request pipeline
// if (app.Environment.IsDevelopment())
// {
//     app.UseSwagger();
//     app.UseSwaggerUI();

//     // Enable CORS in development only
//     app.UseCors("DevelopmentCorsPolicy");
// }


app.UseHttpsRedirection();

app.UseRouting();

if (true) // Force dev environment
{
    app.UseSwagger();
    app.UseSwaggerUI();

    // Enable CORS in development only
    app.UseCors("DevelopmentCorsPolicy");
}

app.UseAuthorization();

app.MapControllers();

app.Run();
