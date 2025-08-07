using System;
using System.Collections.Generic;

namespace DataVizApp.Models;

public partial class WorkflowStage
{
    public int WorkflowId { get; set; }

    public string WorkflowStageName { get; set; } = null!;

    public string? AzureAgentThreadId { get; set; }

    public virtual Workflow Workflow { get; set; } = null!;

    public virtual WorkflowStagesName WorkflowStageNameNavigation { get; set; } = null!;
}
