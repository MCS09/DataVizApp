import { JSX } from "react";

export type ChatBubbleParam = {
  message: string | JSX.Element;
  isStart: boolean;
};

function BubbleAvatar({ isAssistant }: { isAssistant: boolean }) {
  if (isAssistant) {
    return (
      <div className="relative flex-shrink-0">
        {/* Animated gradient ring */}
        <div className="absolute -inset-1 animate-pulse rounded-full bg-gradient-to-r from-purple-500 to-blue-500 opacity-30 blur"></div>
        
        {/* Avatar container */}
        <div className="relative h-10 w-10 overflow-hidden rounded-full bg-gradient-to-br from-purple-100 to-blue-100 p-0.5 shadow-lg">
          <div className="h-full w-full overflow-hidden rounded-full bg-white">
            <img 
              alt="AI Assistant" 
              src="/assistantAvatar.png" 
              className="h-full w-full object-cover" 
            />
          </div>
        </div>
        
        {/* Active indicator */}
        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500 shadow-sm"></div>
      </div>
    );
  }
  
  // User avatar
  return (
    <div className="relative flex-shrink-0">
      <div className="h-10 w-10 overflow-hidden rounded-full bg-gradient-to-br from-slate-200 to-slate-300 shadow-md">
        <div className="flex h-full w-full items-center justify-center">
          <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function ChatBubble({ message, isStart }: ChatBubbleParam) {
  return (
    <div className={`flex gap-3 ${isStart ? "items-start" : "flex-row-reverse items-start"} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
      <BubbleAvatar isAssistant={isStart} />
      
      <div className={`group relative max-w-[75%] ${isStart ? "" : "flex flex-col items-end"}`}>
        {/* Message bubble */}
        <div
          className={`relative overflow-hidden rounded-2xl px-4 py-3 shadow-md transition-all hover:shadow-lg ${
            isStart
              ? "rounded-tl-sm bg-gradient-to-br from-white to-slate-50 text-slate-800 border border-slate-200"
              : "rounded-tr-sm bg-gradient-to-br from-purple-600 to-blue-600 text-white"
          }`}
        >
          {/* Decorative element for AI messages */}
          {isStart && (
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 opacity-30 blur-xl"></div>
          )}
          
          {/* Message content */}
          <div className="relative text-sm leading-relaxed">
            {message}
          </div>
          
          {/* Shine effect on hover */}
          <div className={`absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 ${
            isStart ? "bg-gradient-to-r from-transparent via-white/20 to-transparent" : "bg-gradient-to-r from-transparent via-white/10 to-transparent"
          }`}></div>
        </div>
        
        {/* Timestamp (optional - you can add actual timestamp data) */}
        <div className={`mt-1 px-2 text-xs text-slate-400 opacity-0 transition-opacity group-hover:opacity-100`}>
          {isStart ? "AI Assistant" : "You"}
        </div>
      </div>
    </div>
  );
}