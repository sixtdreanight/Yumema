import { useState, useRef, useCallback, type KeyboardEvent } from "react";
import { Send } from "lucide-react";

export default function MessageInput({
  onSend, disabled,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.focus();
    }
  }, [text, disabled, onSend]);

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
  };

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <div className="px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-end glass rounded-3xl px-4 py-2.5 border border-border">
        <textarea
          ref={inputRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="输入消息... (Enter 发送)"
          rows={1}
          disabled={disabled}
          className="flex-1 bg-transparent text-sm outline-none resize-none disabled:opacity-40 overflow-hidden"
          style={{
            minHeight: "1.5rem",
            maxHeight: "6rem",
            fontFamily: "var(--vp-font)",
            lineHeight: "1.6",
            color: "var(--vp-text)",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 active:scale-90 ml-2"
          style={{
            background: canSend ? "var(--primary)" : "var(--vp-border-light)",
            opacity: canSend ? 1 : 0.4,
          }}
        >
          <Send className="w-3.5 h-3.5 text-white" />
        </button>
      </div>
    </div>
  );
}
