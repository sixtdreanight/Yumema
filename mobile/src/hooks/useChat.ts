/**
 * 移动端聊天状态管理 — 直接调用 companion-engine，无需 IPC 层
 *
 * 移植自桌面端 src/renderer/hooks/useChat.ts，
 * 差异：window.api.xxx → 直接调用 companion-engine async 函数，
 * processMessage 返回 AsyncGenerator<string> 实现逐条推送。
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  processMessage,
  loadShortTerm,
  saveShortTerm,
  removeLastTurn,
  loadProfile,
  loadConfig,
  createAIProvider,
  type Profile,
  type AppConfig,
} from "@sixtdreamnight/companion-engine";
import type { ChatMessage } from "../types";

const BURST_WINDOW = 2000;
const BURST_WAIT = 500;
const NORMAL_WAIT = 800;
const TYPING_WAIT = 1200;

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [queueSize, setQueueSize] = useState(0);
  const messagesEndRef = useRef<null>(null);
  const queueRef = useRef<string[]>([]);
  const pendingRef = useRef<string[]>([]);
  const enterHistoryRef = useRef<number[]>([]);
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKeystrokeRef = useRef(0);
  const typingRef = useRef(false);

  // 初始化：加载 profile、config、历史消息
  useEffect(() => {
    (async () => {
      const p = await loadProfile();
      if (p) setProfile(p);
      const c = loadConfig();
      setConfig(c);

      const history = await loadShortTerm("gui-user", 24);
      if (history.length > 0) {
        const restored: ChatMessage[] = [];
        for (const t of history) {
          const role = t.role === "assistant" ? ("partner" as const) : ("user" as const);
          if (role === "partner") {
            const sentences = t.content.split(/(?<=[。！？.!?])/);
            for (const s of sentences) {
              const trimmed = s.trim();
              if (trimmed) restored.push({ role: "partner", content: trimmed, time: t.timestamp });
            }
          } else {
            restored.push({ role: "user", content: t.content, time: t.timestamp });
          }
        }
        setMessages(restored);
      }
    })();
  }, []);

  const calcWait = useCallback((): number => {
    const typingNow = Date.now() - lastKeystrokeRef.current < 1500;
    const h = enterHistoryRef.current;
    const burst = h.length >= 2 && h[h.length - 1] - h[h.length - 2] < BURST_WINDOW;
    if (typingNow) return TYPING_WAIT;
    if (burst) return BURST_WAIT;
    return NORMAL_WAIT;
  }, []);

  async function flushPending(msgs: string[]) {
    if (msgs.length === 0 || !config) return;
    setTyping(true);
    typingRef.current = true;
    enterHistoryRef.current = [];
    try {
      const model = createAIProvider(config.ai);
      const pipelineCtx = { model, config, profile: profile! };
      const text = msgs.join("\n");
      const reply = await processMessage("gui-user", text, pipelineCtx);
      for (let i = 0; i < reply.length; i++) {
        const now = new Date().toISOString();
        setMessages((prev) => [...prev, { role: "partner", content: reply[i], time: now }]);
        if (i < reply.length - 1) {
          setTyping(true);
          await new Promise((r) => setTimeout(r, 600 + Math.random() * 1000));
        }
      }
    } catch (err) {
      const now = new Date().toISOString();
      setMessages((prev) => [
        ...prev,
        { role: "partner", content: `抱歉，出了点问题: ${String(err)}`, time: now },
      ]);
    } finally {
      setTyping(false);
      typingRef.current = false;
    }
  }

  const scheduleFlush = useCallback(() => {
    if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    const wait = calcWait();
    sendTimerRef.current = setTimeout(() => {
      const batch = [...pendingRef.current];
      pendingRef.current = [];
      flushPending(batch);
    }, wait);
  }, [calcWait]);

  const onTypingActivity = useCallback(() => {
    lastKeystrokeRef.current = Date.now();
    if (pendingRef.current.length > 0) scheduleFlush();
  }, [scheduleFlush]);

  useEffect(() => {
    if (!typing && !typingRef.current && queueRef.current.length > 0) {
      const batch = [...queueRef.current];
      queueRef.current = [];
      setQueueSize(0);
      const now = new Date().toISOString();
      setMessages((prev) => [...prev, ...batch.map((msg) => ({ role: "user" as const, content: msg, time: now }))]);
      flushPending(batch);
    }
  }, [typing]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      const now = new Date().toISOString();
      setMessages((prev) => [...prev, { role: "user", content: content.trim(), time: now }]);
      if (typingRef.current) {
        queueRef.current.push(content.trim());
        setQueueSize(queueRef.current.length);
      } else {
        enterHistoryRef.current.push(Date.now());
        if (enterHistoryRef.current.length > 5) enterHistoryRef.current.shift();
        pendingRef.current.push(content.trim());
        scheduleFlush();
      }
    },
    [typingRef, scheduleFlush]
  );

  const regenerate = useCallback(async () => {
    setMessages((prev) => {
      const lastUserIdx = prev.map((m) => m.role).lastIndexOf("user");
      if (lastUserIdx === -1) return prev;
      return prev.slice(0, lastUserIdx);
    });
    const lastMsg = await removeLastTurn("gui-user");
    if (!lastMsg || !config) return;
    setTyping(true);
    typingRef.current = true;
    try {
      const model = createAIProvider(config.ai);
      const pipelineCtx = { model, config, profile: profile! };
      const reply = await processMessage("gui-user", lastMsg, pipelineCtx);
      for (let i = 0; i < reply.length; i++) {
        setMessages((prev) => [...prev, { role: "partner", content: reply[i], time: new Date().toISOString() }]);
        if (i < reply.length - 1) await new Promise((r) => setTimeout(r, 600 + Math.random() * 1000));
      }
    } catch {
      // ignore
    } finally {
      setTyping(false);
      typingRef.current = false;
    }
  }, [config, profile]);

  const placeholder = queueSize > 0 ? `还有 ${queueSize} 条排队中...` : "输入消息...";

  return {
    messages,
    typing,
    profile,
    messagesEndRef,
    sendMessage,
    regenerate,
    queueSize,
    onTypingActivity,
    placeholder,
  };
}
