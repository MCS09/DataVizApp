import { NextRequest, NextResponse } from "next/server";
import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";


export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages } = body; // [{ role: "user", content: "..." }]
  let threadId = body.threadId || null; // Use existing thread ID or create a new one

  const asstId = body.asstId || null;
  const userMessage = messages[messages.length - 1]?.content;
  try {
    const project = new AIProjectClient(
      "https://DataVizApp.services.ai.azure.com/api/projects/DataVizApp-Agents",
      new DefaultAzureCredential()
    );

    // Create a thread if we don't have one yet
    if (!threadId) {
      const thread = await project.agents.threads.create();
      threadId = thread.id;
    }

    // Send the latest user message
    await project.agents.messages.create(threadId, "user", userMessage);

    // Get agent
    const agent = await project.agents.getAgent(asstId);

    // Run agent
    let run = await project.agents.runs.create(threadId, agent.id);
    while (run.status === "queued" || run.status === "in_progress") {
      await new Promise((resolve) => setTimeout(resolve, 800));
      run = await project.agents.runs.get(threadId, run.id);
    }

    // Retrieve all messages
    const fetchedMessages: { role: "user" | "assistant"; content: string }[] = [];
    const iterator = project.agents.messages.list(threadId, { order: "asc" });
    for await (const m of iterator) {
      const textContent = m.content.find((c) => c.type === "text" && "text" in c);
      if (textContent) {
        fetchedMessages.push({
          role: m.role === "user" ? "user" : "assistant",
          content: textContent.text.value,
        });
      }
    }

    const lastAssistantMsg = fetchedMessages.filter((m) => m.role === "assistant").pop();

    return NextResponse.json({
      role: "assistant",
      content: lastAssistantMsg?.content || "",
    });
  } catch (error) {
    console.error("Azure Agent Error:", error);
    return NextResponse.json({ error: "Agent call failed" }, { status: 500 });
  }
}