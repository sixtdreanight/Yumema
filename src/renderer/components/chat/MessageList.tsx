import { type RefObject, useEffect, useRef } from "react";
import type { ChatMessage } from "../../hooks/useChat";
import MessageBubble from "./MessageBubble";
import Avatar from "../ui/Avatar";

export default function MessageList({
  messages, typing, messagesEndRef,
}: {
  messages: ChatMessage[];
  typing: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = messagesEndRef.current;
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center scale-in">
          <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "linear-gradient(135deg, var(--vp-primary-soft), #ede9fe)" }}>
            <span className="text-3xl">💬</span>
          </div>
          <h3 className="text-base font-semibold text-zinc-700 dark:text-zinc-200">开始聊天吧</h3>
          <p className="text-sm mt-1.5 text-zinc-400 dark:text-zinc-500">
            发送第一条消息，TA 会回复你
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-5 py-4 space-y-0.5">
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            message={msg}
            showAvatar={i === 0 || messages[i - 1]?.role !== msg.role}
          />
        ))}

        {typing && (
          <div className="flex items-start gap-3 pt-2 slide-up">
            <Avatar emoji="💕" size="sm" />
            <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 shadow-sm">
              <span className="bounce-dot" />
              <span className="bounce-dot" style={{ marginLeft: 4 }} />
              <span className="bounce-dot" style={{ marginLeft: 4 }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
