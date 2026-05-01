import { useState, useEffect, useCallback, useRef } from "react";
import { incrementMsgCount } from "../components/shared/SurveyDialog";

export interface ChatMessage {
  role: "user" | "partner";
  content: string;
  time: string;
}

// ---- Adaptive send detection 阈值 ----
const BURST_WINDOW = 2000;   // 2 秒内连续 Enter → burst 模式
const BURST_WAIT = 500;      // burst 模式等待
const NORMAL_WAIT = 800;     // 正常等待
const TYPING_WAIT = 1200;    // 正在输入时等待

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [composing, setComposing] = useState(false);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [queueSize, setQueueSize] = useState(0);
  const [pending, setPending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queueRef = useRef<string[]>([]);
  const pendingRef = useRef<string[]>([]);
  const enterHistoryRef = useRef<number[]>([]);
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKeystrokeRef = useRef(0);
  const typingRef = useRef(false);

  // ---- IPC 事件 + 初始化 ----
  useEffect(() => {
    // 加载 profile
    window.api.getState().then((state: unknown) => {
      const s = state as { profile: Record<string, unknown> | null };
      if (s.profile) setProfile(s.profile);
    });

    // 恢复历史聊天记录
    window.api.loadHistory().then((history: unknown) => {
      const turns = history as Array<{ role: string; content: string; timestamp: string }>;
      if (Array.isArray(turns) && turns.length > 0) {
        const restored: ChatMessage[] = turns.map((t) => ({
          role: t.role === "assistant" ? "partner" : "user",
          content: t.content,
          time: t.timestamp,
        }));
        setMessages(restored);
      }
    }).catch(() => {});

    const unsubTyping = window.api.on("chat:typing", (data: unknown) => {
      const d = data as { active: boolean };
      setComposing(d.active);
    });

    const unsubChunk = window.api.on("chat:reply-chunk", (data: unknown) => {
      const d = data as { text: string; index: number; total: number };
      const now = new Date().toISOString();
      setComposing(false);
      setMessages((prev) => [...prev, { role: "partner", content: d.text, time: now }]);
      if (d.index === d.total - 1) {
        setTyping(false);
        typingRef.current = false;
      }
    });

    return () => { unsubTyping(); unsubChunk(); };
  }, []);

  // ---- 自动滚到底部 ----
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, composing]);

  // ---- 计算自适应等待时间 ----
  const calcWait = useCallback((): number => {
    // 信号1: 用户是否正在输入（键盘还在动）
    const typingNow = Date.now() - lastKeystrokeRef.current < 1500;

    // 信号2: burst 检测 — 最近 2 次 Enter 间隔 < BURST_WINDOW
    const h = enterHistoryRef.current;
    const burst = h.length >= 2 &&
      h[h.length - 1] - h[h.length - 2] < BURST_WINDOW;

    if (typingNow) return TYPING_WAIT;
    if (burst) return BURST_WAIT;
    return NORMAL_WAIT;
  }, []);

  // ---- 发送 pending 消息到 AI ----
  const flushPending = useCallback(async (msgs: string[]) => {
    if (msgs.length === 0) return;
    setTyping(true);
    typingRef.current = true;
    enterHistoryRef.current = [];
    try {
      const result = await window.api.sendMessage(msgs.join("\n"));
      if (result && typeof result === "object" && "success" in result && !result.success) {
        setTyping(false);
        typingRef.current = false;
      }
    } catch {
      setTyping(false);
      typingRef.current = false;
    }
  }, []);

  // ---- 启动/重置发送定时器 ----
  const scheduleFlush = useCallback(() => {
    if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    const wait = calcWait();
    sendTimerRef.current = setTimeout(() => {
      const batch = [...pendingRef.current];
      pendingRef.current = [];
      setPending(false);
      flushPending(batch);
    }, wait);
  }, [calcWait, flushPending]);

  // ---- 输入框中打字 → 延长定时器（如果当前有 pending 消息） ----
  const onTypingActivity = useCallback(() => {
    lastKeystrokeRef.current = Date.now();
    // 只有 pending 中有消息时才重新计时
    if (pendingRef.current.length > 0) {
      scheduleFlush();
    }
  }, [scheduleFlush]);

  // ---- 队列消化：AI 回复完成后，取出排队消息 ----
  useEffect(() => {
    if (!typing && !typingRef.current && queueRef.current.length > 0) {
      const batch = [...queueRef.current];
      queueRef.current = [];
      setQueueSize(0);

      const now = new Date().toISOString();
      // 批量添加消息，避免 for 循环中逐条 setState
      const newMessages = batch.map((msg) => ({ role: "user" as const, content: msg, time: now }));
      setMessages((prev) => [...prev, ...newMessages]);
      for (let i = 0; i < batch.length; i++) incrementMsgCount();

      // 排队消息直接发，不再 debounce（已经等过了）
      flushPending(batch);
    }
    // messages 不加入依赖，只监听 typing 状态切换
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typing, flushPending]);

  // ---- 气泡立即上屏 ----
  const showUserBubble = useCallback((content: string) => {
    const now = new Date().toISOString();
    setMessages((prev) => [...prev, { role: "user", content, time: now }]);
    incrementMsgCount();
  }, []);

  // ---- 用户按 Enter 发送 ----
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // 气泡立即上屏
    showUserBubble(content.trim());

    if (typingRef.current) {
      // AI 正在回复 → 入队
      queueRef.current.push(content.trim());
      setQueueSize(queueRef.current.length);
    } else {
      // 记录 Enter 时间戳用于 burst 检测
      enterHistoryRef.current.push(Date.now());
      if (enterHistoryRef.current.length > 5) enterHistoryRef.current.shift();

      // 加入 pending 批次，启动/重置自适应定时器
      pendingRef.current.push(content.trim());
      setPending(true);
      scheduleFlush();
    }
  }, [typingRef, showUserBubble, scheduleFlush]);

  // ---- 重新生成最后一条 AI 回复 ----
  const regenerate = useCallback(async () => {
    setMessages((prev) => {
      const lastUserIdx = prev.map((m) => m.role).lastIndexOf("user");
      if (lastUserIdx === -1) return prev;
      return prev.slice(0, lastUserIdx);
    });
    setTyping(true);
    typingRef.current = true;
    try {
      const result = await window.api.regenerateLast();
      if (!(result as { success: boolean }).success) {
        setTyping(false);
        typingRef.current = false;
      }
    } catch {
      setTyping(false);
      typingRef.current = false;
    }
  }, []);

  return {
    messages, typing, composing, profile,
    messagesEndRef, sendMessage, regenerate,
    queueSize, pending, onTypingActivity,
  };
}
