using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using DataVizApp.Data;
using DataVizApp.Models;
using System.Linq;
using System.Reflection.Metadata.Ecma335;
using System.Collections;
using DataVizApp.Models.DTO;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;
using System.Text.Json.Serialization;
using Microsoft.Extensions.DependencyInjection;

namespace DataVizApp.Services
{
    public class DatasetService(AppDbContext appDbContext, CosmosDbContext cosmosDbContext, AgentService agentService, IServiceScopeFactory scopeFactory)
    {


        private readonly AppDbContext _appDbContext = appDbContext;
        private readonly CosmosDbContext _cosmosDbContext = cosmosDbContext;

        private readonly AgentService _agentService = agentService;

        private readonly IServiceScopeFactory _scopeFactory = scopeFactory;

        public async Task<Dataset?> GetDatasetByIdAsync(int id)
        {
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            return await dbContext.Datasets
                .FirstOrDefaultAsync(d => d.DatasetId == id);
        }

        public async Task<List<Dataset>> GetDatasetByUserIdAsync(string userId)
        {
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            return await dbContext.Datasets
                .Where(d => d.UserId == userId)
                .ToListAsync();
        }

        public async Task<Dataset> CreateDatasetAsync(Dataset dataset)
        {
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            // Insert dataset first
            dbContext.Datasets.Add(dataset);
            await dbContext.SaveChangesAsync(); // Generates DatasetId

            // Get WorkflowStagesNames
            List<WorkflowStagesName> workflowStagesNames =
                await dbContext.WorkflowStagesNames.ToListAsync();

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
                dbContext.WorkflowStages.Add(workflowStage);
            }

            await dbContext.SaveChangesAsync();
            return dataset;
        }

        public async Task<WorkflowStage?> GetWorkflowStageByDatasetIdAsync(int datasetId, string stageName)
        {
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            return await dbContext.WorkflowStages
                .FirstOrDefaultAsync(ws => ws.DatasetId == datasetId && ws.WorkflowStageName == stageName);
        }

        public async Task<bool> DeleteDatasetAsync(int id)
        {
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var dataset = await dbContext.Datasets.FindAsync(id);
            if (dataset == null)
                return false;

            dbContext.Datasets.Remove(dataset);
            await dbContext.SaveChangesAsync();
            return true;
        }

        public async Task<List<DatasetColumn>> GetColumnsByDatasetIdAsync(int datasetId)
        {
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            return await dbContext.DatasetColumns
                .AsNoTracking()
                .Where(c => c.DatasetId == datasetId)
                .ToListAsync();
        }

        public async Task<bool> SetColumnsAsync(int datasetId, List<DatasetColumnDto> columnDtos)
        {
            List<DatasetColumn> columns = columnDtos
            .Select(dto => new DatasetColumn
            {
                DatasetId = datasetId,
                ColumnNumber = dto.ColumnNumber,
                ColumnName = dto.ColumnName,
                ColumnDescription = dto.ColumnDescription,
                DataType = dto.DataType,
                Relationship = dto.Relationship
            }).ToList();

            columns.Sort((a, b) => a.ColumnNumber.CompareTo(b.ColumnNumber));
            for (int i = 0; i < columns.Count; i++)
            {
                if (columns[i].ColumnNumber != i)
                    throw new ArgumentException("Column numbers must start at 0 and increment by 1 with no gaps.");
            }

            // Ensure no duplicate column names
            if (columns.GroupBy(c => c.ColumnName).Any(g => g.Count() > 1))
            {
                throw new ArgumentException("Duplicate column names are not allowed for a dataset.");
            }

            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            // Remove existing columns in the database first to avoid unique constraint conflicts
            await dbContext.DatasetColumns
                .Where(c => c.DatasetId == datasetId)
                .ExecuteDeleteAsync();

            // Clear tracked entities to avoid duplicate tracking errors when re-adding
            dbContext.ChangeTracker.Clear();

            // Add all new columns in one go
            await dbContext.DatasetColumns.AddRangeAsync(columns);

            // Persist
            await dbContext.SaveChangesAsync();
            return true;
        }

        // Cosmos DatasetRecord Methods

        public async Task<List<DataRecord>> GetColumnDataByIdAsync(int datasetId, int columnNumber)
        {
            return await _cosmosDbContext.DataRecords
                .Where(r => r.DatasetId == datasetId && r.ColumnNumber == columnNumber)
                .ToListAsync();
        }

