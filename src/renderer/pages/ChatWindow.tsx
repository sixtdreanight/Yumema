import { useState, useEffect } from "react";
import { Heart, Settings, MessageCircle, MessageSquare } from "lucide-react";
import { useChat } from "../hooks/useChat";
import MessageList from "../components/chat/MessageList";
import MessageInput from "../components/chat/MessageInput";
import SettingsDialog from "../components/shared/SettingsDialog";
import UpdateToast from "../components/shared/UpdateToast";
import SurveyDialog, { shouldShowSurvey } from "../components/shared/SurveyDialog";
import NapCatSetup from "./NapCatSetup";
import { Avatar, AvatarFallback } from "../components/ui/avatar";

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
    <div className="h-screen flex flex-col page-enter" style={{ background: "var(--vp-bg-chat)" }}>
      <UpdateToast />

      <header
        className="h-12 flex items-center justify-between px-4 shrink-0 border-b z-header"
        style={{ background: "var(--background)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2.5">
          <Avatar className="w-7 h-7" style={{ background: "var(--vp-primary-soft)" }}>
            <AvatarFallback className="bg-transparent">
              <Heart className="w-3.5 h-3.5 text-primary" fill="currentColor" />
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{name}</span>
            <span className="text-[10px] font-mono tracking-wider text-emerald-500">ONLINE</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <time className="text-[11px] font-mono tabular-nums text-muted-foreground mr-2">{time}</time>
          <button
            onClick={() => setShowNapCat(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted hover:scale-105"
            title="QQ"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted hover:scale-105"
            title="微信"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted hover:scale-105"
            title="设置"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      <MessageList messages={messages} typing={typing} messagesEndRef={messagesEndRef} />

      <div className="shrink-0" style={{ background: "var(--background)", borderTop: "1px solid var(--border)" }}>
        <MessageInput onSend={sendMessage} disabled={typing} />
      </div>

      {showSettings && (
        <SettingsDialog onClose={() => setShowSettings(false)} />
      )}

      {showSurvey && <SurveyDialog onClose={() => setShowSurvey(false)} />}
    </div>
  );
}
