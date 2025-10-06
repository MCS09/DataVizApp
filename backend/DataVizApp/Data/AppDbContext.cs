using System;
using System.Collections.Generic;
using DataVizApp.Models;
using Microsoft.EntityFrameworkCore;

namespace DataVizApp.Data;

public partial class AppDbContext : DbContext
{
    public AppDbContext()
    {
    }

    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Dataset> Datasets { get; set; }

    public virtual DbSet<DatasetColumn> DatasetColumns { get; set; }

    public virtual DbSet<WorkflowStage> WorkflowStages { get; set; }

    public virtual DbSet<WorkflowStagesName> WorkflowStagesNames { get; set; }

    public virtual DbSet<WorkflowVisualization> WorkflowVisualizations { get; set; }

    public virtual DbSet<DatasetRecord> DatasetRecords { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        => optionsBuilder.UseSqlServer();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Dataset>(entity =>
        {
            entity.HasKey(e => e.DatasetId).HasName("pk_dataset");

            entity.Property(e => e.DatasetId).ValueGeneratedOnAdd();
        });

        modelBuilder.Entity<DatasetColumn>(entity =>
        {
            entity.HasKey(e => new { e.DatasetId, e.ColumnNumber }).HasName("pk_dataset_columns");
        });

        modelBuilder.Entity<WorkflowStage>(entity =>
        {
            entity.HasKey(e => new { e.DatasetId, e.WorkflowStageName }).HasName("pk_workflow_stages");
        });

        modelBuilder.Entity<WorkflowStagesName>(entity =>
        {
            entity.HasKey(e => e.WorkflowStageName).HasName("pk_workflow_stages_names");
        });

        modelBuilder.Entity<WorkflowVisualization>(entity =>
        {
            entity.HasKey(e => new { e.DatasetId, e.VisualizationName }).HasName("pk_workflow_visualizations");
        });

        modelBuilder.Entity<DatasetRecord>(dr =>
        {
            dr.HasKey(dr => new { dr.DatasetId, dr.ColumnNumber, dr.RecordNumber });
            dr.HasIndex(dr => dr.DatasetId);
            dr.HasOne<DatasetColumn>()
                .WithMany()
                .HasForeignKey(dr => new { dr.DatasetId, dr.ColumnNumber })
                .OnDelete(DeleteBehavior.Cascade);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
