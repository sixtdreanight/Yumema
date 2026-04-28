import { useState, useEffect, useCallback, useRef } from "react";
import { incrementMsgCount } from "../components/shared/SurveyDialog";

export interface ChatMessage {
  role: "user" | "partner";
  content: string;
  time: string;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 加载初始状态
  useEffect(() => {
    window.api.getState().then((state: unknown) => {
      const s = state as { profile: Record<string, unknown> | null };
      if (s.profile) setProfile(s.profile);
    });

    // 监听逐条回复
    const unsub = window.api.on("chat:reply-chunk", (data: unknown) => {
      const d = data as { text: string; index: number; total: number };
      const now = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

      // 延迟追加，模拟打字节奏
      const delay = d.index === 0 ? 0 : 600 + Math.random() * 600;
      setTimeout(() => {
        setMessages((prev) => [...prev, { role: "partner", content: d.text, time: now }]);
        if (d.index === d.total - 1) {
          setTyping(false);
        }
      }, delay);
    });

    return unsub;
  }, []);

  // 自动滚到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    const now = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

    setMessages((prev) => [...prev, { role: "user", content, time: now }]);
    setTyping(true);
    incrementMsgCount();

    try {
      await window.api.sendMessage(content);
    } catch {
      setTyping(false);
    }
  }, []);

  return {
    messages, typing, profile,
    messagesEndRef, sendMessage,
  };
}
