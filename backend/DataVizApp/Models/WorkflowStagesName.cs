using System;
using System.Collections.Generic;

namespace DataVizApp.Models;

public partial class WorkflowStagesName
{
    public string WorkflowStageName { get; set; } = null!;

    public virtual ICollection<WorkflowStage> WorkflowStages { get; set; } = new List<WorkflowStage>();
}
