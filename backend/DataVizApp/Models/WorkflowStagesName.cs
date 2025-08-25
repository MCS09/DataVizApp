using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace DataVizApp.Models;

[Table("workflow_stages_names")]
public partial class WorkflowStagesName
{
    [Key]
    [Column("workflow_stage_name")]
    [StringLength(50)]
    public string WorkflowStageName { get; set; } = null!;
}