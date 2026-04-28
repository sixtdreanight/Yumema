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
        <div className="flex-1 flex items-end rounded-2xl px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition-all duration-200 focus-within:border-violet-300 dark:focus-within:border-violet-600 focus-within:ring-4 focus-within:ring-violet-50 dark:focus-within:ring-violet-900/20">
          <textarea
            ref={inputRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Enter 发送)"
            rows={1}
            disabled={disabled}
            className="flex-1 bg-transparent text-sm outline-none resize-none text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 disabled:opacity-40 overflow-hidden"
            style={{
              minHeight: "1.5rem",
              maxHeight: "6rem",
              fontFamily: "var(--vp-font)",
              lineHeight: "1.6",
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
