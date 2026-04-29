import { Heart, Smile } from "lucide-react";
import type { ChatMessage } from "../../hooks/useChat";
import { Avatar, AvatarFallback } from "../ui/avatar";

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
      className={`flex items-start gap-2.5 pt-2 pb-0.5 float-up ${
        isPartner ? "" : "flex-row-reverse"
      }`}
    >
      <div className="shrink-0 mt-0.5">
        {showAvatar ? (
          <Avatar
            className={`${isPartner ? "w-7 h-7" : "w-7 h-7"}`}
            style={isPartner
              ? { background: "var(--vp-primary-soft)" }
              : { background: "var(--muted)" }
            }
          >
            <AvatarFallback className="bg-transparent">
              {isPartner
                ? <Heart className="w-3.5 h-3.5 text-primary" fill="currentColor" />
                : <Smile className="w-3.5 h-3.5" />
              }
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-7" />
        )}
      </div>

      <div className={`flex flex-col max-w-[75%] ${isPartner ? "" : "items-end"}`}>
        <div
          className="px-3.5 py-2.5 text-[15px] leading-relaxed break-words"
          style={{
            background: isPartner ? "var(--vp-bubble-partner)" : "var(--vp-bubble-user)",
            color: isPartner ? "var(--vp-bubble-partner-text)" : "var(--vp-bubble-user-text)",
            borderRadius: isPartner
              ? "16px 16px 16px 4px"
              : "16px 16px 4px 16px",
            border: isPartner ? "1px solid var(--border)" : "none",
          }}
        >
          {message.content}
        </div>

        {showAvatar && (
          <time className="text-[10px] mt-1 px-1 font-mono text-muted-foreground">
            {formatTime(message.time)}
          </time>
        )}
      </div>
    </div>
  );
}
