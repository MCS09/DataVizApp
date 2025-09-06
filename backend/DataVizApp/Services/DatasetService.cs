using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using DataVizApp.Data;
using DataVizApp.Models;
using System.Linq;
using System.Reflection.Metadata.Ecma335;
using System.Collections;
using DataVizApp.Models.DTO;

namespace DataVizApp.Services
{
    public class DatasetService(AppDbContext appDbContext, CosmosDbContext cosmosDbContext, AgentService agentService)
    {


        private readonly AppDbContext _appDbContext = appDbContext;
        private readonly CosmosDbContext _cosmosDbContext = cosmosDbContext;

        private readonly AgentService _agentService = agentService;

        public async Task<Dataset?> GetDatasetByIdAsync(int id)
        {
            return await _appDbContext.Datasets
                .FirstOrDefaultAsync(d => d.DatasetId == id);
        }

        public async Task<List<Dataset>> GetDatasetByUserIdAsync(string userId)
        {
            return await _appDbContext.Datasets
                .Where(d => d.UserId == userId)
                .ToListAsync();
        }

        public async Task<Dataset> CreateDatasetAsync(Dataset dataset)
        {
            // Insert dataset first
            _appDbContext.Datasets.Add(dataset);
            await _appDbContext.SaveChangesAsync(); // Generates DatasetId

            // Get WorkflowStagesNames
            List<WorkflowStagesName> workflowStagesNames =
                await _appDbContext.WorkflowStagesNames.ToListAsync();

            // Add WorkflowStage entries
            foreach (var stageName in workflowStagesNames)
            {
                string newThread = _agentService.CreateNewThread();
                WorkflowStage workflowStage = new()
                {
                    DatasetId = dataset.DatasetId, // now has valid ID
                    WorkflowStageName = stageName.WorkflowStageName,
                    AzureAgentThreadId = newThread
                };
                _appDbContext.WorkflowStages.Add(workflowStage);
            }

            await _appDbContext.SaveChangesAsync();
            return dataset;
        }

        public async Task<WorkflowStage?> GetWorkflowStageByDatasetIdAsync(int datasetId, string stageName)
        {
            return await _appDbContext.WorkflowStages
                .FirstOrDefaultAsync(ws => ws.DatasetId == datasetId && ws.WorkflowStageName == stageName);
        }

        public async Task<bool> DeleteDatasetAsync(int id)
        {
            var dataset = await _appDbContext.Datasets.FindAsync(id);
            if (dataset == null)
                return false;

            _appDbContext.Datasets.Remove(dataset);
            await _appDbContext.SaveChangesAsync();
            return true;
        }

        public async Task<List<DatasetColumn>> GetColumnsByDatasetIdAsync(int datasetId)
        {
            return await _appDbContext.DatasetColumns
                .AsNoTracking()
                .Where(c => c.DatasetId == datasetId)
                .ToListAsync();
        }

        public async Task<bool> SetColumnsAsync(int datasetId, List<DatasetColumnDto> columnDtos)
        {

            List<DatasetColumn> columns = [.. columnDtos
            .Select(dto => new DatasetColumn
            {
                DatasetId = datasetId,
                ColumnNumber = dto.ColumnNumber,
                ColumnName = dto.ColumnName,
                ColumnDescription = dto.ColumnDescription,
                DataType = dto.DataType,
                Relationship = dto.Relationship
            })];

            // Ensure order follows 0..*
            columns.Sort((a, b) => a.ColumnNumber.CompareTo(b.ColumnNumber));
            for (int i = 0; i < columns.Count; i++)
            {
                if (columns[i].ColumnNumber != i)
                    throw new ArgumentException("Column numbers must start at 0 and increment by 1 with no gaps.");
            }

            // Remove existing columns in the database first to avoid unique constraint conflicts
            await _appDbContext.DatasetColumns
                .Where(c => c.DatasetId == datasetId)
                .ExecuteDeleteAsync();

            // Clear tracked entities to avoid duplicate tracking errors when re-adding
            _appDbContext.ChangeTracker.Clear();

            // Add all new columns in one go
            await _appDbContext.DatasetColumns.AddRangeAsync(columns);

            // Persist
            await _appDbContext.SaveChangesAsync();
            return true;
        }

        // Cosmos DatasetRecord Methods

        public async Task<List<DataRecord>> GetColumnDataByIdAsync(int datasetId, int columnNumber)
        {
            return await _cosmosDbContext.DataRecords
                .Where(r => r.DatasetId == datasetId && r.ColumnNumber == columnNumber)
                .ToListAsync();
        }

        public async Task<List<DataRecord>> GetColumnDataByIdAsync(int datasetId, int columnNumber, int count)
        {
            return await _cosmosDbContext.DataRecords
                .Where(r => r.DatasetId == datasetId && r.ColumnNumber == columnNumber)
                .Take(count)
                .ToListAsync();
        }

        public async Task<List<DatasetColumn>> GetColumnByDatasetIdAsync(int datasetId)
        {
            return await _appDbContext.DatasetColumns
                .AsNoTracking()
                .Where(c => c.DatasetId == datasetId)
                .ToListAsync();
        }


        public async Task<bool> SetColumnDataAsync(int datasetId, int columnNumber, List<DataRecordDto> recordDtos)
        {

            // Map each DataRecordDto to a Record object
            List<DataRecord> newRecords = [.. recordDtos.Select(e => new DataRecord
            {
                Id = $"{datasetId}-{columnNumber}-{e.RecordNumber}",
                DatasetId = datasetId,
                ColumnNumber = columnNumber,
                RecordNumber = e.RecordNumber,
                Value = e.Value
            })];

            var existingRecords = await _cosmosDbContext.DataRecords
                .Where(r => r.DatasetId == datasetId && r.ColumnNumber == columnNumber)
                .ToListAsync();

            _cosmosDbContext.DataRecords.RemoveRange(existingRecords);

            await _cosmosDbContext.DataRecords.AddRangeAsync(newRecords);
            await _cosmosDbContext.SaveChangesAsync();
            return true;
        }

        public async Task<string> GetAgentThreadAsync(int datasetId, string workflowStageName)
        {
            WorkflowStage workflowStage = await _appDbContext.WorkflowStages.FirstOrDefaultAsync(e => e.WorkflowStageName == workflowStageName && e.DatasetId == datasetId) ?? throw new Exception("Error finding workflow");
            return workflowStage.AzureAgentThreadId ?? throw new Exception("Agent Thread ID is not set");
        }

        public async Task<List<string>> GetWorkflowStagesNames()
        {
            List<string> names = await _appDbContext.WorkflowStagesNames.Select(e => e.WorkflowStageName).ToListAsync();
            return names;
        }
    }
}