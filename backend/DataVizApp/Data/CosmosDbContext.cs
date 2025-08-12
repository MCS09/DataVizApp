// Data/CosmosDbContext.cs
using Microsoft.EntityFrameworkCore;
using DataVizApp.Models;

namespace DataVizApp.Data;
public class CosmosDbContext(DbContextOptions<CosmosDbContext> options) : DbContext(options)
{
    public DbSet<DatasetRecord> DatasetRecords { get; set; }
    public DbSet<CellValue> CellValues { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<DatasetRecord>()
            .ToContainer("dataset_records")            // Cosmos container name
            .HasPartitionKey(d => d.DatasetId)        // Choose partition key
            .HasNoDiscriminator();
    }
}