using Microsoft.AspNetCore.Mvc;
using DataVizApp.Models;
using DataVizApp.Services;
using DataVizApp.Models.DTO;

namespace DataVizApp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DatasetController(DatasetService datasetService) : ControllerBase
    {
        private readonly DatasetService _datasetService = datasetService;

        [HttpGet("dataset/{datasetId}")]
        public async Task<ActionResult<Dataset>> GetDataset(int datasetId)
        {
            var dataset = await _datasetService.GetDatasetByIdAsync(datasetId);
            if (dataset == null) return NotFound();
            return Ok(dataset);
        }
        

        [HttpGet("userDatasets/{userId}")]
        public async Task<ActionResult<List<Dataset>>> GetDatasetsByUserId(string userId)
        {
            var dataset = await _datasetService.GetDatasetByUserIdAsync(userId);
            if (dataset == null) return NotFound();
            return Ok(dataset);
        }

        [HttpPost]
        public async Task<ActionResult<Dataset>> CreateDataset(DatasetDto datasetDto)
        {
            Dataset newDataset = new()
            {
                UserId = datasetDto.UserId
            };

            await _datasetService.CreateDatasetAsync(newDataset);
            return CreatedAtAction(nameof(GetDataset), new { datasetId = newDataset.DatasetId }, newDataset);
        }

        public record RecordsRequest(int DatasetId, List<DatasetRecord> NewRecords);

        [HttpPost("addRecords")]
        public async Task<IActionResult> AddRecords([FromBody] RecordsRequest request)
        {
            Dataset? dataset = await _datasetService.GetDatasetByIdAsync(request.DatasetId);
            if (dataset == null) return NotFound("Dataset not found.");

            // Get columns
            bool success = await _datasetService.AddRecordsAsync(request.NewRecords);
            if (!success) return BadRequest("Failed to update dataset with new records.");
            return NoContent();
        }
        [HttpPost("setRecords")]
        public async Task<IActionResult> SetRecords(RecordsRequest request)
        {
            Dataset? dataset = await _datasetService.GetDatasetByIdAsync(request.DatasetId);
            if (dataset == null) return NotFound("Dataset not found.");
            bool success = await _datasetService.SetRecordsAsync(request.DatasetId, request.NewRecords);
            if (!success) return BadRequest("Failed to update dataset with new records.");
            return NoContent();
        }

        public record DatasetColumnsRequest(int DatasetId, List<DatasetColumn> NewColumns);
        [HttpPost("setColumns")]
        public async Task<IActionResult> SetColumns([FromBody] DatasetColumnsRequest request)
        {
            Dataset? dataset = await _datasetService.GetDatasetByIdAsync(request.DatasetId);
            if (dataset == null) return NotFound("Dataset not found.");

            bool success = await _datasetService.SetColumnsAsync(request.DatasetId, request.NewColumns);
            if (!success) return BadRequest("Failed to update dataset with new columns.");
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDataset(int id)
        {
            bool success = await _datasetService.DeleteDatasetAsync(id);
            if (!success) return NotFound();
            return NoContent();
        }
    }
}