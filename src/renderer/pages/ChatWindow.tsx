import { useState, useEffect, useCallback } from "react";
import { Heart, Settings, MessageCircle, MessageSquare, MessageCircleHeart, Search, Send } from "lucide-react";
import { Flex, Text, Dialog } from "@radix-ui/themes";
import { useChat } from "../hooks/useChat";
import MessageList from "../components/chat/MessageList";
import Button from "../components/ui/Button";
import { GlassCard, CardHeader } from "../components/ui/GlassCard";
import SettingsDialog from "../components/shared/SettingsDialog";
import UpdateToast from "../components/shared/UpdateToast";
import SurveyDialog, { shouldShowSurvey } from "../components/shared/SurveyDialog";
import { getModels, isCustomModelProvider } from "../lib/models";
import NapCatSetup from "./NapCatSetup";
import WeChatSetup from "./WeChatSetup";

export default function ChatWindow() {
  const { messages, typing, composing, profile, messagesEndRef, sendMessage, regenerate, queueSize, pending, onTypingActivity } = useChat();
  const [draft, setDraft] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showNapCat, setShowNapCat] = useState(false);
  const [showWeChat, setShowWeChat] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHits, setSearchHits] = useState<Array<{ snippet: string; role: string; timestamp: string }>>([]);
  const [time, setTime] = useState("");
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState("");

  const doSearch = useCallback(async (query: string) => {
    const q = query.trim();
    if (q.length < 2) return;
    const diskHits = (await window.api.searchChat(q)) as Array<{ snippet: string; role: string; timestamp: string }>;
    const localHits = messages
      .filter((m) => m.content.toLowerCase().includes(q.toLowerCase()))
      .map((m) => {
        const idx = m.content.toLowerCase().indexOf(q.toLowerCase());
        const start = Math.max(0, idx - 30);
        const end = Math.min(m.content.length, idx + q.length + 30);
        const snippet = (start > 0 ? "..." : "") + m.content.slice(start, end) + (end < m.content.length ? "..." : "");
        return { snippet, role: m.role === "partner" ? "assistant" : m.role, timestamp: m.time };
      });
    const seen = new Set<string>();
    setSearchHits([...diskHits, ...localHits]
      .filter((h) => { const key = h.snippet + h.timestamp; if (seen.has(key)) return false; seen.add(key); return true; })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 50));
  }, [messages]);

  useEffect(() => { let m = true; window.api.getAvatar().then((d: unknown) => { if (m) setAvatarData(d as string | null); }); window.api.getConfig().then((c: unknown) => { if (!m) return; const ai = (c as { ai?: { model?: string } }).ai; if (ai?.model) setCurrentModel(ai.model); }); return () => { m = false; }; }, []);
  useEffect(() => { setTime(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })); const t = setInterval(() => setTime(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })), 30000); return () => clearInterval(t); }, []);
  useEffect(() => { if (shouldShowSurvey()) setShowSurvey(true); }, []);

  if (showNapCat) return <NapCatSetup onBack={() => setShowNapCat(false)} />;
  if (showWeChat) return <WeChatSetup onBack={() => setShowWeChat(false)} />;

  const name = (profile?.name as string) || "V-Partner";
  const placeholder = queueSize > 0 ? `还有 ${queueSize} 条排队中...` : pending ? "可继续输入，稍后一起发送..." : "输入消息... (Enter 发送)";
  const canSend = draft.trim().length > 0;

  const handleSend = () => {
    if (!draft.trim()) return;
    sendMessage(draft.trim());
    setDraft("");
  };

  const sidebarItem = (icon: React.ReactNode, label: string, onClick: () => void) => (
    <button onClick={onClick} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-muted" style={{ WebkitAppRegion: "no-drag" }}>
      <span style={{ width: 24, display: "flex", justifyContent: "center", flexShrink: 0 }}>{icon}</span><span>{label}</span>
    </button>
  );

  return (
    <Flex height="100vh" className="page-enter" style={{ background: "transparent" }}>
      <UpdateToast />
      <nav className="glass-shine" style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", WebkitAppRegion: "drag", paddingTop: 44, borderRadius: 0, border: "none", borderRight: "1px solid rgba(255,255,255,0.15)" }}>
        <div style={{ padding: "20px 16px 12px", WebkitAppRegion: "no-drag" }}>
          <Flex direction="column" align="center" gap="3">
            <div style={{ width: 56, height: 56, borderRadius: "50%", overflow: "hidden", cursor: "pointer", background: "var(--accent-3)", border: "2px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={async () => { try { const d = await window.api.pickAvatar(); if (d) setAvatarData(d as string); } catch { /* ignore */ } }}>
              {avatarData ? <img src={avatarData} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Heart size={24} style={{ color: "var(--primary)" }} fill="currentColor" />}
            </div>
            <Text size="3" weight="medium">{name}</Text>
            <Text size="1" color="gray">{time}</Text>
            {composing && <Text size="1" color="gray" style={{ marginTop: 4 }}>对方正在输入...</Text>}
          </Flex>
        </div>
        {currentModel && (
          <div style={{ padding: "0 16px 12px", WebkitAppRegion: "no-drag" }}>
            <button onClick={async () => {
              const prev = currentModel;
              const provider = currentModel.includes("claude") ? "anthropic" : currentModel.includes("gpt") ? "openai" : null;
              const models = provider ? getModels(provider) : [currentModel];
              const next = models[((models.indexOf(currentModel) + 1) % models.length)] || models[0];
              if (next !== currentModel) { try { await window.api.updateConfig({ ai: { model: next } }); setCurrentModel(next); } catch { setCurrentModel(prev); } }
            }} className="w-full text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors truncate text-center">{currentModel}</button>
          </div>
        )}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", width: "80%", margin: "4px auto" }} />
        <div style={{ flex: 1, padding: "16px 16px", display: "flex", flexDirection: "column", gap: 8, WebkitAppRegion: "no-drag" }}>
          {sidebarItem(<MessageCircle size={24} />, "QQ", () => setShowNapCat(true))}
          {sidebarItem(<MessageSquare size={24} />, "微信", () => setShowWeChat(true))}
          {sidebarItem(<Search size={24} />, "搜索", () => setShowSearch(true))}
          {sidebarItem(<MessageCircleHeart size={24} />, "反馈", () => setShowSurvey(true))}
          {sidebarItem(<Settings size={24} />, "设置", () => setShowSettings(true))}
        </div>
        <Text size="1" color="gray" align="center" style={{ padding: "12px 0", WebkitAppRegion: "no-drag" }}>v{appVersion || "0.0.0"}</Text>
      </nav>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ flex: 1, overflowY: "auto", maxWidth: 768, margin: "16px auto 24px", width: "100%", padding: "0 16px" }}>
          <MessageList messages={messages} typing={typing} composing={composing} messagesEndRef={messagesEndRef} onRegenerate={regenerate} />
        </div>
        <div style={{ maxWidth: 768, margin: "0 auto 16px", width: "100%", padding: "0 16px" }}>
          <div className="glass-shine" style={{ display: "flex", alignItems: "center", padding: "8px 8px 8px 16px", borderRadius: 16 }}>
            <textarea value={draft}
              onChange={(e) => { setDraft(e.target.value); onTypingActivity(); const el = e.target; el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 96) + "px"; }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              rows={1} placeholder={placeholder}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", resize: "none", fontSize: 16, fontFamily: "inherit", lineHeight: "20px", minHeight: 20, maxHeight: 96, color: "var(--foreground)", padding: "8px 0" }} />
            <Button iconOnly variant={canSend ? "primary" : "ghost"} onClick={handleSend} disabled={!canSend} style={{ marginLeft: 8 }}><Send size={16} /></Button>
            {queueSize > 0 && (<span style={{ position: "absolute", top: -6, right: -6, background: "var(--accent-9)", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>{queueSize}</span>)}
          </div>
        </div>
      </div>

      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
      {showSurvey && <SurveyDialog onClose={() => setShowSurvey(false)} />}

      {showSearch && (
        <Dialog.Root open onOpenChange={() => setShowSearch(false)}>
          <Dialog.Content style={{ padding: 0, background: "transparent", maxWidth: 448 }}>
            <GlassCard padding="p-0">
              <CardHeader title="搜索聊天记录" onClose={() => setShowSearch(false)} />
              <div style={{ padding: "28px 28px 20px", display: "flex", gap: 8 }}><input type="text" className="flex-1 rounded-xl text-sm bg-background border border-input text-foreground outline-none" style={{ padding: "12px 16px" }} placeholder="搜索关键词..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && searchQuery.trim().length >= 2) doSearch(searchQuery); }} /><Button variant="primary" onClick={() => doSearch(searchQuery)} disabled={searchQuery.trim().length < 2}>搜索</Button></div>
              <div className="max-h-[50vh] overflow-y-auto">{searchHits.length > 0 && (<div style={{ padding: "0 28px 24px" }} className="space-y-2">{searchHits.map((hit, i) => (<div key={`${hit.timestamp}-${i}`} className="rounded-xl border border-border" style={{ background: hit.role === "user" ? "var(--vp-bubble-user-glass)" : "var(--vp-bubble-partner-glass)" }}><div className="p-4"><Flex justify="between" mb="1"><Text size="1" color="gray">{hit.role === "user" ? "你" : "TA"} · {new Date(hit.timestamp).toLocaleString("zh-CN")}</Text></Flex><Text size="2" style={{ wordBreak: "break-word" }}>{hit.snippet}</Text></div></div>))}</div>)}{searchHits.length === 0 && searchQuery.trim().length >= 2 && (<div style={{ padding: "0 28px 28px", textAlign: "center" }}><Text size="2" color="gray">未找到相关消息</Text></div>)}</div>
            </GlassCard>
          </Dialog.Content>
        </Dialog.Root>
      )}
    </Flex>
  );
}
