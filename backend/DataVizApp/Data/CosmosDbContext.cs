// Data/CosmosDbContext.cs
using Microsoft.EntityFrameworkCore;
using DataVizApp.Models;

namespace DataVizApp.Data;
public class CosmosDbContext(DbContextOptions<CosmosDbContext> options) : DbContext(options)
{
    public DbSet<DataRecord> DataRecords { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<DataRecord>()
            .ToContainer("Container1")            // Cosmos container name
            .HasPartitionKey(d => d.DatasetId)        // Choose partition key
            .HasNoDiscriminator();
    }
}