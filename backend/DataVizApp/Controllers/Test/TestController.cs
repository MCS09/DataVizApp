using Microsoft.AspNetCore.Mvc;

namespace DataVizApp.Controllers.Test;

[ApiController]
[Route("api/[controller]")]
public class WeatherController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        var summaries = new[]
        {
            "Freezing", "Bracing", "Chilly", "Cool", "Mild",
            "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
        };

        var forecast = Enumerable.Range(1, 5).Select(index =>
            new
            {
                Date = DateTime.Now.AddDays(index),
                TemperatureC = Random.Shared.Next(-20, 55),
                Summary = summaries[Random.Shared.Next(summaries.Length)]
            }
        );

        WeatherData[] weatherData =
        [
            new WeatherData("2023-10-01", 20, "Sunny", 68),
            new WeatherData("2023-10-02", 22, "Cloudy", 72),
            new WeatherData("2023-10-03", 18, "Rainy", 64),
            new WeatherData("2023-10-04", 25, "Windy", 77),
            new WeatherData("2023-10-05", 30, "Stormy", 86)
        ];

        return Ok(weatherData);
    }
}

record WeatherData(string Date, int TemperatureC, string Summary, int TemperatureF)
{
    public string Date { get; set; } = Date;
    public int TemperatureC { get; set; } = TemperatureC;
    public string Summary { get; set; } = Summary;
    public int TemperatureF { get; set; } = TemperatureF;
}