using System;
using System.Collections.Generic;

namespace DataVizApp.Models;

public partial class Workflow
{
    public int WorkflowId { get; set; }

    public int UserId { get; set; }

    public virtual ICollection<WorkflowStage> WorkflowStages { get; set; } = new List<WorkflowStage>();
}
