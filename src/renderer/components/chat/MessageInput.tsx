import { useState, useRef, useCallback, type KeyboardEvent } from "react";

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
      <div className="max-w-2xl mx-auto flex items-end gap-2">
        {/* Placeholder extra actions — emoji / attachment */}
        <button
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors duration-200 opacity-50 hover:opacity-100"
          style={{ color: "var(--vp-text-muted)" }}
          title="表情"
          disabled
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </button>

        <div
          className="flex-1 flex items-end rounded-2xl px-4 py-2.5 transition-all duration-200"
          style={{
            background: "var(--vp-surface)",
            border: "1px solid var(--vp-border)",
            boxShadow: "var(--vp-shadow-xs)",
          }}
        >
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
        </div>

        <button
          onClick={handleSend}
          disabled={!canSend}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 active:scale-90"
          style={{
            background: canSend
              ? "linear-gradient(135deg, var(--vp-primary), var(--vp-accent))"
              : "var(--vp-border-light)",
            boxShadow: canSend ? "0 2px 8px rgba(124, 58, 237, 0.3)" : "none",
            opacity: canSend ? 1 : 0.4,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
            stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 2L15 8L2 14L5 8L2 2Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
