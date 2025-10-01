"use client";

import { ChatBubble, ChatBubbleParam } from "@/app/components/ai/ChatBubble";
import { TypingIndicator } from "@/app/components/ai/TypingIndicator";
import { AGENT_ENUM_BY_ROUTE, ROUTES, WORKFLOW_STAGES_NAMES_BY_ROUTE } from "@/constants/routes";
import { fetchData, safeJsonParse } from "@/lib/api";
import useStore from "@/lib/store";
import { usePathname } from "next/navigation";
import { JSX, useEffect, useRef, useState } from "react";

type ChatHistoryRequestDto = {
  role: string;
  text: string;
};

export type AIResponse<T> = {
  updatedData: T;
  textResponse: string;
};

export type UserPrompt = {
  workingData: string;
  prompt: string;
};

// Get thread id
const getThreadId = async ({ datasetId, workflowStageName }: {
  datasetId: number;
  workflowStageName: string;
}) => {
  const res = await fetchData<{ threadId: string }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/getThreadId?DatasetId=${datasetId}&WorkflowStageName=${workflowStageName}`
  );
  return res.threadId;
};

/**
 * Retrieves the entire chat history for a given thread ID.
 */
const getChatHistory = async (threadId: string) => {
  const res = await fetchData<{ messageDtos: ChatHistoryRequestDto[] }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/AgentChat/getChatHistoryById?ThreadId=${threadId}`
  );
  return res.messageDtos;
};

/**
 * Sends a user's prompt to the backend agent for processing.
 */
