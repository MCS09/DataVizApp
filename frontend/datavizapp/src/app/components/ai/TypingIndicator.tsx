export function TypingIndicator() {
  return (
    <div className="chat chat-start">
      <div className="chat-image avatar">
        <div className="w-10 rounded-full">
          <img alt="Assistant" src="/assistantAvatar.png" />
        </div>
      </div>
      <div className="chat-bubble flex items-center gap-2">
        {/* Three animated dots */}
        <span className="h-2 w-2 animate-bounce rounded-full bg-current opacity-70 [animation-delay:-0.3s]"></span>
        <span className="h-2 w-2 animate-bounce rounded-full bg-current opacity-70 [animation-delay:-0.15s]"></span>
        <span className="h-2 w-2 animate-bounce rounded-full bg-current opacity-70"></span>
      </div>
    </div>
  );
}