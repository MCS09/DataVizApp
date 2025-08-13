"use client";

import { useState } from "react";
import { DefaultChatTransport } from 'ai';
import { useChat } from '@ai-sdk/react';
import ReactMarkdown from "react-markdown";

export default function Page() {
  const [input, setInput] = useState("");
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '/api/chat';

  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { 
        // 'threadId': '',
        'agentId': "asst_vDwd3nza70lBM8w9KspdFA03"
      },
    }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ role: "user", parts: [{ type: "text", text: input }] });
    setInput("");
  };

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto space-y-4">
        {messages.map((m) => {
          const textPart = m.parts.find(
            (p) => p.type === "text"
          ) as { type: "text"; text: string } | undefined;

          return (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`p-3 rounded-lg max-w-[75%] ${
                  m.role === "user" ? "bg-blue-500 text-white" : "bg-gray-200"
                }`}
              >
                <ReactMarkdown>{textPart?.text || ""}</ReactMarkdown>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <div className="text-center text-gray-500">
            Start the conversation by sending a message!
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 border rounded-lg p-2"
        />
        <button type="submit" className="bg-blue-500 text-white px-4 rounded-lg">
          Send
        </button>
      </form>
    </div>
  );
}