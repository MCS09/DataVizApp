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

        public async Task<List<ChatMessageDto>> GetChatHistoryByIdAsync(string threadId)
        {
            Uri endpointUri = GetServiceUrl();

            AIProjectClient projectClient = new(endpointUri, new DefaultAzureCredential());

            PersistentAgentsClient agentsClient = projectClient.GetPersistentAgentsClient();

            AsyncPageable<PersistentThreadMessage> messages = agentsClient.Messages.GetMessagesAsync(
                threadId, order: ListSortOrder.Ascending);

            List<ChatMessageDto> messageDtos = [];
            await foreach (var m in messages)
            {
                messageDtos.Add(new ChatMessageDto(
                    m.Role.ToString(),
                    string.Join("\n", m.ContentItems.OfType<MessageTextContent>().Select(c => c.Text))
                ));
            }

            return messageDtos;
        }

        public async Task SendMessageAndRunAgentAsync(string threadId, string agentId, ChatMessageDto chatMessageDto)
        {
            Uri endpointUri = GetServiceUrl();

            AIProjectClient projectClient = new(endpointUri, new DefaultAzureCredential());
            PersistentAgentsClient agentsClient = projectClient.GetPersistentAgentsClient();

            // 1. Send user message to the thread
            PersistentThreadMessage messageResponse = agentsClient.Messages.CreateMessage(
                threadId,
                new MessageRole(chatMessageDto.Role),
                chatMessageDto.Text
            );

            // 2. Start the agent run
            ThreadRun run = agentsClient.Runs.CreateRun(threadId, agentId);

            // 3. Poll until the run reaches a terminal status
            do
            {
                await Task.Delay(TimeSpan.FromMilliseconds(500));
                run = agentsClient.Runs.GetRun(threadId, run.Id);
            }
            while (run.Status == RunStatus.Queued || run.Status == RunStatus.InProgress);

            // 4. Handle failure
            if (run.Status != RunStatus.Completed)
            {
                throw new InvalidOperationException($"Run failed or was canceled: {run.LastError?.Message}");
            }
        }

        public string GetAgentIdByKey(AgentType agentType) =>
            agentType switch
            {
                AgentType.Cleaning => _agentsConfig.Agents.Cleaning,
                AgentType.Dataset => _agentsConfig.Agents.Dataset,
                AgentType.Visualization => _agentsConfig.Agents.Visualization,
                _ => throw new Exception("Agent not found")
            };
    }

    public record ChatMessageDto(string Role, string Text);

}