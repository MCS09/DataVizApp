namespace DataVizApp.Models;
public class AzureAIAgentsOptions
{
    public string Endpoint { get; set; } = string.Empty;
    public AgentsConfig Agents { get; set; } = new();

    public class AgentsConfig
    {
        public string Cleaning { get; set; } = string.Empty;
        public string Dataset { get; set; } = string.Empty;
        public string Visualization { get; set; } = string.Empty;
    }
}