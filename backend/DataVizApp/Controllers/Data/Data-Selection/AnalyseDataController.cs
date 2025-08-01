using Microsoft.AspNetCore.Mvc;

namespace DataVizApp.Controllers.Data.DataSelection;

[ApiController]
[Route("api/[controller]")]
public class AnalyseDataController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        // This is a placeholder for the actual data analysis logic.
        // You can replace this with your data analysis implementation.
        var analysisResult = new
        {
            Message = "Data analysis completed successfully.",
            Timestamp = DateTime.Now
        }; 

        return Ok(analysisResult);
    }
}

public record AnalysisResult()
{
    public required string Message { get; set; }
    public DateTime Timestamp { get; set; }
};