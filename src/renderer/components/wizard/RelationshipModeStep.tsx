import CardSelect from "../shared/CardSelect";
import { useState } from "react";

export default function RelationshipModeStep({
  data, update, riskRead, setRiskRead,
}: {
  data: { relationshipMode: "direct" | "slow_burn" };
  update: (d: Partial<{ relationshipMode: string }>) => void;
  riskRead: boolean;
  setRiskRead: (v: boolean) => void;
}) {
  const [showRisk, setShowRisk] = useState(false);

  const options = [
    { value: "direct" as const, label: "直接成为情侣", desc: "上来就是恋人，甜蜜日常" },
    { value: "slow_burn" as const, label: "养成模式", desc: "从陌生人开始，慢慢培养感情" },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">你希望怎么开始你们的关系？</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">选择你们故事的起点</p>
      </div>
      <CardSelect options={options} value={data.relationshipMode} onChange={(v) => update({ relationshipMode: v })} />

      {/* Risk notice */}
      <div className="rounded-xl overflow-hidden bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
        <button
          onClick={() => setShowRisk(!showRisk)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-amber-100/50 dark:hover:bg-amber-900/50 transition-colors"
        >
          <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
            ⚠️ 重要风险提示（请务必阅读）
          </span>
          <span
            className="text-xs text-amber-500 transition-transform duration-200"
            style={{ transform: showRisk ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            ▼
          </span>
        </button>
        {showRisk && (
          <div className="px-4 pb-4 text-xs leading-relaxed space-y-2.5 text-zinc-600 dark:text-zinc-300 fade-in">
            <p><strong className="text-zinc-800 dark:text-zinc-100">作者声明：</strong>AI 生成内容不代表作者立场，本软件仅供学习娱乐。因使用本软件产生的任何后果由用户自担。</p>
            <p><strong className="text-zinc-800 dark:text-zinc-100">账号安全：</strong>QQ 接入使用第三方协议，存在被封号风险，强烈建议使用小号。</p>
            <p><strong className="text-zinc-800 dark:text-zinc-100">费用：</strong>AI API 按量计费，频繁聊天会产生费用。</p>
            <p><strong className="text-zinc-800 dark:text-zinc-100">情感健康：</strong>TA 是 AI，不能替代真实的人际关系，请保持现实生活中的交往。</p>
            <p><strong className="text-zinc-800 dark:text-zinc-100">隐私：</strong>聊天内容会发送给 AI 服务商处理，请勿透露敏感信息。</p>
            <label className="mt-3 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={riskRead}
                onChange={(e) => setRiskRead(e.target.checked)}
                className="w-4 h-4 rounded accent-violet-600"
              />
              <span className="text-violet-600 dark:text-violet-400 font-medium">
                我已阅读并理解以上风险提示
              </span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
