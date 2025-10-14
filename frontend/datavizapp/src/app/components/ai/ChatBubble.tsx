import { JSX } from "react";

export type ChatBubbleParam = {
  message: string | JSX.Element;
  isStart: boolean;
};

function BubbleAvatar({ isAssistant }: { isAssistant: boolean }) {
  if (isAssistant) {
    return (
      <div className="chat-image avatar">
        <div className="w-10 rounded-full">
          <img alt="Assistant" src="/assistantAvatar.png" className="w-10 rounded-full" />
        </div>
      </div>
    );
  }
  return null;
}

export function ChatBubble({ message, isStart }: ChatBubbleParam) {
  return (
    <div className={`chat ${isStart ? "chat-start" : "chat-end"}`}>
      <BubbleAvatar isAssistant={isStart} />
      <div className="chat-bubble">{message}</div>
    </div>
  );
}