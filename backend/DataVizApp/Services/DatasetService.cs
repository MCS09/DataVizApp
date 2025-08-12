using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using DataVizApp.Data;
using DataVizApp.Models;
using System.Linq;

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
                .Where(c => c.DatasetId == datasetId)
                .ToListAsync();
        }

        public async Task<bool> SetColumnsAsync(int datasetId, List<DatasetColumn> columns)
        {
            // Ensure DatasetId is set for all new columns
            columns.ForEach(c => c.DatasetId = datasetId);

            // Remove existing columns without fetching into memory
            var existingColumns = _appDbContext.DatasetColumns
                .Where(c => c.DatasetId == datasetId);
            _appDbContext.DatasetColumns.RemoveRange(existingColumns);

            // Add all new columns in one go
            await _appDbContext.DatasetColumns.AddRangeAsync(columns);

            // Save all changes in one trip
            await _appDbContext.SaveChangesAsync();
            return true;
        }

        // Cosmos DatasetRecord Methods

        public async Task<List<DatasetRecord>> GetRecordsByDatasetIdAsync(int datasetId, int start, int end)
        {
            return await _cosmosDbContext.DatasetRecords
                .Where(r => r.DatasetId == datasetId && r.RecordNumber >= start && r.RecordNumber <= end)
                .ToListAsync();
        }

        public async Task<bool> SetRecordsAsync(int datasetId, List<DatasetRecord> records)
        {
            if (records.Count > 200)
                throw new ArgumentException("Please batch your records into smaller sets of 200 or less.");

            // Ensure DatasetId is set for all new records
            records.ForEach(r => r.DatasetId = datasetId);

            // Remove existing records without fetching them into memory
            var existingRecords = _cosmosDbContext.DatasetRecords
                .Where(r => r.DatasetId == datasetId);
            _cosmosDbContext.DatasetRecords.RemoveRange(existingRecords);

            return await AddRecordsAsync(records);
        }

        public async Task<bool> AddRecordsAsync(List<DatasetRecord> records)
        {
            if (records.Count > 200)
                throw new ArgumentException("Please batch your records into smaller sets of 200 or less.");
            // Ensure 
            await _cosmosDbContext.DatasetRecords.AddRangeAsync(records);
            await _cosmosDbContext.SaveChangesAsync();
            return true;
        }
    }
}