const promptAgent = async (reqBody: { threadId: string; agentId: number; text: string }) => {
  try {
    await fetchData<{ message: string }>(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/AgentChat/prompt`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody),
      }
    );
  } catch (e) {
    console.warn(`Error in promptAgent: ${e}`);
    return false;
  }
  return true;
};

/**
 * Maps the current URL path to a specific workflow stage name required by the backend.
 */
const getWorkflowStageName = (route: string) => {
  switch (route) {
    case ROUTES.datasetCleaningPage:
      return WORKFLOW_STAGES_NAMES_BY_ROUTE.datasetCleaningPage;
    case ROUTES.datasetProfilingPage:
      return WORKFLOW_STAGES_NAMES_BY_ROUTE.datasetProfilingPage;
    case ROUTES.datasetVisualizationPage:
      return WORKFLOW_STAGES_NAMES_BY_ROUTE.datasetVisualizationPage;
    default:
      return "";
  }
};

/**
 * Maps the current URL path to a specific agent ID required by the backend.
 */
const getAgentIdByPage = (route: string): number => {
  switch (route) {
    case ROUTES.datasetCleaningPage:
      return AGENT_ENUM_BY_ROUTE.datasetCleaningPage;
    case ROUTES.datasetProfilingPage:
      return AGENT_ENUM_BY_ROUTE.datasetProfilingPage;
    case ROUTES.datasetVisualizationPage:
      return AGENT_ENUM_BY_ROUTE.datasetVisualizationPage;
    default:
      return -1;
  }
};

/**
 * A dictionary of suggested prompts that are displayed based on the current page/route.
 */
const SUGGESTION_PROMPTS_BY_ROUTE: { [key: string]: string[] } = {
  [ROUTES.datasetProfilingPage]: [
    "Summarize each column's role",
    "Suggest better column names",
    "Check column data types",
    "Find possible primary keys",
  ],
  [ROUTES.datasetCleaningPage]: [],
  [ROUTES.datasetVisualizationPage]: ["Make a chart for me"],
};

export default function DataPagesLayout({ children }: { children: React.ReactNode }) {
  const [chatHistory, setChatHistory] = useState<ChatBubbleParam[]>([]); // Stores the messages displayed in the chat window.
  const [prompt, setPrompt] = useState(""); // Manages the current text in the user input field.
  const [threadId, setThreadId] = useState(""); // Stores the active chat thread ID from the backend.
  const [isTyping, setIsTyping] = useState(false); // Tracks if the AI is currently "typing" a response (loading state).
  const [datasetId, setDatasetId] = useState<number>(); // The ID of the dataset being worked on.
  const [dynamicContent, setDynamicContent] = useState<JSX.Element | null>(null); // Holds the JSX for either suggestions or chat history.

  const pathname = usePathname(); // Gets the current URL path.
  const chatContainerRef = useRef<HTMLDivElement>(null); // Ref for the chat container div to enable auto-scrolling.
  const { sharedState, updateState } = useStore(); // Accessing the global Zustand store.

  // Gets the appropriate suggestion prompts for the current page.
  const suggestionPrompts = SUGGESTION_PROMPTS_BY_ROUTE[pathname] || [];

  /**
   * Fetches the latest chat history, processes it into a displayable format,
   * updates the component's state, and syncs context to the global store.
   */
  const refreshChatHistory = async (threadIdToFetch: string) => {
    try {
      const history = await getChatHistory(threadIdToFetch);
      if (history.length > 0) {
        // Map backend data to the format needed by the ChatBubble component
        setChatHistory(
          history.map((item) => {
            const role = item.role.toLowerCase();
            let messageText = item.text;
            // The AI and User message formats might be complex JSON strings, so we parse them.
            if (role === "assistant") {
              const aiResponse = safeJsonParse<AIResponse<string>>(item.text);
              if (aiResponse && aiResponse.textResponse) {
                messageText = aiResponse.textResponse;
              }
            } else if (role === "user") {
              const userPrompt = safeJsonParse<UserPrompt>(item.text);
              if (userPrompt && userPrompt.prompt) {
                messageText = userPrompt.prompt;
              }
            }
            return { message: messageText, isStart: role === "assistant" };
          })
        );
        // Update global state with the context from the last AI message
        const last = history[history.length - 1];
        if (last && last.role === "assistant" && last.text) {
          const res = safeJsonParse<AIResponse<string>>(last.text);
          if (res?.updatedData) {
            updateState({ aiResponseContext: last.text });
          }
        }
      } else {
        // If there's no history, ensure the chat window is clear.
        setChatHistory([]);
      }
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
    }
  };

  /**
   * Handles the entire process of sending a prompt to the AI.
   */
  const handleSendPrompt = async (promptText: string) => {
    // Prevent sending if the prompt is empty, AI is already typing, or thread is not ready.
    if (!promptText.trim() || isTyping || !threadId) return;

    // Immediately add the user's message to the chat history.
    const userMessage: ChatBubbleParam = { message: promptText, isStart: false };
    setChatHistory((prev) => [...prev, userMessage]);
    setPrompt(""); // Clear the input field.

    // Set Loading State: Show the typing indicator.
    setIsTyping(true);

    // Prepare and send the request to the backend.
    const agentId = getAgentIdByPage(pathname);
    const engineeredPrompt: UserPrompt = {
      workingData: sharedState.aiContext,
      prompt: promptText,
    };
    await promptAgent({
      threadId,
      agentId,
      text: JSON.stringify(engineeredPrompt),
    });

    // Fetch the updated history which now includes the AI's response.
    await refreshChatHistory(threadId);

    // Unset Loading State: Hide the typing indicator.
    setIsTyping(false);
  };

  /**
   * Populates the input field when a user clicks a suggestion button.
   */
  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
  };

  // Effect to load the datasetId from session storage on component mount.
  useEffect(() => {
    const stored = sessionStorage.getItem("sessionFileData");
    if (stored) {
      const parsed = JSON.parse(stored);
      setDatasetId(parsed.datasetId);
    }
  }, []);

  // Effect to fetch the threadId once the datasetId is available.
  useEffect(() => {
    if (!datasetId) return;
    (async () => {
      const workflowStageName = getWorkflowStageName(pathname);
      const res = await getThreadId({ datasetId, workflowStageName });
      setThreadId(res);
    })();
  }, [datasetId, pathname]);

  // Effect to fetch the initial chat history once the threadId is set.
  useEffect(() => {
    if (threadId) {
      refreshChatHistory(threadId);
    }
  }, [threadId]);

  // Effect to scroll the chat container to the bottom whenever messages or the typing indicator appear.
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isTyping]);

  // Effect to determine what to display in the chat area: suggestions or the chat history.
  useEffect(() => {
    // If the chat is empty and the AI is not typing, show suggestions.
    if (chatHistory.length === 0 && !isTyping && suggestionPrompts.length > 0) {
      setDynamicContent(
        <div className="flex flex-col items-center justify-center h-full text-center">
          <h2 className="text-xl font-semibold mb-2">AI Assistant</h2>
          <p className="text-sm text-base-content/70 mb-4">Select a suggestion below to get started.</p>
          <div className="space-y-2 w-full max-w-sm">
            {suggestionPrompts.map((prompt, index) => (
              <button
                key={index}
                className="btn btn-outline rounded-full w-full justify-start text-left normal-case font-normal"
                onClick={() => handleSuggestionClick(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      );
    } else {
      // Otherwise, show the chat history and the typing indicator if active.
      setDynamicContent(
        <>
          {chatHistory.map((msg, idx) => (
            <ChatBubble key={idx} {...msg} />
          ))}
          {isTyping && <TypingIndicator />}
        </>
      );
    }
  }, [chatHistory, isTyping, suggestionPrompts, pathname]);

  return (
    <div className="flex gap-4" style={{ height: "calc(100vh - 12rem)" }}>
      {/* Left Panel: Main content area for pages */}
      <div className="w-3/5 flex flex-col bg-base-100 rounded-lg shadow">{children}</div>

      {/* Right Panel: AI Chat Interface */}
      <div className="w-2/5 flex flex-col bg-base-200 rounded-lg shadow-inner">
        {/* Chat history area */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4">
          {dynamicContent}
        </div>

        {/* Input bar at the bottom */}
        <div className="p-4 bg-base-200 border-t border-base-300">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Type your message..."
              className="input input-bordered w-full"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSendPrompt(prompt);
                }
              }}
              disabled={isTyping} // Disable input while AI is responding
            />
            <button
              className="btn bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 rounded-xl transition-colors"
              disabled={isTyping || !prompt.trim()} // Disable button while AI is responding or if input is empty
              onClick={() => handleSendPrompt(prompt)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}