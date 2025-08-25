namespace DataVizApp.Models;
public class AzureAIAgentsOptions
{
    public required string Endpoint { get; set; }
    public required AgentsConfig Agents { get; set; }

    public class AgentsConfig
    {
        public required string Cleaning { get; set; }
        public required string Dataset { get; set; }
        public required string Visualization { get; set; }
    }
}