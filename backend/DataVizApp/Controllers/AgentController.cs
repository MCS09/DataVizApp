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


    [HttpGet("getChatHistoryById")]
    public async Task<IActionResult> GetChatHistoryById([FromQuery] ChatHistoryByIdRequest request)
    {
        List<ChatMessageDto> messageDtos = await _agentService.GetChatHistoryByIdAsync(request.ThreadId);
        return Ok(new { messageDtos });
    }

    public record PromptAgentRequest(string ThreadId, AgentType AgentId, string Text);


    [HttpPost("prompt")]
    public async Task<IActionResult> PromptAgent([FromBody] PromptAgentRequest promptAgentRequest)
    {
        string agentId = _agentService.GetAgentIdByKey(promptAgentRequest.AgentId);
        ChatMessageDto chatMessageDto = new("user", promptAgentRequest.Text);
        try
        {
            // Send the prompt to the agent and run it
            await _agentService.SendMessageAndRunAgentAsync(
                promptAgentRequest.ThreadId,
                agentId,
                chatMessageDto
            );

            return Ok("Message sent and agent run initiated successfully.");
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }
}

public record ChatHistoryByIdRequest(string ThreadId);

public record Prompt(
    string ThreadId,
    string AgentId,
    string Message
);