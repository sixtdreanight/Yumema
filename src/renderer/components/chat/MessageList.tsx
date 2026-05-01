import { type RefObject, useEffect, useMemo, memo } from "react";
import { Users, Heart } from "lucide-react";
import type { ChatMessage } from "../../hooks/useChat";
import MessageBubble from "./MessageBubble";
import { Avatar, AvatarFallback } from "../ui/Avatar";

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

const MessageList = memo(function MessageList({
  messages, typing, composing, messagesEndRef, onRegenerate,
}: {
  messages: ChatMessage[];
  typing: boolean;
  composing: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onRegenerate?: () => void;
}) {
  const groups = useMemo(() => groupByDate(messages), [messages]);
  // 最后一条 AI 消息可以右键重新生成
  const lastAssistantIdx = messages.map(m => m.role).lastIndexOf("partner");

  useEffect(() => {
    const el = messagesEndRef.current;
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing, composing]);

  if (messages.length === 0) {
    return (
      <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }} className="bounce-in">
          <div style={{
            width: 64, height: 64, margin: "0 auto 16px",
            borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--vp-primary-soft)",
          }}>
            <Users size={24} style={{ color: "var(--primary)" }} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 500 }}>开始聊天吧</h3>
          <p style={{ fontSize: 12, marginTop: 8, color: "var(--muted-foreground)" }}>
            发送第一条消息，TA 会回复你
          </p>
        </div>
      </div>
    );
  }

  return (
    <div role="log" aria-live="polite" aria-label="聊天消息">
      {groups.map((group, gi) => (
        <div key={gi} style={{ marginBottom: 16 }}>
          {group.label && (
            <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
              <span style={{
                fontSize: 12,
                fontFamily: "var(--vp-font-mono)",
                color: "var(--muted-foreground)",
              }}>
                {group.label}
              </span>
            </div>
          )}
          {group.messages.map(({ msg, idx }, mi) => (
            <MessageBubble
              key={`${msg.time}-${idx}`}
              message={msg}
              showAvatar={mi === 0 || group.messages[mi - 1]?.msg.role !== msg.role}
              canRegenerate={idx === lastAssistantIdx && msg.role === "partner"}
              onRegenerate={onRegenerate}
            />
          ))}
        </div>
      ))}

      {(typing || composing) && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, paddingTop: 8 }}
          className="slide-up">
          <Avatar style={{ width: 32, height: 32, background: "var(--vp-primary-soft)" }}>
            <AvatarFallback className="bg-transparent">
              <Heart size={16} style={{ color: "var(--primary)" }} fill="currentColor" />
            </AvatarFallback>
          </Avatar>
          <div style={{
            padding: "12px 16px",
            background: "var(--vp-bubble-partner-glass)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: "16px 16px 16px 4px",
          }}>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)", marginRight: 8 }}>对方正在输入...</span>
            <span className="bounce-dot" />
            <span className="bounce-dot" style={{ marginLeft: 4 }} />
            <span className="bounce-dot" style={{ marginLeft: 4 }} />
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
});

export default MessageList;
