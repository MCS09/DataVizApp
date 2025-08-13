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
public class AgentChatController(AgentService agentService, DatasetService datasetService) : ControllerBase
{
    private readonly AgentService _agentService = agentService;

    private readonly DatasetService _datasetService = datasetService;


    [HttpPost("getChatHistory")]
    public async Task<IActionResult> GetChatHistory([FromBody] ChatHistoryRequest request)
    {

        // Get Thread
        WorkflowStage? workflowStage = await _datasetService.GetWorkflowStageByDatasetIdAsync(request.DatasetId, request.WorkflowStageName);
        if (workflowStage == null)
        {
            return NotFound("Workflow stage not found.");
        }


        Uri endpointUri = _agentService.GetServiceUrl();

        AIProjectClient projectClient = new(endpointUri, new DefaultAzureCredential());

        PersistentAgentsClient agentsClient = projectClient.GetPersistentAgentsClient();

        Pageable<PersistentThreadMessage> messages = agentsClient.Messages.GetMessages(
            workflowStage.AzureAgentThreadId, order: ListSortOrder.Ascending);

        // Flatten message content items to a list of MessageTextContent
        List<MessageTextContent> messageTextContents = [.. messages
            .SelectMany(m => m.ContentItems)
            .OfType<MessageTextContent>()];

        List<ChatMessageDto> messageDtos = [.. messages
        .Select(m => new ChatMessageDto(
            m.Role.ToString(),
            string.Join("\n", m.ContentItems.OfType<MessageTextContent>().Select(c => c.Text))
        ))];

        return Ok(messageDtos);
    }
}

public record ChatMessageDto(string Role, string Text);

public record ChatHistoryRequest
{
    public required string WorkflowStageName { get; init; }
    public required int DatasetId { get; init; }
}