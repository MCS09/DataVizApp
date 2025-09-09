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
            var datasets = await _datasetService.GetDatasetByUserIdAsync(userId);
            if (datasets == null || datasets.Count == 0) return NotFound();
            return Ok(new { datasets });
        }

        [HttpPost]
        public async Task<ActionResult<Dataset>> CreateDataset(DatasetDto datasetDto)
        {
            Dataset newDataset = new()
            {
                UserId = datasetDto.UserId,
                DatasetName = datasetDto.DatasetName
            };

            DatasetColumnDto[] columns = [.. datasetDto.Columns.Select((col) => new DatasetColumnDto
            {
                ColumnName = col.ColumnName,
                ColumnDescription = col.ColumnDescription,
                DataType = col.DataType,
                ColumnNumber = col.ColumnNumber
            })];

            await _datasetService.CreateDatasetAsync(newDataset);
            await _datasetService.SetColumnsAsync(newDataset.DatasetId, [.. columns]);
            return CreatedAtAction(
                nameof(GetDataset),
                new { datasetId = newDataset.DatasetId }, // route values
                newDataset // response body
            );
        }

        public record ColumnDataDto(int DatasetId, int ColumnNumber, List<DataRecordDto> DataRecords);

        public record GetColumnDataRequest(int DatasetId, int ColumnNumber);

        [HttpPost("getColumnData")]
        public async Task<ActionResult<ColumnDataDto>> GetColumnData([FromBody] GetColumnDataRequest request)
        {
            Dataset? dataset = await _datasetService.GetDatasetByIdAsync(request.DatasetId);
            if (dataset == null) return NotFound("Dataset not found.");

            // Get columns
            List<DataRecord> records = await _datasetService.GetColumnDataByIdAsync(request.DatasetId, request.ColumnNumber);

            List<DataRecordDto> dtoRecords = [.. records.Select(r => new DataRecordDto(r.RecordNumber, r.Value))];

            ColumnDataDto result = new(request.DatasetId, request.ColumnNumber, dtoRecords);

            return Ok(result);
        }

        public record GetColumnDataByNameRequest(int DatasetId, string ColumnName);
        public record ColumnDataWithNameDto(int DatasetId, string ColumnName, int ColumnNumber, List<DataRecordDto> DataRecords);

        [HttpPost("getColumnDataByName")]
        public async Task<ActionResult<ColumnDataWithNameDto>> GetColumnDataByName([FromBody] GetColumnDataByNameRequest request)
        {
            Dataset? dataset = await _datasetService.GetDatasetByIdAsync(request.DatasetId);
            if (dataset == null) return NotFound("Dataset not found.");
            
            // Get columns
            (DatasetColumn column, List<DataRecord> records) = await _datasetService.GetColumnDataByNameAsync(request.DatasetId, request.ColumnName);

            List<DataRecordDto> dtoRecords = [.. records.Select(r => new DataRecordDto(r.RecordNumber, r.Value))];

            ColumnDataWithNameDto result = new(request.DatasetId, request.ColumnName, column.ColumnNumber, dtoRecords);

            return Ok(result);
        }



        public record ColumnProfileDto(
            int ColumnNumber,
            string ColumnName,
            List<ColumnProfileDataRecordDto> DataRecords
        );

        public record ColumnProfileDataRecordDto(
            int RecordNumber,
            string Value
        );

        [HttpGet("getSchema/{datasetId}")]
        public async Task<IActionResult> GetDatasetSchema(int datasetId)
        {
            List<DatasetColumn> columns = await _datasetService.GetColumnByDatasetIdAsync(datasetId);
            // Get first 5 rows of data for each column
            List<ColumnProfileDto> profiles = [];
            foreach (var column in columns)
            {
                List<DataRecord> samples = await _datasetService.GetColumnDataByIdAsync(datasetId, column.ColumnNumber, 5);
                profiles.Add(new ColumnProfileDto(
                    column.ColumnNumber,
                    column.ColumnName,
                    [.. samples.Select(r => new ColumnProfileDataRecordDto(r.RecordNumber, r.Value))]
                ));
            }

            return Ok(new { profiles });
        }
        
        [HttpPost("setColumnData")]
        public async Task<IActionResult> SetColumnData([FromBody] ColumnDataDto request)
        {
            Dataset? dataset = await _datasetService.GetDatasetByIdAsync(request.DatasetId);
            if (dataset == null) return NotFound("Dataset not found.");

            bool success = await _datasetService.SetColumnDataAsync(request.DatasetId, request.ColumnNumber, request.DataRecords);
            if (!success) return BadRequest("Failed to update dataset with new records.");
            return NoContent();
        }



        public record DatasetColumnsRequest(int DatasetId, List<DatasetColumnDto> NewColumns);
        
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
        public async Task<ActionResult<List<DatasetColumn>>> GetColumnsByDatasetId(int datasetId)
        {
            List<DatasetColumn> columns = await _datasetService.GetColumnByDatasetIdAsync(datasetId);
            if (columns == null || columns.Count == 0) return NotFound("No columns found for the specified dataset.");
            return Ok(columns);
        }
    }
}