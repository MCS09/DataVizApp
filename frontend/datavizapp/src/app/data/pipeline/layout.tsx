"use client";

import { ChatBubble, ChatBubbleParam } from "@/app/components/ai/ChatBubble";
import { AGENT_ENUM_BY_ROUTE, ROUTES, WORKFLOW_STAGES_NAMES_BY_ROUTE } from "@/constants/routes";
import { fetchData } from "@/lib/api";
import useStore from "@/lib/store";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type ChatHistoryRequestDto = {
  role: string;
  text: string;
};

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

export default function DataPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [chatHistory, setChatHistory] = useState<ChatBubbleParam[]>([]);
  const [datasetId, setDatasetId] = useState(9);
  const [prompt, setPrompt] = useState("");
  const [sentPrompt, setSentPrompt] = useState("");
  const [threadId, setThreadId] = useState("");
  const pathname = usePathname();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { sharedState, updateState } = useStore();

  useEffect(() => {
    (async () => {
      const workflowStageName = getWorkflowStageName(pathname);
      const res = await getThreadId({ datasetId, workflowStageName })
      setThreadId(res);
    })();
  }, [datasetId, pathname]);

  useEffect(() => {
    const fetchChatHistory = async () => {
      const stored = sessionStorage.getItem("datasetId");
      if (!stored) {
        console.warn("Missing datasetId");
        return;
      }
      // const datasetId = JSON.parse(stored)["datasetId"];

      setDatasetId(9)

      if (!datasetId) {
        console.warn("Missing datasetId");
        return;
      }

      if (!threadId){
        console.warn("Thread Id is not yet loaded");
        return;
      }

      if (chatHistory.length != 0 ) return;

      try {
        const history = await getChatHistory(threadId);
        if (history) {
          setChatHistory(
            history.map((item) => ({
              message: item.text,
              isStart: item.role.toLowerCase() == "assistant", // Adjust based on ChatBubbleParam type
            }))
          );
          const last = history[history.length - 1];
          if(last && last.role == "assistant" && last.text){ // redundant but safe check
            // extract updatedData
            const res = JSON.parse(last.text);
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
    const executePrompt = async () => {
      const agentId = getAgentIdByPage(pathname);

      if ((agentId!= -1) && sentPrompt){
        const engineeredPrompt = `{"workingData": ${sharedState.aiContext}, "prompt": ${sentPrompt}}`
        const success = await promptAgent({threadId, agentId, text: engineeredPrompt})
        if (success) setSentPrompt("");

      }

      setChatHistory([]);
      setSentPrompt("");
    }

    executePrompt();
    
  }, [pathname, sentPrompt])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

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
          {chatHistory.map((msg, idx) => (
            <ChatBubble key={idx} {...msg} />
          ))}
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
          <button
            className="btn w-2/12"
            onClick={async () => {
              if (prompt.trim()) {
                setSentPrompt(prompt);
                setChatHistory((prev) => [
                  ...prev,
                  { message: prompt, role: "user", isStart: false },
                ]);
                setPrompt("");
              }
            }}
          >
            Send
          </button>
          }
        </div>
      </div>
    </div>
  );
}