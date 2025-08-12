using Azure;
using Azure.Identity;
using Microsoft.AspNetCore.Mvc;
using Azure.AI.Projects;
using Azure.AI.Agents.Persistent;
using DataVizApp.Models;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Options;
using DataVizApp.Services;

namespace DataVizApp.Controllers;
[ApiController]
[Route("api/[controller]")]
public class AgentChatController(AgentService agentService) : ControllerBase
{
    private readonly AgentService _agentService = agentService;

    [HttpPost("getNewThread")]
    public ActionResult<string> GetNewThread()
    {
        return _agentService.CreateNewThread();
    }

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] ChatRequest request)
    {
        string threadId = request.ThreadId;
        string message = request.Message;
        string userEmail = request.UserEmail;

        var endpoint = new Uri("https://DataVizApp.services.ai.azure.com/api/projects/DataVizApp-Agents");
        AIProjectClient projectClient = new(endpoint, new DefaultAzureCredential());

        PersistentAgentsClient agentsClient = projectClient.GetPersistentAgentsClient();

        PersistentAgent agent = agentsClient.Administration.GetAgent("asst_vDwd3nza70lBM8w9KspdFA03");
        
        PersistentThreadMessage messageResponse = agentsClient.Messages.CreateMessage(
            threadId,
            MessageRole.User,
            message);

        ThreadRun run = agentsClient.Runs.CreateRun(
            threadId,
            agent.Id);

        // Poll until the run reaches a terminal status
        do
        {
            await Task.Delay(TimeSpan.FromMilliseconds(500));
            run = agentsClient.Runs.GetRun(threadId, run.Id);
        }
        while (run.Status == RunStatus.Queued
            || run.Status == RunStatus.InProgress);
        if (run.Status != RunStatus.Completed)
        {
            throw new InvalidOperationException($"Run failed or was canceled: {run.LastError?.Message}");
        }

        Pageable<PersistentThreadMessage> messages = agentsClient.Messages.GetMessages(
            threadId, order: ListSortOrder.Ascending);

        ChatHistory chatHistory = new()
        {
            ThreadId = threadId,
            Messages = []
        };

        // Display messages
        foreach (PersistentThreadMessage threadMessage in messages)
        {
            Console.Write($"{threadMessage.CreatedAt:yyyy-MM-dd HH:mm:ss} - {threadMessage.Role,10}: ");
            foreach (MessageContent contentItem in threadMessage.ContentItems)
            {
                if (contentItem is MessageTextContent textItem)
                {
                    Console.Write(textItem.Text);
                    chatHistory.Messages.Add(textItem);
                }
                else if (contentItem is MessageImageFileContent imageFileItem)
                {
                    Console.Write($"<image from ID: {imageFileItem.FileId}");
                }
                Console.WriteLine();
            }
        }

        return Ok(chatHistory);
    }
}

public record ChatHistory
{
    public required string ThreadId { get; set; }
    public required List<MessageTextContent> Messages { get; set; }
}

public record ChatRequest
{
    public required string Message { get; init; }
    public required string ThreadId { get; init; }
    public required string UserEmail { get; init; }
}

public record CreateThreadRequest
{
    public required WorkflowStage CurrentWorkflowStage { get; init; }
}