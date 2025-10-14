"use client";
/* eslint-disable  @typescript-eslint/no-explicit-any */
import { ChatBubble, ChatBubbleParam } from "@/app/components/ai/ChatBubble";
import Button from "@/app/components/input/Button";
import { AGENT_ENUM_BY_ROUTE, ROUTES, WORKFLOW_STAGES_NAMES_BY_ROUTE } from "@/constants/routes";
import { fetchData, safeJsonParse } from "@/lib/api";
import useStore from "@/lib/store";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TypingIndicator } from "@/app/components/ai/TypingIndicator";


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
const promptAgent = async (reqBody : {threadId: string, agentId: number, text: string}) => 

    await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/AgentChat/prompt`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reqBody),
      }
    );
  



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
const SUGGESTION_PROMPTS_BY_ROUTE: { [key: string]: string[] } = {
  [ROUTES.datasetProfilingPage]: [
    "Summarize each column's role",
    "Suggest better column names",
    "Check column data types",
    "Find possible primary keys",
  ],
  [ROUTES.datasetCleaningPage]: [
    "Suggest a cleaning operation for this column",
    "What does the summary statistics tell me about this column?"
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
  const { sharedState, updateState } = useStore();
  const [datasetId, setDatasetId] = useState<number>();
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [suggestionPrompts, setSuggestionPrompts] = useState<string[]>([]);

  const resetChat = async ({ datasetId, workflowStageName }: {
  datasetId: number;
  workflowStageName: string;
  }) =>{
    await fetchData(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/resetChat?DatasetId=${datasetId}&WorkflowStageName=${workflowStageName}`
    );
    setIsLoading(true);
    setThreadId("");
    setChatHistory([]);
    if (!datasetId) return;
    (async () => {
      const workflowStageName = getWorkflowStageName(pathname);
      const res = await getThreadId({ datasetId, workflowStageName })
      setThreadId(res);
    })();

  }

  useEffect(() => {
    setSuggestionPrompts(SUGGESTION_PROMPTS_BY_ROUTE[pathname] || []);
  }, [pathname]);

  const handleSuggestionClick = (suggestion: string) => {
    // Set the prompt to be sent to the AI
    setPrompt(suggestion);
  };

  // load datasetId (From session store)
  useEffect(() => {
    (async () => {
      const stored = sessionStorage.getItem("sessionFileData");
      if (stored) {
        const parsed = JSON.parse(stored);
        setDatasetId(parsed.datasetId);
      }
    })();
  }, [pathname]);

  // initial load
  useEffect(() => {
    if (!datasetId) return;
    resetThread();
  }, [datasetId]);

  // initial load
  useEffect(() => {
    if (!threadId) return;
    loadChatUI();
  }, [threadId]);

  const resetThread = async () => {
    setIsLoading(true);
    setThreadId("");
    setChatHistory([]);
    if (!datasetId) return;
    (async () => {
      const workflowStageName = getWorkflowStageName(pathname);
      const res = await getThreadId({ datasetId, workflowStageName })
      setThreadId(res);
    })();


  }

  useEffect(() => {
    // Reset chat and thread state when pathname changes before fetching new thread
    if (datasetId) {
      resetThread();
    }
  }, [datasetId, pathname]);

  const loadChatUI = async () => {
    if (!threadId){
      console.warn("Thread Id is not yet loaded");
      return;
    }

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
      setIsLoading(false);
    } catch (err) {
      console.error("Failed to load chat history:", err);
      setIsLoading(false);
    }
  };


  useEffect(() => {
    if (!threadId || !sentPrompt) return;
    const executePrompt = async () => {
      const agentId = getAgentIdByPage(pathname);

      if ((agentId!= -1) && sentPrompt){
        const engineeredPrompt: UserPrompt = {
          workingData: sharedState.aiContext,
          prompt: sentPrompt
        };
        const res = await promptAgent({threadId, agentId, text: JSON.stringify(engineeredPrompt)})
        if (!res.ok){
          setChatHistory([...chatHistory.slice(0, -1), {message: "Agent not responding. Please try again or restart chat.", isStart: true}]);
        }
        else{
          await loadChatUI();
        }

      }
      setSentPrompt("");
    }

    executePrompt();
    
  }, [pathname, sentPrompt, threadId])

  useEffect(() => {
    if (chatContainerRef.current) {
      setTimeout(() => {
        chatContainerRef.current?.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: "smooth"
        });
      }, 100);
    }
  }, [chatHistory]);


  return (
    <div className="flex flex-col min-h-[600px]">
      <div className="flex flex-1">
        <div
          style={{ width: isChatCollapsed ? "40px" : "30%", backgroundColor: "lightgray", transition: "width 0.3s ease" }}
          className="h-[600px] flex flex-col"
        >
          {/* Toggle and Reset buttons at the top */}
          <div className="flex flex-row justify-end">
            {!sentPrompt && !isLoading && <button
              className="btn btn-xs m-1 self-end"
              onClick={async () => {
                if (!datasetId) return;
                const workflowStageName = getWorkflowStageName(pathname);
                resetChat({ datasetId, workflowStageName });
              }}
              aria-label="Reset chat"
              title="Reset chat"
            >
              Reset
            </button>
            }
            <button
              className="btn btn-xs m-1 self-end"
              onClick={() => setIsChatCollapsed(!isChatCollapsed)}
              aria-label={isChatCollapsed ? "Expand chat panel" : "Collapse chat panel"}
              title={isChatCollapsed ? "Expand chat panel" : "Collapse chat panel"}
            >
              {isChatCollapsed ? "▶" : "◀"}
            </button>
          </div>

          {/* Chat content area */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 bg-base-200 rounded-lg"
            style={{
              opacity: isChatCollapsed ? 0 : 1,
              pointerEvents: isChatCollapsed ? "none" : "auto",
              transition: "opacity 0.3s ease",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <span className="loading loading-spinner loading-lg text-white"></span>
              </div>
            ) : chatHistory.length === 0 && suggestionPrompts.length > 0 ? (
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
            ) : (
              <>
                {chatHistory.map((msg, idx) => (
                  <ChatBubble key={idx} {...msg} />
                ))}
              </>
            )}
          </div>

          {/* Input bar at the bottom */}
          {!isChatCollapsed && (
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
                      { message: <TypingIndicator />, role: "agent", isStart: true },
                    ]);
                    // Scroll to bottom after new message is added
                    if (chatContainerRef.current) {
                      setTimeout(() => {
                        chatContainerRef.current!.scrollTop = chatContainerRef.current!.scrollHeight;
                      }, 100);
                    }
                    setPrompt("");
                  }
                }}
              />
              }
            </div>
          )}
          {isChatCollapsed && (
            <div
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                flexGrow: 1,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontWeight: "bold",
                fontSize: "14px",
                color: "#333",
                userSelect: "none",
                height: "100%",
              }}
            >
              Chat Minimized
            </div>
          )}
        </div>
        <div
          className="ag-theme-alpine flex-1"
          style={{ height: "600px", width: isChatCollapsed ? `calc(100% - 40px)` : "70%" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}