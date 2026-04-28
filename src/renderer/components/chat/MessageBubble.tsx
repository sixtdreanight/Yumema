import type { ChatMessage } from "../../hooks/useChat";
import Avatar from "../ui/Avatar";

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

export default function MessageBubble({
  message, showAvatar,
}: {
  message: ChatMessage;
  showAvatar: boolean;
}) {
  const isPartner = message.role === "partner";

  return (
    <div
      className={`flex items-start gap-2.5 pt-2 pb-0.5 slide-in-${isPartner ? "left" : "right"} ${
        isPartner ? "" : "flex-row-reverse"
      }`}
    >
      <div className="shrink-0 mt-0.5">
        {showAvatar ? (
          <Avatar emoji={isPartner ? "💕" : "😊"} size="sm" gradient={isPartner} />
        ) : (
          <div className="w-7" />
        )}
      </div>

      <div className={`flex flex-col max-w-[70%] ${isPartner ? "" : "items-end"}`}>
        {/* Bubble */}
        <div
          className="relative px-3.5 py-2.5 text-sm leading-relaxed break-words"
          style={{
            background: isPartner ? "var(--vp-bubble-partner)" : "var(--vp-bubble-user)",
            color: isPartner ? "var(--vp-bubble-partner-text)" : "var(--vp-bubble-user-text)",
            borderRadius: isPartner
              ? showAvatar
                ? "4px 16px 16px 16px"
                : "16px"
              : showAvatar
                ? "16px 4px 16px 16px"
                : "16px",
            border: isPartner ? "1px solid var(--vp-border)" : "none",
            boxShadow: isPartner ? "var(--vp-shadow-xs)" : "0 2px 8px rgba(124, 58, 237, 0.25)",
          }}
        >
          {/* Partner bubble tail */}
          {isPartner && showAvatar && (
            <div
              className="absolute left-0 top-0"
              style={{
                width: 10,
                height: 10,
                background: "var(--vp-bubble-partner)",
                borderLeft: "1px solid var(--vp-border)",
                borderTop: "1px solid var(--vp-border)",
                borderTopLeftRadius: 4,
                transform: "translate(-3px, 0px) skewX(-8deg)",
                clipPath: "polygon(0 0, 100% 0, 100% 40%, 0 100%)",
              }}
            />
          )}
          {message.content}
        </div>

        {showAvatar && (
          <time className="text-[10px] mt-1 px-1 font-mono" style={{ color: "var(--vp-text-muted)" }}>
            {formatTime(message.time)}
          </time>
        )}
      </div>
    </div>
  );
}
