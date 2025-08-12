using Azure;
using Azure.AI.Projects;
using Azure.AI.Agents.Persistent;
using Azure.Identity;
using DataVizApp.Models;
using Microsoft.Extensions.Options;

namespace DataVizApp.Services
{
    public class AgentService(AIProjectClient projectClient, IOptions<AzureAIAgentsOptions> agentsConfig)
    {
        private readonly AIProjectClient _projectClient = projectClient;
        private readonly AzureAIAgentsOptions _agentsConfig = agentsConfig.Value;

        public string CreateNewThread()
        {
            PersistentAgentThread thread = _projectClient.GetPersistentAgentsClient()
                                                         .Threads
                                                         .CreateThread();
            return thread.Id;
        }

        private string? GetAgentIdByKey(string agentKey) =>
            agentKey.ToLower() switch
            {
                "cleaning" => _agentsConfig.Agents.Cleaning,
                "dataset" => _agentsConfig.Agents.Dataset,
                "visualization" => _agentsConfig.Agents.Visualization,
                _ => null
            };
    }
}