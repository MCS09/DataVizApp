using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace DataVizApp.Models;

public partial class AppDbContext : DbContext
{
    public AppDbContext()
    {
    }

    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Workflow> Workflows { get; set; }

    public virtual DbSet<WorkflowStage> WorkflowStages { get; set; }

    public virtual DbSet<WorkflowStagesName> WorkflowStagesNames { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        => optionsBuilder.UseSqlServer();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Workflow>(entity =>
        {
            entity.HasKey(e => e.WorkflowId).HasName("pk_workflow");

            entity.ToTable("workflows");

            entity.Property(e => e.WorkflowId)
                .ValueGeneratedNever()
                .HasColumnName("workflow_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
        });

        modelBuilder.Entity<WorkflowStage>(entity =>
        {
            entity.HasKey(e => new { e.WorkflowId, e.WorkflowStageName }).HasName("pk_workflow_stages");

            entity.ToTable("workflow_stages");

            entity.Property(e => e.WorkflowId).HasColumnName("workflow_id");
            entity.Property(e => e.WorkflowStageName)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("workflow_stage_name");
            entity.Property(e => e.AzureAgentThreadId)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("azure_agent_thread_id");

            entity.HasOne(d => d.Workflow).WithMany(p => p.WorkflowStages)
                .HasForeignKey(d => d.WorkflowId)
                .HasConstraintName("FK__workflow___workf__395884C4");

            entity.HasOne(d => d.WorkflowStageNameNavigation).WithMany(p => p.WorkflowStages)
                .HasForeignKey(d => d.WorkflowStageName)
                .HasConstraintName("FK__workflow___workf__3A4CA8FD");
        });

        modelBuilder.Entity<WorkflowStagesName>(entity =>
        {
            entity.HasKey(e => e.WorkflowStageName).HasName("pk_workflow_stages_names");

            entity.ToTable("workflow_stages_names");

            entity.Property(e => e.WorkflowStageName)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("workflow_stage_name");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
