using DataVizApp.Models;
using DotNetEnv;
using Microsoft.EntityFrameworkCore;
var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Load .env file
Env.Load();

string connStr = builder.Configuration.GetValue<string>("CONNECTIONSTRINGS__DEFAULTCONNECTION") ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found in configuration.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connStr)
);

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseRouting(); // 🔹 This is required before app.UseAuthorization and app.MapControllers

app.UseAuthorization();

app.MapControllers(); // 🔹 This should come after UseRouting + UseAuthorization

app.Run();