import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../ui/select";
import { Slider } from "../ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";

const ANTHROPIC_MODELS = [
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
  { value: "claude-haiku-4-20250514", label: "Claude Haiku 4" },
];

const OPENAI_MODELS = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
];

function getModels(provider: string) {
  if (provider === "anthropic") return ANTHROPIC_MODELS;
  if (provider === "openai") return OPENAI_MODELS;
  return [];
}

export default function SettingsDialog({
  onClose,
}: {
  onClose: () => void;
  onOpenNapCat?: () => void;
}) {
  // AI edit state
  const [aiProvider, setAiProvider] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiBaseUrl, setAiBaseUrl] = useState("");
  const [aiMaxTokens, setAiMaxTokens] = useState(2048);
  const [aiTemperature, setAiTemperature] = useState(0.85);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);

  useEffect(() => {
    window.api.getConfig().then((c: unknown) => {
      const cfg = c as Record<string, unknown>;
      const ai = cfg.ai as Record<string, unknown> | undefined;
      if (ai) {
        setAiProvider((ai.provider as string) || "anthropic");
        setAiModel((ai.model as string) || "");
        setAiApiKey((ai.apiKey as string) || "");
        setAiBaseUrl((ai.baseUrl as string) || "");
        setAiMaxTokens((ai.maxTokens as number) || 2048);
        setAiTemperature((ai.temperature as number) || 0.85);
      }
    });
  }, []);

  const handleAiSave = async () => {
    setAiSaving(true);
    setAiSaved(false);
    await window.api.updateConfig({
      ai: {
        provider: aiProvider,
        model: aiModel,
        apiKey: aiApiKey,
        baseUrl: aiBaseUrl || undefined,
        maxTokens: aiMaxTokens,
        temperature: aiTemperature,
      },
    });
    setAiSaving(false);
    setAiSaved(true);
    setTimeout(() => setAiSaved(false), 2000);
  };

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent
        className="w-[400px] glass border-l border-border p-0 z-overlay"
        style={{ boxShadow: "var(--vp-shadow-xl)" }}
      >
        <div className="flex flex-col h-full">
          <SheetHeader className="px-5 py-4 border-b border-border shrink-0">
            <SheetTitle className="text-sm font-medium">设置</SheetTitle>
          </SheetHeader>

          <Tabs defaultValue="ai" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid grid-cols-2 mx-5 mt-3">
              <TabsTrigger value="ai" className="text-xs">AI 配置</TabsTrigger>
              <TabsTrigger value="about" className="text-xs">关于</TabsTrigger>
            </TabsList>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <TabsContent value="ai" className="space-y-3 mt-0">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">服务商</label>
                    <Select value={aiProvider} onValueChange={(v) => { setAiProvider(v); setAiModel(""); }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="anthropic">Claude (Anthropic)</SelectItem>
                        <SelectItem value="openai">OpenAI (GPT 系列)</SelectItem>
                        <SelectItem value="openai-compatible">其他兼容接口</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {aiProvider !== "openai-compatible" && getModels(aiProvider).length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">模型</label>
                      <Select value={aiModel} onValueChange={setAiModel}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择模型..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>可用模型</SelectLabel>
                            {getModels(aiProvider).map((m) => (
                              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {aiProvider === "openai-compatible" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">模型名称</label>
                      <Input
                        type="text"
                        value={aiModel}
                        onChange={(e) => setAiModel(e.target.value)}
                        placeholder="deepseek-chat / gpt-4o-mini"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">API Key</label>
                    <Input
                      type="password"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder="sk-..."
                    />
                  </div>

                  {aiProvider === "openai-compatible" && (
                    <div className="space-y-1.5 fade-in">
                      <label className="text-xs font-medium text-muted-foreground">API 地址</label>
                      <Input
                        type="text"
                        value={aiBaseUrl}
                        onChange={(e) => setAiBaseUrl(e.target.value)}
                        placeholder="https://api.deepseek.com"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      最大输出 Token: {aiMaxTokens}
                    </label>
                    <Slider
                      value={[aiMaxTokens]}
                      onValueChange={([v]) => setAiMaxTokens(v)}
                      min={256}
                      max={8192}
                      step={256}
                    />
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>256</span>
                      <span>8192</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      温度: {aiTemperature.toFixed(2)}
                    </label>
                    <Slider
                      value={[aiTemperature]}
                      onValueChange={([v]) => setAiTemperature(v)}
                      min={0}
                      max={2}
                      step={0.05}
                    />
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>0 (精确)</span>
                      <span>2 (创意)</span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleAiSave}
                    loading={aiSaving}
                    disabled={!aiApiKey.trim()}
                  >
                    {aiSaved ? "已保存" : "保存 AI 配置"}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="about" className="space-y-4 mt-0">
                <div className="flex flex-col items-center gap-3 py-4">
                  <Avatar
                    className="w-14 h-14 rounded-2xl"
                    style={{ background: "var(--vp-primary-soft)" }}
                  >
                    <AvatarFallback className="bg-transparent">
                      <Heart className="w-6 h-6 text-primary" fill="currentColor" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <h4 className="text-sm font-medium">V-Partner</h4>
                    <p className="text-xs mt-0.5 text-muted-foreground">v1.0.0-beta.6 — AI 伴侣桌面应用</p>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-center px-4 text-muted-foreground">
                  仅供学习娱乐，AI 生成内容不代表作者立场。<br />
                  因使用本软件产生的任何后果由用户自担。
                </p>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
