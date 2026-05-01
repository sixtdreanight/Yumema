import { useState, useCallback, memo } from "react";
import { Heart, Smile, ThumbsUp, ThumbsDown } from "lucide-react";
import type { ChatMessage } from "../../hooks/useChat";
import { Avatar, AvatarFallback } from "../ui/Avatar";

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

const MessageBubble = memo(function MessageBubble({
  message, showAvatar, canRegenerate, onRegenerate,
}: {
  message: ChatMessage;
  showAvatar: boolean;
  canRegenerate?: boolean;
  onRegenerate?: () => void;
}) {
  const isPartner = message.role === "partner";
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionText, setCorrectionText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (!canRegenerate || !onRegenerate) return;
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
  }, [canRegenerate, onRegenerate]);

  const handleRegenerate = useCallback(() => {
    setMenuPos(null);
    onRegenerate?.();
  }, [onRegenerate]);

  const submitFeedback = useCallback(async (type: "thumbs_up" | "thumbs_down") => {
    if (feedbackSent) return;
    setFeedbackSent(true);
    try {
      await window.api.submitFeedback({
        type,
        userMessage: "",
        aiReply: message.content,
      });
    } catch { /* ignore */ }
    if (type === "thumbs_down") setShowCorrection(true);
  }, [feedbackSent, message.content]);

  const submitCorrection = useCallback(async () => {
    if (!correctionText.trim()) {
      setShowCorrection(false);
      return;
    }
    try {
      await window.api.submitFeedback({
        type: "correction",
        userMessage: "",
        aiReply: message.content,
        correctionText: correctionText.trim(),
      });
    } catch { /* ignore */ }
    setShowCorrection(false);
    setCorrectionText("");
  }, [correctionText, message.content]);

  return (
    <>
      <div
        className="float-up"
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          padding: "8px 0",
          flexDirection: isPartner ? "row" : "row-reverse",
        }}
        onContextMenu={handleContextMenu}
      >
        <div style={{ flexShrink: 0, marginTop: 4 }} aria-hidden="true">
          {showAvatar ? (
            <Avatar
              style={{
                width: 32, height: 32,
                background: isPartner ? "var(--vp-primary-soft)" : "var(--muted)",
              }}
            >
              <AvatarFallback className="bg-transparent">
                {isPartner
                  ? <Heart size={16} style={{ color: "var(--primary)" }} fill="currentColor" />
                  : <Smile size={16} />
                }
              </AvatarFallback>
            </Avatar>
          ) : (
            <div style={{ width: 32 }} />
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: "75%",
            alignItems: isPartner ? "flex-start" : "flex-end",
          }}
          onMouseEnter={() => isPartner && setShowFeedback(true)}
          onMouseLeave={() => { setShowFeedback(false); setShowCorrection(false); }}
        >
          <div
            style={{
              padding: "12px 16px",
              fontSize: 16,
              lineHeight: 1.65,
              wordBreak: "break-word",
              background: isPartner
                ? "var(--vp-bubble-partner-glass)"
                : "var(--vp-bubble-user-glass)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              color: isPartner ? "var(--vp-bubble-partner-text)" : "var(--vp-bubble-user-text)",
              borderRadius: isPartner
                ? "16px 16px 16px 4px"
                : "16px 16px 4px 16px",
              border: isPartner ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.35)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}
          >
            {message.content}
          </div>

          {isPartner && showFeedback && !feedbackSent && (
            <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
              <button
                onClick={() => submitFeedback("thumbs_up")}
                className="p-1 rounded hover:bg-muted transition-colors"
                aria-label="点赞"
              >
                <ThumbsUp size={16} style={{ color: "var(--muted-foreground)" }} />
              </button>
              <button
                onClick={() => submitFeedback("thumbs_down")}
                className="p-1 rounded hover:bg-muted transition-colors"
                aria-label="踩"
              >
                <ThumbsDown size={16} style={{ color: "var(--muted-foreground)" }} />
              </button>
            </div>
          )}

          {showCorrection && (
            <div style={{ display: "flex", gap: 4, marginTop: 4, width: "100%" }}>
              <input
                value={correctionText}
                onChange={(e) => setCorrectionText(e.target.value)}
                placeholder="期望的回复..."
                className="flex-1 px-2 py-1 text-xs rounded border border-border bg-background"
                onKeyDown={(e) => { if (e.key === "Enter") submitCorrection(); }}
                autoFocus
              />
              <button
                onClick={submitCorrection}
                className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground"
              >
                发送
              </button>
            </div>
          )}

          {showAvatar && (
            <time style={{
              fontSize: 12,
              marginTop: 8,
              padding: "0 8px",
              fontFamily: "var(--vp-font-mono)",
              color: "var(--muted-foreground)",
            }}>
              {formatTime(message.time)}
            </time>
          )}
        </div>
      </div>

      {menuPos && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setMenuPos(null)} />
          <div
            className="fixed z-50 rounded-lg border border-border bg-popover shadow-lg py-2 min-w-[120px]"
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            <button
              className="w-full px-3 py-2 text-xs text-left hover:bg-muted transition-colors"
              onClick={handleRegenerate}
            >
              重新生成
            </button>
            <button
              className="w-full px-3 py-2 text-xs text-left hover:bg-muted transition-colors"
              onClick={async () => {
                setMenuPos(null);
                await window.api.exportChat("txt");
              }}
            >
              导出 TXT
            </button>
            <button
              className="w-full px-3 py-2 text-xs text-left hover:bg-muted transition-colors"
              onClick={async () => {
                setMenuPos(null);
                await window.api.exportChat("md");
              }}
            >
              导出 Markdown
            </button>
          </div>
        </>
      )}
    </>
  );
});

export default MessageBubble;