        public async Task<(DatasetColumn, List<DataRecord>)> GetColumnDataByNameAsync(int datasetId, string columnName)
        {
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            // find column number first
            DatasetColumn column = await dbContext.DatasetColumns
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.DatasetId == datasetId && c.ColumnName == columnName)
                ?? throw new Exception("Column not found");

            return (column, await _cosmosDbContext.DataRecords
                .Where(r => r.DatasetId == datasetId && r.ColumnNumber == column.ColumnNumber)
                .ToListAsync());
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
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            return await dbContext.DatasetColumns
                .AsNoTracking()
                .Where(c => c.DatasetId == datasetId)
                .ToListAsync();
        }


        public async Task<bool> SetColumnDataAsyncOld(int datasetId, int columnNumber, List<DataRecordDto> recordDtos)
        {

            // Map each DataRecordDto to a Record object
            List<DataRecord> newRecords = recordDtos.Select(e => new DataRecord
            {
                Id = $"{datasetId}-{columnNumber}-{e.RecordNumber}",
                DatasetId = datasetId,
                ColumnNumber = columnNumber,
                RecordNumber = e.RecordNumber,
                Value = e.Value
            }).ToList();

            var existingRecords = await _cosmosDbContext.DataRecords
                .Where(r => r.DatasetId == datasetId && r.ColumnNumber == columnNumber)
                .ToListAsync();

            _cosmosDbContext.DataRecords.RemoveRange(existingRecords);

            await _cosmosDbContext.DataRecords.AddRangeAsync(newRecords);
            await _cosmosDbContext.SaveChangesAsync();
            return true;
        }
        
        public async Task<bool> SetColumnDataAsync(int datasetId, int columnNumber, List<DataRecordDto> recordDtos)
        {
            Container container = _cosmosDbContext.Database.GetCosmosClient()
                .GetContainer(_cosmosDbContext.Database.GetCosmosDatabaseId(), _cosmosDbContext.DataRecords.EntityType.GetContainer());

            // Map DTOs to DataRecord objects
            List<DataRecord> newRecords = recordDtos.Select(e => new DataRecord
            {
                Id = $"{datasetId}-{columnNumber}-{e.RecordNumber}",
                DatasetId = datasetId,
                ColumnNumber = columnNumber,
                RecordNumber = e.RecordNumber,
                Value = e.Value
            }).ToList();

            // Query existing records
            var existingRecordsIterator = container.GetItemLinqQueryable<DataRecord>(true)
                .Where(r => r.DatasetId == datasetId && r.ColumnNumber == columnNumber)
                .ToFeedIterator();

            List<DataRecord> existingRecords = new();
            while (existingRecordsIterator.HasMoreResults)
            {
                var response = await existingRecordsIterator.ReadNextAsync();
                existingRecords.AddRange(response.Resource);
            }

            // Delete existing records in parallel
            var deleteTasks = existingRecords.Select(r =>
                container.DeleteItemAsync<DataRecord>(r.Id, new PartitionKey(r.DatasetId))
            );
            await Task.WhenAll(deleteTasks);

            // Throttle inserts using SemaphoreSlim
            SemaphoreSlim throttler = new SemaphoreSlim(5); // max 5 concurrent inserts
            List<Task> insertTasks = new();

            foreach (var record in newRecords)
            {
                await throttler.WaitAsync();

                insertTasks.Add(Task.Run(async () =>
                {
                    try
                    {
                        await container.CreateItemAsync(record, new PartitionKey(record.DatasetId));
                    }
                    catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                    {
                        // Wait for the recommended retry time
                        await Task.Delay(ex.RetryAfter ?? TimeSpan.FromSeconds(1));
                        await container.CreateItemAsync(record, new PartitionKey(record.DatasetId));
                    }
                    finally
                    {
                        throttler.Release();
                    }
                }));
            }

            await Task.WhenAll(insertTasks);

            return true;
        }



        public async Task<string> GetAgentThreadAsync(int datasetId, string workflowStageName)
        {
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            WorkflowStage workflowStage = await dbContext.WorkflowStages.FirstOrDefaultAsync(e => e.WorkflowStageName == workflowStageName && e.DatasetId == datasetId) ?? throw new Exception("Error finding workflow");
            return workflowStage.AzureAgentThreadId ?? throw new Exception("Agent Thread ID is not set");
        }

        public async Task<List<string>> GetWorkflowStagesNames()
        {
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            List<string> names = await dbContext.WorkflowStagesNames.Select(e => e.WorkflowStageName).ToListAsync();
            return names;
        }
    }
}