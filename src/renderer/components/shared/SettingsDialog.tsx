import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog, Tabs, Select, Slider, TextField, Button,
  Flex, Text,
} from "@radix-ui/themes";
import { Heart } from "lucide-react";
import { GlassCard, CardHeader } from "../ui/GlassCard";
import ToggleTag from "../shared/ToggleTag";

const ANTHROPIC_MODELS = [
  "claude-sonnet-4-20250514",
  "claude-opus-4-20250514",
  "claude-haiku-4-20250514",
];

const OPENAI_MODELS = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"];

function getModels(provider: string) {
  if (provider === "anthropic") return ANTHROPIC_MODELS;
  if (provider === "openai") return OPENAI_MODELS;
  return [];
}

function isCustomModelProvider(provider: string) {
  return provider === "openai-compatible" || provider === "ollama";
}

// ---- 角色卡编辑的标签选项 ----
const TEMPERAMENT_TAGS = ["温柔", "活泼", "傲娇", "高冷", "粘人", "腹黑", "天然呆", "毒舌", "元气", "慵懒"];
const HOBBY_TAGS = ["游戏", "动漫", "音乐", "电影", "阅读", "运动", "美食", "旅行", "摄影", "画画", "写作", "编程"];
const DAILY_TAGS = ["上班族朝九晚五", "学生党上课泡图书馆", "自由职业宅家", "夜猫子晚上活动", "早起型早上活跃"];
const QUIRK_TAGS = ["路痴", "怕黑", "吃货", "起床困难户", "丢三落四", "爱干净", "拖延症", "脸盲"];

