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

            DatasetColumn[] columns = [.. datasetDto.Columns.Select((col) => new DatasetColumn
            {
                ColumnName = col.ColumnName,
                ColumnDescription = col.ColumnDescription,
                DataType = col.DataType,
                ColumnNumber = col.ColumnNumber,
                DatasetId = newDataset.DatasetId
            })];

            await _datasetService.CreateDatasetAsync(newDataset);
            await _datasetService.SetColumnsAsync(newDataset.DatasetId, [.. columns]);
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

        public record GetThreadIdRequest(int DatasetId, string WorkflowStageName);

        [HttpGet("getThreadId")]
        public async Task<IActionResult> GetThreadId([FromQuery] GetThreadIdRequest request)
        {
            List<string> workflowStageNames = await _datasetService.GetWorkflowStagesNames();
            string? match = workflowStageNames.FirstOrDefault(e => e == request.WorkflowStageName);
            if (match == null)
            { 
                return NotFound("Workflow stage name not found.");
            }

            // Get Thread
            WorkflowStage? workflowStage = await _datasetService.GetWorkflowStageByDatasetIdAsync(request.DatasetId, request.WorkflowStageName);
            if (workflowStage == null)
            {
                return NotFound("Workflow not setup for user.");
            }

            string? threadId = workflowStage.AzureAgentThreadId;

            if (string.IsNullOrEmpty(threadId))
            {
                return NotFound("Thread ID not found for the specified workflow stage.");
            }

            return Ok(new {threadId});
        }

        [HttpGet("getColumnsByDatasetId/{datasetId}")]
        public async Task<IActionResult> GetColumnsByDatasetId(int datasetId)
        {
            List<DatasetColumn> columns = await _datasetService.GetColumnByDatasetIdAsync(datasetId);
            if (columns == null || columns.Count == 0) return NotFound("No columns found for the specified dataset.");
            return Ok(columns);
        }
    }
}