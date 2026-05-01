import { useState, useEffect, useCallback } from "react";
import { Heart, Settings, MessageCircle, MessageSquare, MessageCircleHeart, Search } from "lucide-react";
import { Flex, Text } from "@radix-ui/themes";
import { useChat } from "../hooks/useChat";
import MessageList from "../components/chat/MessageList";
import MessageInput from "../components/chat/MessageInput";
import Button from "../components/ui/Button";
import { GlassCard, CardHeader, DialogOverlay } from "../components/ui/GlassCard";
import SettingsDialog from "../components/shared/SettingsDialog";
import UpdateToast from "../components/shared/UpdateToast";
import SurveyDialog, { shouldShowSurvey } from "../components/shared/SurveyDialog";
import NapCatSetup from "./NapCatSetup";
import WeChatSetup from "./WeChatSetup";
import TitleBar from "../components/shared/TitleBar";
import { Avatar, AvatarFallback } from "../components/ui/avatar";

export default function ChatWindow() {
  const { messages, typing, composing, profile, messagesEndRef, sendMessage, queueSize, pending, onTypingActivity, regenerate } = useChat();
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
    const merged = [...diskHits, ...localHits]
      .filter((h) => {
        const key = h.snippet + h.timestamp;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 50);

    setSearchHits(merged);
  }, [messages]);

  useEffect(() => {
    let mounted = true;
    window.api.getAvatar().then((d: unknown) => { if (mounted) setAvatarData(d as string | null); });
    window.api.getConfig().then((c: unknown) => {
      if (!mounted) return;
      const ai = (c as { ai?: { model?: string; provider?: string } }).ai;
      if (ai?.model) setCurrentModel(ai.model);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    setTime(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }));
    const t = setInterval(
      () => setTime(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })),
      30000
    );
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (shouldShowSurvey()) {
      setShowSurvey(true);
    }
  }, []);

  if (showNapCat) {
    return <NapCatSetup onBack={() => setShowNapCat(false)} />;
  }
  if (showWeChat) {
    return <WeChatSetup onBack={() => setShowWeChat(false)} />;
  }

  const name = (profile?.name as string) || "V-Partner";

  return (
    <Flex direction="column" height="100vh" className="page-enter"
      style={{ background: "transparent" }}>
      <UpdateToast />

      <TitleBar
        background="transparent"
        borderColor="transparent"
        height={56}
      >
        <GlassCard padding="p-2">
          <Flex align="center" gap="4" className="p-4">
            <div
              style={{
                width: 32, height: 32, borderRadius: "50%", overflow: "hidden",
                cursor: "pointer", background: "var(--accent-3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                border: "2px solid rgba(255,255,255,0.5)",
                WebkitAppRegion: "no-drag",
              }}
              onClick={async () => {
                const data = await window.api.pickAvatar();
                if (data) setAvatarData(data as string);
              }}
            >
              {avatarData ? (
                <img src={avatarData} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <Heart size={16} style={{ color: "var(--primary)" }} fill="currentColor" />
              )}
            </div>
            <Flex align="center" gap="2">
              <Text size="3" weight="medium">{name}</Text>
            </Flex>
          </Flex>
        </GlassCard>

        <GlassCard padding="p-2">
          <Flex align="center" gap="4" className="p-4">
            <Text size="2" color="gray" style={{ fontFamily: "var(--default-font-family)" }}>{time}</Text>
            {currentModel && (
              <button
                style={{ WebkitAppRegion: "no-drag", cursor: "pointer" }}
                className="text-xs text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                onClick={async () => {
                  const models = currentModel.includes("claude")
                    ? ["claude-sonnet-4-6", "claude-opus-4-7", "claude-haiku-4-5"]
                    : currentModel.includes("gpt")
                    ? ["gpt-4o", "gpt-4o-mini"]
                    : [currentModel];
                  const idx = models.indexOf(currentModel);
                  const next = models[(idx + 1) % models.length] || models[0];
                  if (next !== currentModel) {
                    await window.api.updateConfig({ ai: { model: next } });
                    setCurrentModel(next);
                  }
                }}
              >
                {currentModel}
              </button>
            )}
            <Flex align="center" gap="2" className="px-2 py-1 rounded-md hover:bg-muted transition-colors" style={{ WebkitAppRegion: "no-drag", cursor: "pointer" }}
              onClick={() => setShowNapCat(true)}>
              <MessageCircle size={16} />
              <Text size="2" color="gray">QQ</Text>
            </Flex>
            <Flex align="center" gap="2" className="px-3 py-2 rounded-lg hover:bg-muted transition-colors" style={{ WebkitAppRegion: "no-drag", cursor: "pointer" }}
              onClick={() => setShowWeChat(true)}>
              <MessageSquare size={16} />
              <Text size="2" color="gray">微信</Text>
            </Flex>
            <Flex align="center" gap="2" className="px-3 py-2 rounded-lg hover:bg-muted transition-colors" style={{ WebkitAppRegion: "no-drag", cursor: "pointer" }}
              onClick={() => setShowSearch((v) => !v)}>
              <Search size={16} />
              <Text size="2" color="gray">搜索</Text>
            </Flex>
            <Flex align="center" gap="2" className="px-3 py-2 rounded-lg hover:bg-muted transition-colors" style={{ WebkitAppRegion: "no-drag", cursor: "pointer" }}
              onClick={() => setShowSurvey(true)}>
              <MessageCircleHeart size={16} />
              <Text size="2" color="gray">反馈</Text>
            </Flex>
            <Flex align="center" gap="2" className="px-3 py-2 rounded-lg hover:bg-muted transition-colors" style={{ WebkitAppRegion: "no-drag", cursor: "pointer" }}
              onClick={() => setShowSettings(true)}>
              <Settings size={16} />
              <Text size="2" color="gray">设置</Text>
            </Flex>
          </Flex>
        </GlassCard>
      </TitleBar>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "8px 8px 0" }}>
        <div style={{
          flex: 1,
          overflowY: "auto",
          maxWidth: 768,
          margin: "0 auto 16px",
          width: "100%",
          borderRadius: 16,
        }}>
          <MessageList messages={messages} typing={typing} composing={composing} messagesEndRef={messagesEndRef} onRegenerate={regenerate} />
        </div>

        <GlassCard padding="p-0" style={{ maxWidth: 768, margin: "0 auto 16px", width: "100%" }}>
          <MessageInput onSend={sendMessage} queueSize={queueSize} pending={pending} onActivity={onTypingActivity} />
        </GlassCard>
      </div>

      {showSettings && (
        <SettingsDialog onClose={() => setShowSettings(false)} />
      )}

      {showSurvey && <SurveyDialog onClose={() => setShowSurvey(false)} />}

      {showSearch && (
        <DialogOverlay onClose={() => setShowSearch(false)}>
          <div className="w-[520px] scale-in" onClick={(e) => e.stopPropagation()}>
            <GlassCard padding="p-0">
              <CardHeader title="搜索聊天记录" onClose={() => setShowSearch(false)} />
              <div className="px-6 py-4 flex gap-2">
                <input
                  type="text"
                  className="flex-1 px-4 py-2 rounded-lg text-xs bg-background border border-input text-foreground outline-none"
                  placeholder="搜索关键词（至少2个字）..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") doSearch(searchQuery);
                  }}
                />
                <Button
                  variant="primary"
                  onClick={() => doSearch(searchQuery)}
                  disabled={searchQuery.trim().length < 2}
                >
                  搜索
                </Button>
              </div>

              <div className="max-h-[50vh] overflow-y-auto">
                {searchHits.length > 0 && (
                  <div className="px-6 py-4 space-y-2">
                    {searchHits.map((hit, i) => (
                      <div key={`${hit.timestamp}-${i}`} className="rounded-xl border border-border" style={{ background: hit.role === "user" ? "var(--vp-bubble-user-glass)" : "var(--vp-bubble-partner-glass)" }}>
                        <div className="p-4">
                          <Flex justify="between" mb="1">
                            <Text size="1" color="gray">{hit.role === "user" ? "你" : "TA"} · {new Date(hit.timestamp).toLocaleString("zh-CN")}</Text>
                          </Flex>
                          <Text size="2" style={{ wordBreak: "break-word" }}>{hit.snippet}</Text>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {searchHits.length === 0 && searchQuery.trim().length >= 2 && (
                  <div className="px-6 py-6 text-center">
                    <Text size="2" color="gray">未找到相关消息</Text>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </DialogOverlay>
      )}
    </Flex>
  );
}
