import { type RefObject, useEffect, useRef, useMemo } from "react";
import { Users, Heart } from "lucide-react";
import type { ChatMessage } from "../../hooks/useChat";
import MessageBubble from "./MessageBubble";
import { Avatar, AvatarFallback } from "../ui/avatar";

function formatDateLabel(ts: string): string | null {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (target.getTime() === today.getTime()) return "今天";
  if (target.getTime() === yesterday.getTime()) return "昨天";
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

interface GroupedMessages {
  label: string | null;
  messages: { msg: ChatMessage; idx: number }[];
}

function groupByDate(messages: ChatMessage[]): GroupedMessages[] {
  const groups: GroupedMessages[] = [];
  let lastLabel: string | null = null;
  messages.forEach((msg, idx) => {
    const label = formatDateLabel(msg.time);
    if (label !== lastLabel) {
      groups.push({ label, messages: [] });
      lastLabel = label;
    }
    groups[groups.length - 1].messages.push({ msg, idx });
  });
  return groups;
}

export default function MessageList({
  messages, typing, messagesEndRef,
}: {
  messages: ChatMessage[];
  typing: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => groupByDate(messages), [messages]);

  useEffect(() => {
    const el = messagesEndRef.current;
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: "var(--vp-bg-chat)" }}>
        <div className="text-center bounce-in">
          <div
            className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "var(--vp-primary-soft)" }}
          >
            <Users className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-base font-medium">开始聊天吧</h3>
          <p className="text-sm mt-1.5 text-muted-foreground">
            发送第一条消息，TA 会回复你
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto" style={{ background: "var(--vp-bg-chat)" }}>
      <div className="max-w-2xl mx-auto px-5 py-4 space-y-0.5">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <div className="flex items-center justify-center py-3">
                <span
                  className="text-[11px] px-3 py-0.5 rounded-full font-mono"
                  style={{
                    background: "var(--vp-surface)",
                    color: "var(--muted-foreground)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {group.label}
                </span>
              </div>
            )}
            {group.messages.map(({ msg, idx }, mi) => (
              <MessageBubble
                key={idx}
                message={msg}
                showAvatar={mi === 0 || group.messages[mi - 1]?.msg.role !== msg.role}
              />
            ))}
          </div>
        ))}

        {typing && (
          <div className="flex items-start gap-2.5 pt-2 slide-up">
            <Avatar
              className="w-7 h-7"
              style={{ background: "var(--vp-primary-soft)" }}
            >
              <AvatarFallback className="bg-transparent">
                <Heart className="w-3.5 h-3.5 text-primary" fill="currentColor" />
              </AvatarFallback>
            </Avatar>
            <div
              className="px-4 py-3 rounded-2xl"
              style={{
                background: "var(--vp-bubble-partner)",
                border: "1px solid var(--border)",
                borderRadius: "16px 16px 16px 4px",
              }}
            >
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
