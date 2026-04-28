import { useState, useEffect } from "react";
import { useChat } from "../hooks/useChat";
import MessageList from "../components/chat/MessageList";
import MessageInput from "../components/chat/MessageInput";
import SettingsDialog from "../components/shared/SettingsDialog";
import UpdateToast from "../components/shared/UpdateToast";
import SurveyDialog, { shouldShowSurvey } from "../components/shared/SurveyDialog";
import NapCatSetup from "./NapCatSetup";
import Avatar from "../components/ui/Avatar";

export default function ChatWindow() {
  const { messages, typing, profile, messagesEndRef, sendMessage } = useChat();
  const [showSettings, setShowSettings] = useState(false);
  const [showNapCat, setShowNapCat] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [time, setTime] = useState("");

  useEffect(() => {
    setTime(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }));
    const t = setInterval(
      () => setTime(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })),
      30000
    );
    return () => clearInterval(t);
  }, []);

  // 消息数量变化时检查是否需要显示问卷
  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].role === "partner") {
      if (shouldShowSurvey()) {
        setShowSurvey(true);
      }
    }
  }, [messages]);

  if (showNapCat) {
    return <NapCatSetup onBack={() => setShowNapCat(false)} />;
  }

  const name = (profile?.name as string) || "V-Partner";

  return (
    <div className="h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 page-enter">
      <UpdateToast />

      {/* Header */}
      <header className="h-14 flex items-center justify-between px-5 shrink-0 glass border-b border-zinc-200/60 dark:border-zinc-700/60">
        <div className="flex items-center gap-3">
          <Avatar emoji="💕" size="sm" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{name}</span>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 pulse-ring" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <time className="text-xs text-zinc-400 dark:text-zinc-500 font-mono tabular-nums">{time}</time>
          <button
            onClick={() => setShowSettings(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="2.5" />
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
            </svg>
          </button>
        </div>
      </header>

      {/* Messages */}
      <MessageList messages={messages} typing={typing} messagesEndRef={messagesEndRef} />

      {/* Input area */}
      <div className="shrink-0 glass border-t border-zinc-200/60 dark:border-zinc-700/60">
        <div className="gradient-line" />
        <MessageInput onSend={sendMessage} disabled={typing} />
      </div>

      {showSettings && (
        <SettingsDialog
          onClose={() => setShowSettings(false)}
          onOpenNapCat={() => {
            setShowSettings(false);
            setShowNapCat(true);
          }}
        />
      )}

      {showSurvey && <SurveyDialog onClose={() => setShowSurvey(false)} />}
    </div>
  );
}
