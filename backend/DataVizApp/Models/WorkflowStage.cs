using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace DataVizApp.Models;

[PrimaryKey("DatasetId", "WorkflowStageName")]
[Table("workflow_stages")]
public partial class WorkflowStage
{
    [Key]
    [Column("dataset_id")]
    public int DatasetId { get; set; }

    [Key]
    [Column("workflow_stage_name")]
    [StringLength(50)]
    public string WorkflowStageName { get; set; } = null!;

    [Column("azure_agent_thread_id")]
    [StringLength(50)]
    public string? AzureAgentThreadId { get; set; }
}
