using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace DataVizApp.Models;

[PrimaryKey("DatasetId", "VisualizationName")]
[Table("workflow_visualizations")]
public partial class WorkflowVisualization
{
    [Key]
    [Column("dataset_id")]
    public int DatasetId { get; set; }

    [Key]
    [Column("visualization_name")]
    [StringLength(100)]
    public string VisualizationName { get; set; } = null!;
}
