"use client";
/* eslint-disable  @typescript-eslint/no-explicit-any */
import { ChatBubble, ChatBubbleParam } from "@/app/components/ai/ChatBubble";
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
        setChatHistory(
          history.map((item) => {
            const role = item.role.toLowerCase();
            let messageText = item.text;

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

            return {
              message: messageText,
              isStart: role === "assistant",
            };
          })
        );
        const last = history[history.length - 1];
        if(last && last.role == "assistant" && last.text){
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
    <div className="flex h-[600px] overflow-hidden">
      {/* Chat Sidebar */}
      <div
        className={`relative flex h-full flex-col bg-white shadow-2xl transition-all duration-300 ease-in-out ${
          isChatCollapsed ? "w-12" : "w-80"
        }`}
      >
        {/* Decorative gradient border */}
        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-purple-500 via-blue-500 to-purple-500"></div>

        {/* Header */}
        <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-r from-purple-600 to-blue-600 px-3 py-2">
          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl"></div>
          <div className="relative flex items-center justify-between">
            {!isChatCollapsed && (
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-white/20 p-1.5 backdrop-blur-sm">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">AI Assistant</h2>
                  <p className="text-xs text-purple-100">Always here to help</p>
                </div>
              </div>
            )}
            <div className="flex gap-1">
              {!sentPrompt && !isLoading && !isChatCollapsed && (
                <button
                  className="rounded-lg bg-white/20 p-1.5 text-white backdrop-blur-sm transition-all hover:bg-white/30 hover:scale-105"
                  onClick={async () => {
                    if (!datasetId) return;
                    const workflowStageName = getWorkflowStageName(pathname);
                    resetChat({ datasetId, workflowStageName });
                  }}
                  title="Reset chat"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
              <button
                className="rounded-lg bg-white/20 p-1.5 text-white backdrop-blur-sm transition-all hover:bg-white/30 hover:scale-105"
                onClick={() => setIsChatCollapsed(!isChatCollapsed)}
                title={isChatCollapsed ? "Expand" : "Collapse"}
              >
                <svg className={`h-3.5 w-3.5 transition-transform ${isChatCollapsed ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Chat Content */}
        {!isChatCollapsed ? (
          <>
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300"
            >
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-3 h-12 w-12 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
                    <p className="text-xs text-slate-600">Loading...</p>
                  </div>
                </div>
              ) : chatHistory.length === 0 && suggestionPrompts.length > 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-2 text-center">
                  <div className="mb-4 rounded-xl bg-gradient-to-br from-purple-100 to-blue-100 p-4">
                    <svg className="mx-auto h-10 w-10 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="mb-1 text-base font-bold text-slate-800">Get Started</h3>
                  <p className="mb-4 text-xs text-slate-600">
                    Try a suggestion or ask anything
                  </p>
                  <div className="w-full space-y-1.5">
                    {suggestionPrompts.map((promptText, index) => (
                      <button
                        key={index}
                        className="group w-full rounded-lg border-2 border-slate-200 bg-white p-2.5 text-left transition-all hover:border-purple-300 hover:bg-purple-50 hover:shadow-md"
                        onClick={() => handleSuggestionClick(promptText)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="rounded-md bg-purple-100 p-1.5 transition-colors group-hover:bg-purple-200">
                            <svg className="h-3 w-3 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <span className="flex-1 text-xs font-medium text-slate-700 group-hover:text-purple-900">
                            {promptText}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {chatHistory.map((msg, idx) => (
                    <ChatBubble key={idx} {...msg} />
                  ))}
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-slate-200 bg-white p-2">
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-3 py-2 pr-9 text-xs transition-all focus:border-purple-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-100"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !sentPrompt && prompt.trim()) {
                        setSentPrompt(prompt);
                        setChatHistory((prev) => [
                          ...prev,
                          { message: prompt, role: "user", isStart: false },
                          { message: <TypingIndicator />, role: "agent", isStart: true },
                        ]);
                        if (chatContainerRef.current) {
                          setTimeout(() => {
                            chatContainerRef.current!.scrollTop = chatContainerRef.current!.scrollHeight;
                          }, 100);
                        }
                        setPrompt("");
                      }
                    }}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                </div>
                {!sentPrompt && (
                  <button
                    className="rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-3 py-2 font-semibold text-white shadow-md transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
                    onClick={async () => {
                      if (prompt.trim()) {
                        setSentPrompt(prompt);
                        setChatHistory((prev) => [
                          ...prev,
                          { message: prompt, role: "user", isStart: false },
                          { message: <TypingIndicator />, role: "agent", isStart: true },
                        ]);
                        if (chatContainerRef.current) {
                          setTimeout(() => {
                            chatContainerRef.current!.scrollTop = chatContainerRef.current!.scrollHeight;
                          }, 100);
                        }
                        setPrompt("");
                      }
                    }}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-purple-400 to-blue-400 opacity-20 blur-xl"></div>
              <p className="relative rotate-180 whitespace-nowrap text-xs font-bold text-slate-600" style={{ writingMode: "vertical-rl" }}>
                AI Chat
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 h-full overflow-auto bg-white">
        {children}
      </div>
    </div>
  );
}