export default function SettingsDialog({ onClose }: { onClose: () => void }) {
  const [resetStep, setResetStep] = useState(0);
  const [resetInput, setResetInput] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [appVersion, setAppVersion] = useState("");
  const [aiProvider, setAiProvider] = useState("anthropic");
  const [aiModel, setAiModel] = useState("");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiBaseUrl, setAiBaseUrl] = useState("");
  const [aiMaxTokens, setAiMaxTokens] = useState([2048]);
  const [aiTemperature, setAiTemperature] = useState([0.85]);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [contentFilter, setContentFilter] = useState<"strict" | "moderate" | "off">("strict");

  // 角色卡编辑状态
  const [profileAge, setProfileAge] = useState(0);
  const [profileCity, setProfileCity] = useState("");
  const [profileOccupation, setProfileOccupation] = useState("");
  const [profileEducation, setProfileEducation] = useState("");
  const [profileMajor, setProfileMajor] = useState("");
  const [profileTemperament, setProfileTemperament] = useState("");
  const [profileHobbies, setProfileHobbies] = useState<string[]>([]);
  const [profileDailyLife, setProfileDailyLife] = useState("");
  const [profileQuirks, setProfileQuirks] = useState<string[]>([]);
  const [profileSpeakingStyle, setProfileSpeakingStyle] = useState("");
  const [profileMemeStyle, setProfileMemeStyle] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [memoryFacts, setMemoryFacts] = useState<Array<{ topic: string; content: string; confidence: string; mentions: number }>>([]);
  const [newTopic, setNewTopic] = useState("");
  const [newContent, setNewContent] = useState("");

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => { fn(); timers.current = timers.current.filter((t) => t !== id); }, ms);
    timers.current.push(id);
    return id;
  }, []);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  const toggleTag = useCallback((list: string[], set: (v: string[]) => void, item: string) => {
    set(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    window.api.getVersion().then((v: string) => {
      if (!ac.signal.aborted) setAppVersion(v);
    });
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    window.api.getConfig().then((c: unknown) => {
      if (ac.signal.aborted) return;
      const cfg = c as Record<string, unknown>;
      const ai = cfg.ai as Record<string, unknown> | undefined;
      if (ai) {
        setAiProvider((ai.provider as string) || "anthropic");
        setAiModel((ai.model as string) || "");
        setAiApiKey((ai.apiKey as string) || "");
        setHasApiKey(!!(ai.hasApiKey as boolean));
        setAiBaseUrl((ai.baseUrl as string) || "");
        setAiMaxTokens([(ai.maxTokens as number) || 2048]);
        setAiTemperature([(ai.temperature as number) || 0.85]);
      }
      const filter = cfg.contentFilter as string | undefined;
      if (filter === "strict" || filter === "moderate" || filter === "off") {
        setContentFilter(filter);
      }
    });
    return () => ac.abort();
  }, []);

  // 加载记忆
  useEffect(() => {
    const ac = new AbortController();
    window.api.getMemoryFacts?.().then((facts: unknown) => {
      if (!ac.signal.aborted && Array.isArray(facts)) setMemoryFacts(facts as typeof memoryFacts);
    });
    return () => ac.abort();
  }, []);

  // 加载角色卡
  useEffect(() => {
    const ac = new AbortController();
    window.api.getState().then((s: unknown) => {
      if (ac.signal.aborted) return;
      const state = s as { profile: Record<string, unknown> | null };
      const p = state?.profile;
      if (p) {
        setProfileAge((p.age as number) || 0);
        setProfileCity((p.city as string) || "");
        setProfileOccupation((p.occupation as string) || "");
        setProfileEducation((p.education as string) || "");
        setProfileMajor((p.major as string) || "");
        setProfileTemperament((p.temperament as string) || "");
        setProfileHobbies(Array.isArray(p.hobbies) ? p.hobbies as string[] : []);
        setProfileDailyLife((p.daily_life as string) || "");
        setProfileQuirks(Array.isArray(p.quirks) ? p.quirks as string[] : []);
        setProfileSpeakingStyle((p.speaking_style as string) || "");
        setProfileMemeStyle((p.meme_style as string) || "");
      }
    });
    return () => ac.abort();
  }, []);

  const handleAiSave = async () => {
    setAiSaving(true);
    setAiSaved(false);
    try {
      const result = await window.api.updateConfig({
        ai: {
          provider: aiProvider,
          model: aiModel,
          apiKey: aiApiKey,
          baseUrl: aiBaseUrl || undefined,
          maxTokens: aiMaxTokens[0],
          temperature: aiTemperature[0],
        },
        contentFilter,
      });
      const r = result as { success?: boolean; error?: string };
      if (r && typeof r === "object" && r.success === false) {
        alert(r.error || "保存失败");
      } else {
        setAiSaved(true);
        scheduleTimeout(() => setAiSaved(false), 2000);
      }
    } catch {
      alert("保存失败，请重试");
    } finally {
      setAiSaving(false);
    }
  };

  const handleReset = async () => {
    if (resetStep === 0) {
      setResetStep(1);
      return;
    }
    if (resetStep === 1 && resetInput === "RESET") {
      setResetLoading(true);
      const result = await window.api.resetAllData();
      if ((result as { success: boolean }).success) {
        window.location.hash = "#/setup";
        window.location.reload();
      }
      setResetLoading(false);
    }
  };

  const handleResetCancel = () => {
    setResetStep(0);
    setResetInput("");
    setResetLoading(false);
  };

  const handleProfileSave = async () => {
    setProfileSaving(true);
    setProfileSaved(false);
    setProfileError("");
    const result = await window.api.updateProfile({
      age: profileAge,
      city: profileCity,
      occupation: profileOccupation,
      education: profileEducation,
      major: profileMajor,
      temperament: profileTemperament,
      hobbies: profileHobbies,
      daily_life: profileDailyLife,
      quirks: profileQuirks,
      speaking_style: profileSpeakingStyle,
      meme_style: profileMemeStyle,
    });
    setProfileSaving(false);
    const r = result as { success: boolean; error?: string };
    if (r.success) {
      setProfileSaved(true);
      scheduleTimeout(() => setProfileSaved(false), 2000);
    } else {
      setProfileError(r.error || "保存失败");
    }
  };

  return (
    <Dialog.Root open onOpenChange={onClose}>
      <Dialog.Content maxWidth="420px" style={{ padding: 0, background: "transparent", WebkitAppRegion: "no-drag" as unknown as string }}>
        <GlassCard padding="p-0">
          <CardHeader title="设置" onClose={onClose} />
          <Flex direction="column" maxHeight="70vh">

          <Tabs.Root defaultValue="ai" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <Tabs.List mx="5" className="glass-shine rounded-xl p-2">
              <Tabs.Trigger value="ai" px="4" py="2">AI 配置</Tabs.Trigger>
              <Tabs.Trigger value="memory" px="4" py="2">记忆</Tabs.Trigger>
              <Tabs.Trigger value="character" px="4" py="2">角色卡</Tabs.Trigger>
              <Tabs.Trigger value="data" px="4" py="2">数据</Tabs.Trigger>
              <Tabs.Trigger value="about" px="4" py="2">关于</Tabs.Trigger>
            </Tabs.List>

            <Flex direction="column" px="6" py="5" gap="4" style={{ maxHeight: "50vh", overflowY: "auto" }}>
              <Tabs.Content value="ai">
                <Flex direction="column" gap="4">
                  <Flex direction="column" gap="2">
                    <Text size="1" color="gray">服务商</Text>
                    <Select.Root value={aiProvider} onValueChange={(v) => { setAiProvider(v); setAiModel(""); }}>
                      <Select.Trigger />
                      <Select.Content className="vp-select-content">
                        <Select.Item value="anthropic">Claude (Anthropic)</Select.Item>
                        <Select.Item value="openai">OpenAI (GPT 系列)</Select.Item>
                        <Select.Item value="openai-compatible">其他兼容接口</Select.Item>
                        <Select.Item value="ollama">Ollama (本地)</Select.Item>
                      </Select.Content>
                    </Select.Root>
                  </Flex>

                  {aiProvider !== "openai-compatible" && aiProvider !== "ollama" && getModels(aiProvider).length > 0 && (
                    <Flex direction="column" gap="2">
                      <Text size="1" color="gray">模型</Text>
                      <Select.Root value={aiModel} onValueChange={setAiModel}>
                        <Select.Trigger placeholder="选择模型..." />
                        <Select.Content className="vp-select-content">
                          {getModels(aiProvider).map((m) => (
                            <Select.Item key={m} value={m}>{m}</Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    </Flex>
                  )}

                  {isCustomModelProvider(aiProvider) && (
                    <Flex direction="column" gap="2">
                      <Text size="1" color="gray">模型名称</Text>
                      <TextField.Root
                        value={aiModel}
                        onChange={(e) => setAiModel(e.target.value)}
                        placeholder={aiProvider === "ollama" ? "llama3 / qwen2.5" : "deepseek-chat / gpt-4o-mini"}
                      />
                    </Flex>
                  )}

                  <Flex direction="column" gap="2">
                    <Flex align="center" gap="2">
                      <Text size="1" color="gray">
                        API Key{aiProvider === "ollama" ? " (本地可留空)" : ""}
                      </Text>
                      {hasApiKey && aiProvider !== "ollama" && (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          已配置
                        </span>
                      )}
                    </Flex>
                    <TextField.Root
                      type="password"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder={aiProvider === "ollama" ? "ollama 本地无需密钥" : hasApiKey ? "输入新密钥可更换..." : "sk-..."}
                    />
                  </Flex>

                  {isCustomModelProvider(aiProvider) && (
                    <Flex direction="column" gap="2">
                      <Text size="1" color="gray">API 地址</Text>
                      <TextField.Root
                        value={aiBaseUrl}
                        onChange={(e) => setAiBaseUrl(e.target.value)}
                        placeholder={aiProvider === "ollama" ? "http://localhost:11434/v1" : "https://api.deepseek.com"}
                      />
                    </Flex>
                  )}

                  <Flex direction="column" gap="2">
                    <Text size="1" color="gray">最大输出 Token: {aiMaxTokens[0]}</Text>
                    <Slider value={aiMaxTokens} onValueChange={setAiMaxTokens} min={256} max={8192} step={256} />
                    <Flex justify="between">
                      <Text size="1" color="gray">256</Text>
                      <Text size="1" color="gray">8192</Text>
                    </Flex>
                  </Flex>

                  <Flex direction="column" gap="2">
                    <Text size="1" color="gray">温度: {aiTemperature[0].toFixed(2)}</Text>
                    <Slider value={aiTemperature} onValueChange={setAiTemperature} min={0} max={2} step={0.05} />
                    <Flex justify="between">
                      <Text size="1" color="gray">0 (精确)</Text>
                      <Text size="1" color="gray">2 (创意)</Text>
                    </Flex>
                  </Flex>

                  <Flex direction="column" gap="2">
                    <Text size="1" color="gray">内容过滤</Text>
                    <Select.Root value={contentFilter} onValueChange={(v) => setContentFilter(v as typeof contentFilter)}>
                      <Select.Trigger />
                      <Select.Content className="vp-select-content">
                        <Select.Item value="strict">严格 — 拦截所有不安全内容</Select.Item>
                        <Select.Item value="moderate">适中 — 仅拦截违法/色情内容</Select.Item>
                        <Select.Item value="off">关闭 — 不做内容过滤</Select.Item>
                      </Select.Content>
                    </Select.Root>
                  </Flex>

                  <Button onClick={handleAiSave} disabled={aiSaving || (aiProvider !== "ollama" && !aiApiKey.trim())}>
                    {aiSaved ? "已保存" : "保存 AI 配置"}
                  </Button>
                </Flex>
              </Tabs.Content>

              <Tabs.Content value="memory">
                <Flex direction="column" gap="4">
                  <div>
                    <h3 className="text-base font-semibold">伴侣的记忆</h3>
                    <Text size="2" color="gray">TA 记住的关于你的事 — 可以查看、编辑或删除</Text>
                  </div>

                  {memoryFacts.map((fact) => (
                    <GlassCard key={fact.topic} variant="solid" padding="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{fact.topic}</span>
                            <span className="text-[10px] px-2 py-1 rounded-full" style={{
                              background: fact.confidence === "high" ? "var(--success)" : fact.confidence === "medium" ? "var(--warning)" : "var(--muted)",
                              color: fact.confidence === "high" ? "white" : "var(--foreground)",
                            }}>
                              {fact.confidence === "high" ? "高" : fact.confidence === "medium" ? "中" : "低"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">提及 {fact.mentions} 次</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{fact.content}</p>
                        </div>
                        <button
                          className="text-xs text-muted-foreground hover:text-destructive shrink-0"
                          onClick={async () => {
                            const result = await window.api.deleteMemoryFact(fact.topic);
                            const r = result as { success?: boolean; data?: typeof memoryFacts };
                            if (r.success && r.data) setMemoryFacts(r.data);
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </GlassCard>
                  ))}

                  {memoryFacts.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">还没有记忆 — 多和 TA 聊聊天吧</p>
                  )}

                  <GlassCard variant="solid" padding="p-4">
                    <div className="space-y-3">
                      <Text size="2" weight="medium">添加记忆</Text>
                      <Flex direction="column" gap="2">
                        <input
                          type="text"
                          className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-input text-foreground outline-none"
                          placeholder="话题（如：喜欢的食物）"
                          value={newTopic}
                          onChange={(e) => setNewTopic(e.target.value)}
                        />
                        <input
                          type="text"
                          className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-input text-foreground outline-none"
                          placeholder="内容（如：最喜欢吃火锅，尤其是麻辣锅）"
                          value={newContent}
                          onChange={(e) => setNewContent(e.target.value)}
                        />
                      </Flex>
                      <Button
                        disabled={!newTopic.trim() || !newContent.trim()}
                        onClick={async () => {
                          const result = await window.api.updateMemoryFact({ topic: newTopic.trim(), content: newContent.trim() });
                          const r = result as { success?: boolean; data?: typeof memoryFacts };
                          if (r.success && r.data) {
                            setMemoryFacts(r.data);
                            setNewTopic("");
                            setNewContent("");
                          }
                        }}
                      >
                        添加
                      </Button>
                    </div>
                  </GlassCard>
                </Flex>
              </Tabs.Content>

              <Tabs.Content value="character">
                <Flex direction="column" gap="4">
                  <Flex direction="column" gap="3">
                    <Flex gap="2">
                      <Flex direction="column" gap="1" style={{ flex: 1 }}>
                        <Text size="1" color="gray">年龄</Text>
                        <TextField.Root
                          type="number" value={profileAge ? String(profileAge) : ""}
                          onChange={(e) => setProfileAge(Number(e.target.value) || 0)}
                        />
                      </Flex>
                      <Flex direction="column" gap="1" style={{ flex: 1 }}>
                        <Text size="1" color="gray">城市</Text>
                        <TextField.Root value={profileCity} onChange={(e) => setProfileCity(e.target.value)} />
                      </Flex>
                    </Flex>
                    <Flex gap="2">
                      <Flex direction="column" gap="1" style={{ flex: 1 }}>
                        <Text size="1" color="gray">职业</Text>
                        <TextField.Root value={profileOccupation} onChange={(e) => setProfileOccupation(e.target.value)} />
                      </Flex>
                      <Flex direction="column" gap="1" style={{ flex: 1 }}>
                        <Text size="1" color="gray">学历</Text>
                        <TextField.Root value={profileEducation} onChange={(e) => setProfileEducation(e.target.value)} />
                      </Flex>
                    </Flex>
                    <Flex direction="column" gap="1">
                      <Text size="1" color="gray">专业</Text>
                      <TextField.Root value={profileMajor} onChange={(e) => setProfileMajor(e.target.value)} />
                    </Flex>
                  </Flex>

                  <Flex direction="column" gap="2">
                    <Text size="1" color="gray">性格标签</Text>
                    <div className="flex flex-wrap gap-3">
                      {TEMPERAMENT_TAGS.map((t) => (
                        <ToggleTag key={t} active={profileTemperament.includes(t)} onClick={() => toggleTag(
                          profileTemperament ? profileTemperament.split("、") : [],
                          (v) => setProfileTemperament(v.join("、")),
                          t,
                        )}>{t}</ToggleTag>
                      ))}
                    </div>
                    <TextField.Root
                      value={profileTemperament}
                      onChange={(e) => setProfileTemperament(e.target.value)}
                      placeholder="或自定义输入性格..."
                    />
                  </Flex>

                  <Flex direction="column" gap="2">
                    <Text size="1" color="gray">爱好</Text>
                    <div className="flex flex-wrap gap-3">
                      {HOBBY_TAGS.map((h) => (
                        <ToggleTag key={h} active={profileHobbies.includes(h)} onClick={() => toggleTag(profileHobbies, setProfileHobbies, h)}>{h}</ToggleTag>
                      ))}
                    </div>
                    <Flex direction="column" gap="1">
                      {profileHobbies.filter((h) => !HOBBY_TAGS.includes(h)).length > 0 && (
                        <div className="flex flex-wrap gap-3">
                          {profileHobbies.filter((h) => !HOBBY_TAGS.includes(h)).map((h) => (
                            <span key={h} className="rounded-lg text-sm font-medium"
                              style={{ padding: "10px 18px", background: "var(--primary)", color: "white" }}>
                              {h}
                              <button onClick={() => setProfileHobbies(profileHobbies.filter((i) => i !== h))}
                                style={{ marginLeft: 4, opacity: 0.7 }}>×</button>
                            </span>
                          ))}
                        </div>
                      )}
                      <TextField.Root
                        placeholder="输入自定义爱好后回车添加..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (val && !profileHobbies.includes(val)) {
                              setProfileHobbies([...profileHobbies, val]);
                              (e.target as HTMLInputElement).value = "";
                            }
                          }
                        }}
                      />
                    </Flex>
                  </Flex>

                  <Flex direction="column" gap="2">
                    <Text size="1" color="gray">日常节奏</Text>
                    <div className="flex flex-wrap gap-3">
                      {DAILY_TAGS.map((d) => (
                        <ToggleTag key={d} active={profileDailyLife === d} onClick={() => setProfileDailyLife(profileDailyLife === d ? "" : d)}>{d}</ToggleTag>
                      ))}
                    </div>
                    <TextField.Root
                      value={profileDailyLife}
                      onChange={(e) => setProfileDailyLife(e.target.value)}
                      placeholder="或自定义输入..."
                    />
                  </Flex>

                  <Flex direction="column" gap="2">
                    <Text size="1" color="gray">小特点</Text>
                    <div className="flex flex-wrap gap-3">
                      {QUIRK_TAGS.map((q) => (
                        <ToggleTag key={q} active={profileQuirks.includes(q)} onClick={() => toggleTag(profileQuirks, setProfileQuirks, q)}>{q}</ToggleTag>
                      ))}
                    </div>
                    <Flex direction="column" gap="1">
                      {profileQuirks.filter((q) => !QUIRK_TAGS.includes(q)).length > 0 && (
                        <div className="flex flex-wrap gap-3">
                          {profileQuirks.filter((q) => !QUIRK_TAGS.includes(q)).map((q) => (
                            <span key={q} className="rounded-lg text-sm font-medium"
                              style={{ padding: "10px 18px", background: "var(--primary)", color: "white" }}>
                              {q}
                              <button onClick={() => setProfileQuirks(profileQuirks.filter((i) => i !== q))}
                                style={{ marginLeft: 4, opacity: 0.7 }}>×</button>
                            </span>
                          ))}
                        </div>
                      )}
                      <TextField.Root
                        placeholder="输入自定义特点后回车添加..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (val && !profileQuirks.includes(val)) {
                              setProfileQuirks([...profileQuirks, val]);
                              (e.target as HTMLInputElement).value = "";
                            }
                          }
                        }}
                      />
                    </Flex>
                  </Flex>

                  <Flex direction="column" gap="1">
                    <Text size="1" color="gray">说话风格</Text>
                    <TextField.Root value={profileSpeakingStyle} onChange={(e) => setProfileSpeakingStyle(e.target.value)} />
                  </Flex>

                  <Flex direction="column" gap="1">
                    <Text size="1" color="gray">梗风格</Text>
                    <TextField.Root value={profileMemeStyle} onChange={(e) => setProfileMemeStyle(e.target.value)}
                      placeholder="如：贴吧老哥、微博吃瓜、小红书体..." />
                  </Flex>

                  {profileError && (
                    <Text size="1" style={{ color: "var(--red-9)" }}>{profileError}</Text>
                  )}

                  <Button onClick={handleProfileSave} disabled={profileSaving}>
                    {profileSaved ? "已保存" : "保存角色卡"}
                  </Button>
                </Flex>
              </Tabs.Content>

              <Tabs.Content value="data">
                <Flex direction="column" gap="4">
                  <Text size="2" weight="medium">数据管理</Text>

                  <Flex direction="column" gap="2">
                    <Button variant="soft" size="2" onClick={async () => {
                      const r = await window.api.exportProfile() as { success: boolean; error?: string };
                      if (!r.success) alert(r.error);
                    }}>导出角色卡</Button>
                    <Button variant="soft" size="2" onClick={async () => {
                      const r = await window.api.importProfile() as { success: boolean; error?: string };
                      if (!r.success) alert(r.error);
                      else { alert("导入成功，请重启应用"); onClose(); }
                    }}>导入角色卡</Button>
                  </Flex>

                  <Flex gap="2">
                    <Button variant="soft" size="2" style={{ flex: 1 }} onClick={async () => {
                      const r = await window.api.exportChat("json") as { success: boolean; error?: string };
                      if (!r.success) alert(r.error);
                    }}>导出聊天 (JSON)</Button>
                    <Button variant="soft" size="2" style={{ flex: 1 }} onClick={async () => {
                      const r = await window.api.exportChat("txt") as { success: boolean; error?: string };
                      if (!r.success) alert(r.error);
                    }}>导出聊天 (TXT)</Button>
                  </Flex>

                  <Flex direction="column" gap="4" mt="3">
                    <Text size="1" color="gray">
                      重置将删除所有数据，包括角色卡、AI 配置、聊天记录和记忆数据。操作后需要重新进行初始化设置。
                    </Text>

                    {resetStep === 0 && (
                      <Button color="red" variant="outline" size="2" onClick={handleReset}>
                        重置所有数据...
                      </Button>
                    )}

                    {resetStep === 1 && (
                      <Flex direction="column" gap="3" style={{
                        padding: 16,
                        border: "1px solid var(--red-8)",
                        borderRadius: "var(--radius-3)",
                        background: "var(--red-3)",
                      }}>
                        <Text size="1" weight="medium" style={{ color: "var(--red-9)" }}>
                          此操作不可撤销！所有数据将被永久删除。
                        </Text>
                        <Text size="1" color="gray">
                          请输入 "RESET" 确认删除：
                        </Text>
                        <TextField.Root
                          value={resetInput}
                          onChange={(e) => setResetInput(e.target.value)}
                          placeholder="输入 RESET"
                        />
                        <Flex gap="2">
                          <Button
                            color="red"
                            size="2"
                            disabled={resetInput !== "RESET" || resetLoading}
                            onClick={handleReset}
                          >
                            {resetLoading ? "删除中..." : "确认删除"}
                          </Button>
                          <Button variant="ghost" size="2" onClick={handleResetCancel}>
                            取消
                          </Button>
                        </Flex>
                      </Flex>
                    )}
                  </Flex>
                </Flex>
              </Tabs.Content>

              <Tabs.Content value="about">
                <Flex direction="column" align="center" gap="3">
                  <Flex
                    width="56px" height="56px" align="center" justify="center"
                    style={{ borderRadius: "var(--radius-4)", background: "var(--accent-3)" }}
                  >
                    <Heart size={24} color="var(--accent-9)" fill="var(--accent-9)" />
                  </Flex>
                  <Flex direction="column" align="center" gap="1">
                    <h4 className="text-lg font-semibold">梦间 / Yumema</h4>
                    <Text size="1" color="gray">{appVersion || "v0.0.1"}</Text>
                  </Flex>
                </Flex>

                <Flex direction="column" gap="3" style={{ borderTop: "1px solid var(--gray-4)", paddingTop: 16 }}>
                  <Text size="1" color="gray" align="center">
                    AI 伴侣桌面应用 — 基于 Electron + React 构建
                  </Text>
                  <Flex direction="column" gap="1" align="center" style={{ borderTop: "1px solid var(--gray-4)", paddingTop: 12 }}>
                    <Text size="1" color="gray">作者：梦夜十六</Text>
                    <Text size="1" color="gray">协议：GPL-3.0</Text>
                    <Text size="1" color="gray">仓库：github.com/sixtdreanight/Yumema</Text>
                    <Text size="1" color="gray">反馈：erk163@163.com</Text>
                  </Flex>
                  <Text size="1" color="gray" align="center" style={{ borderTop: "1px solid var(--gray-4)", paddingTop: 12 }}>
                    Copyright (c) 2026 DreamNight<br />
                    AI 生成内容不代表作者立场
                  </Text>
                </Flex>
              </Tabs.Content>
            </Flex>
          </Tabs.Root>
        </Flex>
        </GlassCard>
      </Dialog.Content>
    </Dialog.Root>
  );
}
