using Microsoft.AspNetCore.Mvc;
using DataVizApp.Models;
using DataVizApp.Services;
using DataVizApp.Models.DTO;
using System.Net.Http.Headers;
using CsvHelper;
using System.Globalization;

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
        public async Task<ActionResult<Dataset>> CreateDataset([FromBody] DatasetDto datasetDto)
        {
            Dataset newDataset = new()
            {
                UserId = datasetDto.UserId,
                DatasetName = datasetDto.DatasetName
            };

            await _datasetService.CreateDatasetAsync(newDataset);
            return CreatedAtAction(
                nameof(GetDataset),
                new { datasetId = newDataset.DatasetId }, // route values
                newDataset // response body
            );
        }

        public record ColumnDataDto(int DatasetId, int ColumnNumber, List<RecordValueDto> DataRecords);

        public record GetColumnDataRequest(int DatasetId, int ColumnNumber);

        [HttpPost("getColumnData")]
        public async Task<ActionResult<ColumnDataDto>> GetColumnData([FromBody] GetColumnDataRequest request)
        {
            Dataset? dataset = await _datasetService.GetDatasetByIdAsync(request.DatasetId);
            if (dataset == null) return NotFound("Dataset not found.");

            // Get columns
            List<DatasetRecord> records = await _datasetService.GetColumnDataByIdAsync(request.DatasetId, request.ColumnNumber);

            List<RecordValueDto> dtoRecords = records.Select(r => new RecordValueDto(r.RecordNumber, r.Value)).ToList();

            ColumnDataDto result = new(request.DatasetId, request.ColumnNumber, dtoRecords);

            return Ok(result);
        }

        public record GetColumnDataByNameRequest(int DatasetId, string ColumnName);
        public record ColumnDataWithNameDto(int DatasetId, string ColumnName, int ColumnNumber, List<RecordValueDto> DataRecords);

        [HttpPost("getColumnDataByName")]
        public async Task<ActionResult<ColumnDataWithNameDto>> GetColumnDataByName([FromBody] GetColumnDataByNameRequest request)
        {
            Dataset? dataset = await _datasetService.GetDatasetByIdAsync(request.DatasetId);
            if (dataset == null) return NotFound("Dataset not found.");

            // Get columns
            (DatasetColumn column, List<DatasetRecord> records) = await _datasetService.GetColumnDataByNameAsync(request.DatasetId, request.ColumnName);

            List<RecordValueDto> dtoRecords = records.Select(r => new RecordValueDto(r.RecordNumber, r.Value)).ToList();

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
            List<ColumnProfileDto> profiles = new();
            foreach (var column in columns)
            {
                List<DatasetRecord> samples = await _datasetService.GetColumnDataByIdAsync(datasetId, column.ColumnNumber, 5);
                profiles.Add(new ColumnProfileDto(
                    column.ColumnNumber,
                    column.ColumnName,
                    [.. samples.Select(r => new ColumnProfileDataRecordDto(r.RecordNumber, r.Value ?? ""))]
                ));
            }

            return Ok(new { profiles });
        }

        [HttpPost("setColumnData")]
        public async Task<IActionResult> SetColumnData([FromBody] ColumnDataDto request)
        {
            Dataset? dataset = await _datasetService.GetDatasetByIdAsync(request.DatasetId);
            if (dataset == null) return NotFound("Dataset not found.");

            bool success = await _datasetService.DeleteDatasetRecordByColumnAsync(request.DatasetId, request.ColumnNumber);

            // Prepare DatasetRecord array with DatasetId and ColumnNumber set
            DatasetRecord[] records = request.DataRecords.Select(r => new DatasetRecord
            {
                DatasetId = request.DatasetId,
                ColumnNumber = request.ColumnNumber,
                RecordNumber = r.RecordNumber,
                Value = r.Value
            }).ToArray();

            await _datasetService.AddDatasetRecordAsync(records);
            if (!success) return BadRequest("Failed to update dataset with new records.");
            return NoContent();
        }

        [HttpPost("addColumnData")]
        public async Task<IActionResult> AddColumnData([FromBody] ColumnDataDto request)
        {
            // Prepare DatasetRecord array with DatasetId and ColumnNumber set
            DatasetRecord[] records = request.DataRecords.Select(r => new DatasetRecord
            {
                DatasetId = request.DatasetId,
                ColumnNumber = request.ColumnNumber,
                RecordNumber = r.RecordNumber,
                Value = r.Value
            }).ToArray();

            await _datasetService.AddDatasetRecordAsync(records);
            return NoContent();
        }


        public record ColumnNameMapDto(string OldColumnName, string NewColumnName);
        public record DatasetColumnsRequest(int DatasetId, List<DatasetColumnDto> NewColumns, List<ColumnNameMapDto> ColumnNamesMap);

        [HttpPost("setColumns")]
        public async Task<IActionResult> SetColumns([FromBody] DatasetColumnsRequest request)
        {
            Dataset? dataset = await _datasetService.GetDatasetByIdAsync(request.DatasetId);
            if (dataset == null) return NotFound("Dataset not found.");

            await _datasetService.UpdateColumnsAsync(request.DatasetId, request.NewColumns, request.ColumnNamesMap);
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

            return Ok(new { threadId });
        }

        [HttpGet("getColumnsByDatasetId/{datasetId}")]
        public async Task<ActionResult<List<DatasetColumn>>> GetColumnsByDatasetId(int datasetId)
        {
            List<DatasetColumn> columns = await _datasetService.GetColumnByDatasetIdAsync(datasetId);
            if (columns == null || columns.Count == 0) return NotFound("No columns found for the specified dataset.");
            return Ok(columns);
        }

        public record RecordDto(List<ColumnValueDto> ColumnValueDtos);

        [HttpGet("getRecord/{datasetId}/{recordNumber}")]
        public async Task<ActionResult<RecordDto>> GetRecord(int datasetId, int recordNumber)
        {
            var record = await _datasetService.GetRecordAsync(datasetId, recordNumber);
            return new RecordDto(record);
        }



        public record ImportFromDriveRequest(string UserId, string FileId, string AccessToken, string DatasetName);

        [HttpPost("importFromDrive")]
        public async Task<IActionResult> ImportFromDrive([FromBody] ImportFromDriveRequest request)
        {
            // Download CSV file from Google Drive
            using var httpClient = new HttpClient();
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", request.AccessToken);

            // Google Drive file download URL for files with fileId
            string downloadUrl = $"https://www.googleapis.com/drive/v3/files/{request.FileId}?alt=media";

            HttpResponseMessage response;
            try
            {
                response = await httpClient.GetAsync(downloadUrl, HttpCompletionOption.ResponseHeadersRead);
            }
            catch (Exception ex)
            {
                return BadRequest($"Exception while downloading file: {ex.Message}");
            }

            // Create new dataset
            Dataset newDataset = new()
            {
                UserId = request.UserId,
                DatasetName = request.DatasetName
            };
            await _datasetService.CreateDatasetAsync(newDataset);

            // Prepare to read CSV stream
            using var stream = await response.Content.ReadAsStreamAsync();
            using var streamReader = new StreamReader(stream);
            var csvConfig = new CsvHelper.Configuration.CsvConfiguration(CultureInfo.InvariantCulture)
            {
                MissingFieldFound = null,
                BadDataFound = null,
                HeaderValidated = null,
                TrimOptions = CsvHelper.Configuration.TrimOptions.Trim
            };
            using var csvReader = new CsvReader(streamReader, csvConfig);

            // Read header
            if (!await csvReader.ReadAsync() || !csvReader.ReadHeader())
            {
                return BadRequest("CSV file has no header.");
            }

            var headers = csvReader.HeaderRecord;
            if (headers == null || headers.Length == 0)
            {
                return BadRequest("CSV header is empty.");
            }

            // Build DatasetColumnDto list
            var columns = new List<DatasetColumnDto>();
            for (int i = 0; i < headers.Length; i++)
            {
                columns.Add(new DatasetColumnDto
                {
                    ColumnNumber = i,
                    ColumnName = headers[i],
                    DataType = "Unknown",
                    ColumnDescription = ""
                });
            }

            // Insert columns metadata
            bool columnsSet = await _datasetService.SetColumnsAsync(newDataset.DatasetId, columns);
            if (!columnsSet)
            {
                return BadRequest("Failed to set dataset columns.");
            }

            int recordNumber = 1;
            const int batchSize = 1000;
            var batchRecords = new List<DatasetRecord>(batchSize);

            // Read each row and insert records row by row
            while (await csvReader.ReadAsync())
            {
                for (int colIndex = 0; colIndex < headers.Length; colIndex++)
                {
                    string? value = csvReader.GetField(colIndex);
                    batchRecords.Add(new DatasetRecord
                    {
                        DatasetId = newDataset.DatasetId,
                        ColumnNumber = colIndex,
                        RecordNumber = recordNumber,
                        Value = value ?? string.Empty
                    });
                }

                if (batchRecords.Count >= batchSize * headers.Length)
                {
                    await _datasetService.AddDatasetRecordAsync(batchRecords.ToArray());
                    batchRecords.Clear();
                }

                recordNumber++;
            }

            if (batchRecords.Count > 0)
            {
                await _datasetService.AddDatasetRecordAsync(batchRecords.ToArray());
            }

            return Ok(new
            {
                datasetId = newDataset.DatasetId,
                columnsInserted = headers.Length,
                status = "completed"
            });
        }
    }
}