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
using static DataVizApp.Controllers.DatasetController;

namespace DataVizApp.Services
{
    public class DatasetService(AppDbContext appDbContext, AgentService agentService, IServiceScopeFactory scopeFactory)
    {


        private readonly AppDbContext _appDbContext = appDbContext;

        private readonly AgentService _agentService = agentService;

        private readonly IServiceScopeFactory _scopeFactory = scopeFactory;

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

        public async Task<bool> DeleteDatasetAsync(int datasetId)
        {
            await using var transaction = await _appDbContext.Database.BeginTransactionAsync();

            // Delete all records
            await _appDbContext.DatasetRecords
                .Where(r => r.DatasetId == datasetId)
                .ExecuteDeleteAsync();

            // Delete all columns
            await _appDbContext.DatasetColumns
                .Where(c => c.DatasetId == datasetId)
                .ExecuteDeleteAsync();

            // Delete workflow stages
            await _appDbContext.WorkflowStages
                .Where(ws => ws.DatasetId == datasetId)
                .ExecuteDeleteAsync();

            // Delete the dataset itself
            await _appDbContext.Datasets
                .Where(d => d.DatasetId == datasetId)
                .ExecuteDeleteAsync();

            await transaction.CommitAsync();
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
            if (await _appDbContext.DatasetColumns
                .Where(c => c.DatasetId == datasetId)
                .GroupBy(c => c.ColumnName)
                .AnyAsync(g => g.Count() > 1))
            {
                throw new ArgumentException("Duplicate column names are not allowed for a dataset.");
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

        // Updated to use DatasetRecord from AppDbContext (SQL)

        public async Task<List<DatasetRecord>> GetColumnDataByIdAsync(int datasetId, int columnNumber)
        {
            return await _appDbContext.DatasetRecords
                .Where(r => r.DatasetId == datasetId && r.ColumnNumber == columnNumber)
                .ToListAsync();
        }

        public async Task<(DatasetColumn, List<DatasetRecord>)> GetColumnDataByNameAsync(int datasetId, string columnName)
        {
            // find column number first
            DatasetColumn column = await _appDbContext.DatasetColumns
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.DatasetId == datasetId && c.ColumnName == columnName)
                ?? throw new Exception("Column not found");

            return (column, await _appDbContext.DatasetRecords
                .Where(r => r.DatasetId == datasetId && r.ColumnNumber == column.ColumnNumber)
                .ToListAsync());
        }

        public async Task<List<DatasetRecord>> GetColumnDataByIdAsync(int datasetId, int columnNumber, int count)
        {
            return await _appDbContext.DatasetRecords
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

        public async Task<bool> DeleteDatasetRecordByColumnAsync(int datasetId, int columnNumber)
        {
            // Remove existing records for the datasetId and columnNumber
            var existingRecords = await _appDbContext.DatasetRecords
                .Where(r => r.DatasetId == datasetId && r.ColumnNumber == columnNumber)
                .ToListAsync();

            _appDbContext.DatasetRecords.RemoveRange(existingRecords);
            await _appDbContext.SaveChangesAsync();
            return true;
        }

        public async Task AddDatasetRecordAsync(DatasetRecord[] datasetRecord)
        {
            // Add all provided records
            await _appDbContext.DatasetRecords.AddRangeAsync(datasetRecord);
            await _appDbContext.SaveChangesAsync();
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

        public async Task<List<ColumnValueDto>> GetRecordAsync(int datasetId, int recordNumber)
        {
            var records = await _appDbContext.DatasetRecords
                .Where(r => r.DatasetId == datasetId && r.RecordNumber == recordNumber)
                .AsNoTracking()
                .ToListAsync();

            return records
                .OrderBy(r => r.ColumnNumber)
                .Select(r => new ColumnValueDto(r.ColumnNumber, r.Value))
                .ToList();
        }

        public async Task UpdateColumnsAsync(int datasetId, List<DatasetColumnDto> newColumns, List<ColumnNameMapDto> columnNamesMap)
        {
            // 1. Fetch existing columns for the dataset
            var existingColumns = await _appDbContext.DatasetColumns
                .Where(c => c.DatasetId == datasetId)
                .ToListAsync();

            if (!existingColumns.Any())
                throw new Exception("No existing columns found for this dataset.");

            
            // 2. Verify that all old column names exist
            var missingColumns = columnNamesMap
                .Where(m => !existingColumns.Any(c => c.ColumnName == m.OldColumnName))
                .Select(m => m.OldColumnName)
                .ToList();

            if (missingColumns.Any())
                throw new Exception($"Cannot update. The following old columns were not found: {string.Join(", ", missingColumns)}");

            // 2. Apply column renames according to ColumnNamesMap
            foreach (var (oldName, newName) in columnNamesMap)
            {
                var column = existingColumns.FirstOrDefault(c => c.ColumnName == oldName);
                if (column != null)
                {
                    column.ColumnName = newName; // rename
                }
            }

            // 3. Update other properties or add new columns
            foreach (var newCol in newColumns)
            {
                // Try to match with renamed columns
                var existing = existingColumns.FirstOrDefault(c => columnNamesMap.Any(m => m.NewColumnName == newCol.ColumnName && c.ColumnName == newCol.ColumnName));
                if (existing != null)
                {
                    // Update other properties
                    existing.ColumnDescription = newCol.ColumnDescription;
                    existing.DataType = newCol.DataType;
                    existing.ColumnNumber = newCol.ColumnNumber;
                    existing.Relationship = newCol.Relationship;
                }
            }

            // 4. Save changes
            await _appDbContext.SaveChangesAsync();
        }
    }
}