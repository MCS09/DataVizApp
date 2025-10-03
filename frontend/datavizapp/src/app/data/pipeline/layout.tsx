"use client";

import { ChatBubble, ChatBubbleParam } from "@/app/components/ai/ChatBubble";
import Button from "@/app/components/input/Button";
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
  updatedData: T,
  textResponse: string
}

export type UserPrompt = {
  workingData: string,
  prompt: string
}

// Get thread id
const getThreadId = async ({ datasetId, workflowStageName }: {
  datasetId: number;
  workflowStageName: string;
}) =>{
  const res = await fetchData<{threadId: string}>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/getThreadId?DatasetId=${datasetId}&WorkflowStageName=${workflowStageName}`
  );
  return res.threadId;
}

const getChatHistory = async (threadId: string) => {
  const res = await fetchData<{messageDtos: ChatHistoryRequestDto[]}>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/AgentChat/getChatHistoryById?ThreadId=${threadId}`
  );
  return res.messageDtos;
}



// prompt agent
const promptAgent = async (reqBody : {threadId: string, agentId: number, text: string}) => {
  try{
    await fetchData<{message: string}>(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/AgentChat/prompt`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reqBody),
      }
    );
  }catch(e){
    console.warn(`Error in promptAgent: ${e}`);
    return false;
  }
  return true;
}


// Map to workflow stage
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
}

// NEW: Define prompts for each specific page/route
const CLEANING_AUTOSCAN_PROMPT = "Review the dataset provided in workingData and perform a data-quality risk scan across the current column. Respond with riskAnnotations (recordNumber, optional columnNumber, severity as 'high'|'medium'|'low', and reason) highlighting up to 100 of the riskiest records, and include a concise textResponse summary.";

const MAX_AUTOSCAN_SAMPLE = 200;

const buildWorkingDataPayload = (raw: string) => {
  if (!raw) {
    return raw;
  }

  const parsed = safeJsonParse<{ dataRecords?: Array<{ recordNumber: number; value: string }> }>(raw);
  if (parsed && Array.isArray(parsed.dataRecords)) {
    const truncatedRecords = parsed.dataRecords.slice(0, MAX_AUTOSCAN_SAMPLE);
    try {
      return JSON.stringify({
        ...parsed,
        dataRecords: truncatedRecords,
        __autoscan: {
          truncated: parsed.dataRecords.length > truncatedRecords.length,
          originalCount: parsed.dataRecords.length,
        },
      });
    } catch (error) {
      console.warn('Failed to build working data payload', error);
    }
  }

  return raw;
};

const SUGGESTION_PROMPTS_BY_ROUTE: { [key: string]: string[] } = {
  [ROUTES.datasetProfilingPage]: [
    "Summarize each column's role",
    "Suggest better column names",
    "Check column data types",
    "Find possible primary keys",
  ],
  [ROUTES.datasetCleaningPage]: [
    "Audit this column for nulls or duplicates and respond with riskAnnotations for high-risk cells.",
    "Summarize the most critical data-quality risks in the selected column and propose next steps.",
    "Flag values that may be inconsistent with the column's type or expected distribution.",
    "Explain how recent cleaning changes impacted overall data integrity."
  ],
  [ROUTES.datasetVisualizationPage]: [
    // TODO: Add prompts
    "Make a chart for me"
  ],
};

export default function DataPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [chatHistory, setChatHistory] = useState<ChatBubbleParam[]>([]);
  const [prompt, setPrompt] = useState("");
  const [sentPrompt, setSentPrompt] = useState("");
  const [threadId, setThreadId] = useState("");
  const pathname = usePathname();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const autoDetectionKeyRef = useRef<string | null>(null);
  const { sharedState, updateState } = useStore();
  const [datasetId, setDatasetId] = useState<number>();
  const [dynamicContent, setDynamicContent] = useState<JSX.Element | null>(null);

  // Get the prompts for the current route
  const suggestionPrompts = SUGGESTION_PROMPTS_BY_ROUTE[pathname] || [];

  const handleSuggestionClick = (suggestion: string) => {
    // Set the prompt to be sent to the AI
    setPrompt(suggestion);
  };

  // load datasetId (From session store)
  useEffect(() => {
    const stored = sessionStorage.getItem("sessionFileData");
    if (stored) {
      const parsed = JSON.parse(stored);
      setDatasetId(parsed.datasetId);
    }
  }, []);

  useEffect(() => {
    if (!datasetId) return;
    (async () => {
      const workflowStageName = getWorkflowStageName(pathname);
      const res = await getThreadId({ datasetId, workflowStageName })
      setThreadId(res);
    })();
  }, [datasetId, pathname]);

  useEffect(() => {
    autoDetectionKeyRef.current = null;
  }, [datasetId]);

  useEffect(() => {
    if (pathname !== ROUTES.datasetCleaningPage) {
      return;
    }
    if (!datasetId || !threadId) {
      return;
    }
    if (!sharedState.aiContext || sharedState.aiContext.trim().length === 0) {
      return;
    }
    if (sharedState.cleaningScanStatus !== 'idle') {
      return;
    }

    const agentId = getAgentIdByPage(pathname);
    if (agentId === -1) {
      return;
    }

    const key = `${datasetId}:${threadId}`;
    if (autoDetectionKeyRef.current === key) {
      return;
    }
    autoDetectionKeyRef.current = key;

    updateState({ cleaningScanStatus: 'running' });

    const runCleaningScan = async () => {
      const workingDataPayload = buildWorkingDataPayload(sharedState.aiContext);
      const engineeredPrompt: UserPrompt = {
        workingData: workingDataPayload,
        prompt: CLEANING_AUTOSCAN_PROMPT,
      };

      const success = await promptAgent({
        threadId,
        agentId,
        text: JSON.stringify(engineeredPrompt),
      });

      if (!success) {
        updateState({ cleaningScanStatus: 'failed' });
        autoDetectionKeyRef.current = null;
        return;
      }

      setChatHistory([]);
    };

    runCleaningScan().catch((error) => {
      console.error('Automated cleaning scan failed', error);
      updateState({ cleaningScanStatus: 'failed' });
      autoDetectionKeyRef.current = null;
    });
  }, [
    datasetId,
    pathname,
    sharedState.aiContext,
    sharedState.cleaningScanStatus,
    threadId,
    updateState,
    setChatHistory,
  ]);

  useEffect(() => {
    const fetchChatHistory = async () => {
      // const stored = sessionStorage.getItem("datasetId");
      // if (!stored) {
      //   console.warn("Missing datasetId");
      //   return;
      // }
      // const datasetId = JSON.parse(stored)["datasetId"];

      if (!threadId){
        console.warn("Thread Id is not yet loaded");
        return;
      }

      if (chatHistory.length != 0 ) return;

      try {
        const history = await getChatHistory(threadId);
        if (history.length != 0) {
          // Process the raw history to create a clean, displayable format
          setChatHistory(
            history.map((item) => {
              const role = item.role.toLowerCase();
              let messageText = item.text; // Default to raw text as a fallback

              if (role === "assistant") {
                const aiResponse = safeJsonParse<AIResponse<string>>(item.text);
                if (aiResponse && aiResponse.textResponse) {
                  messageText = aiResponse.textResponse;
                }
              } else if (role === "user") {
                // Also parse the user's message to extract the simple prompt
                const userPrompt = safeJsonParse<UserPrompt>(item.text);
                if (userPrompt && userPrompt.prompt) {
                  messageText = userPrompt.prompt;
                }
              }

              return {
                message: messageText,
                isStart: role === "assistant",
              };
            })
          );
          const last = history[history.length - 1];
          if(last && last.role == "assistant" && last.text){ // redundant but safe check
            // extract updatedData
            const res = safeJsonParse<AIResponse<string>>(last.text);
            if (res?.updatedData){
              updateState({aiResponseContext: last.text});
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch chat history:", error);
      }
    };

    fetchChatHistory();
  }, [threadId, chatHistory]);

  useEffect(() => {
    if (!threadId || !sentPrompt) return;
    const executePrompt = async () => {
      const agentId = getAgentIdByPage(pathname);

      if ((agentId!= -1) && sentPrompt){
        const workingDataPayload = buildWorkingDataPayload(sharedState.aiContext);
        const engineeredPrompt: UserPrompt = {
          workingData: workingDataPayload,
          prompt: sentPrompt
        };
        const success = await promptAgent({threadId, agentId, text: JSON.stringify(engineeredPrompt)})
        if (success) setSentPrompt("");

      }

      setChatHistory([]);
      setSentPrompt("");
    }

    executePrompt();
    
  }, [pathname, sentPrompt, threadId])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  useEffect(() => {
    if (chatHistory.length === 0 && suggestionPrompts.length > 0) {
      setDynamicContent(
        <div className="flex flex-col items-center justify-center h-full text-center">
          <h2 className="text-xl font-semibold mb-2">AI Assistant</h2>
          <p className="text-sm text-base-content/70 mb-4">
            Select a suggestion below to get started.
          </p>
          <div className="space-y-2 w-full max-w-sm">
            {suggestionPrompts.map((prompt, index) => (
              <button
                key={index}
                className="btn btn-outline w-full justify-start text-left normal-case font-normal"
                onClick={() => handleSuggestionClick(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      );
    } else {
      setDynamicContent(
        <>
          {chatHistory.map((msg, idx) => (
            <ChatBubble key={idx} {...msg} />
          ))}
        </>
      );
    }
  }, [chatHistory, suggestionPrompts, pathname]);

  return (
    <div className="flex">
      <div
        className="ag-theme-alpine"
        style={{ height: "600px", width: "60%" }}
      >
        {children}
      </div>
      <div
        style={{ width: "40%", backgroundColor: "lightgray" }}
        className="h-[600px] flex flex-col"
      >
        {/* Chat history area */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 bg-base-200 rounded-lg">

          {dynamicContent}
        </div>

        {/* Input bar at the bottom */}
        <div className="p-2 bg-base-100">
          <input
            type="text"
            placeholder="Type here"
            className="input w-10/12"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          {!sentPrompt && 
          <Button
            label="Send"
            className="btn w-2/12"
            action={async () => {
              if (prompt.trim()) {
                setSentPrompt(prompt);
                setChatHistory((prev) => [
                  ...prev,
                  { message: prompt, role: "user", isStart: false },
                ]);
                setPrompt("");
              }
            }}
          />
          }
        </div>
      </div>
    </div>
  );
}
