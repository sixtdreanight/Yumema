import CardSelect from "../shared/CardSelect";
import { Input, Field } from "../ui/Input";

const PROVIDERS = [
  { value: "anthropic" as const, label: "Claude (Anthropic)", desc: "推荐 — 擅长中文、细腻的对话风格" },
  { value: "openai" as const, label: "OpenAI (GPT 系列)", desc: "功能强大、响应迅速" },
  { value: "openai-compatible" as const, label: "其他兼容接口", desc: "DeepSeek / 硅基流动 / 等" },
];

export default function AIProviderStep({
  data, update,
}: {
  data: { aiProvider: string; aiApiKey: string; aiBaseUrl: string };
  update: (d: Partial<{ aiProvider: string; aiApiKey: string; aiBaseUrl: string }>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">选择 AI 服务商</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">TA 的智能由你选择的 AI 驱动</p>
      </div>

      <CardSelect
        options={PROVIDERS}
        value={data.aiProvider}
        onChange={(v) => update({ aiProvider: v })}
      />

      <div className="space-y-3">
        <Field label="API Key">
          <Input
            type="password"
            value={data.aiApiKey}
            onChange={(e) => update({ aiApiKey: e.target.value })}
            placeholder="sk-..."
          />
        </Field>

        {data.aiProvider === "openai-compatible" && (
          <div className="fade-in">
            <Field label="API 地址">
              <Input
                type="text"
                value={data.aiBaseUrl}
                onChange={(e) => update({ aiBaseUrl: e.target.value })}
                placeholder="https://api.deepseek.com"
              />
            </Field>
          </div>
        )}
      </div>
    </div>
  );
}
