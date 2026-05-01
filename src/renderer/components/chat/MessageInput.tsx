import { useState, useRef, useCallback, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import Button from "../ui/Button";

export default function MessageInput({
  onSend, queueSize, pending, onActivity,
}: {
  onSend: (text: string) => void;
  queueSize: number;
  pending: boolean;
  onActivity: () => void;
}) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.focus();
    }
  }, [text, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 96) + "px";
    onActivity();
  };

  const canSend = text.trim().length > 0;

  return (
    <div style={{ padding: "16px 20px", maxWidth: 720, margin: "0 auto", width: "100%" }}>
      <div style={{
        display: "flex", alignItems: "center",
        background: "transparent",
        borderRadius: 16,
        padding: "8px 8px 8px 16px",
      }}>
        <textarea
          ref={inputRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={
            queueSize > 0 ? `还有 ${queueSize} 条排队中...` :
            pending ? "可继续输入，稍后一起发送..." :
            "输入消息... (Enter 发送)"
          }
          rows={1}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            fontSize: 16,
            fontFamily: "inherit",
            lineHeight: "20px",
            minHeight: 20,
            maxHeight: 96,
            color: "var(--gray-12)",
            padding: "8px 0",
          }}
        />
        <Button
          iconOnly
          variant={canSend ? "primary" : "ghost"}
          onClick={handleSend}
          disabled={!canSend}
          style={{ marginLeft: 8 }}
        >
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
}
