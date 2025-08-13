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

        public Uri GetServiceUrl()
        {
            return new Uri(_agentsConfig.Endpoint);
        }

        private string? GetAgentIdByKey(AgentType agentType) =>
            agentType switch
            {
                AgentType.Cleaning => _agentsConfig.Agents.Cleaning,
                AgentType.Dataset => _agentsConfig.Agents.Dataset,
                AgentType.Visualization => _agentsConfig.Agents.Visualization,
                _ => null
            };

        public enum AgentType
        {
            Cleaning = 1,
            Dataset = 2,
            Visualization = 3
        }
    }
}