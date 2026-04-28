import { useState } from "react";
import Button from "../ui/Button";

const STORAGE_KEY = "vpartner_survey";
const TRIGGER_COUNT = 20;

export function shouldShowSurvey(): boolean {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (data.dismissed) return false;
    const count = data.msgCount || 0;
    return count >= TRIGGER_COUNT && !data.submitted;
  } catch {
    return false;
  }
}

export function incrementMsgCount() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    data.msgCount = (data.msgCount || 0) + 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export default function SurveyDialog({ onClose }: { onClose: () => void }) {
  const [rating, setRating] = useState(0);
  const [best, setBest] = useState("");
  const [worst, setWorst] = useState("");
  const [nps, setNps] = useState<number | null>(null);
  const [suggestion, setSuggestion] = useState("");

  const handleSubmit = () => {
    const body = [
      `【整体满意度】${rating} / 5`,
      `【最满意的功能】${best || "未填写"}`,
      `【最不满意/遇到问题】${worst || "未填写"}`,
      `【推荐意愿 NPS】${nps !== null ? nps : "未填写"} / 10`,
      `【建议】${suggestion || "未填写"}`,
      "",
      `版本：${navigator.userAgent}`,
      `时间：${new Date().toLocaleString("zh-CN")}`,
    ].join("\n");

    const mailto = `mailto:erk163@163.com?subject=${encodeURIComponent("V-Partner 测试反馈")}&body=${encodeURIComponent(body)}`;
    window.open(mailto, "_blank");

    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      data.submitted = true;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
    onClose();
  };

  const handleDismiss = () => {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      data.dismissed = true;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm fade-in">
      <div className="w-[420px] max-h-[80vh] rounded-2xl overflow-y-auto flex flex-col glass border border-zinc-200/60 dark:border-zinc-700/60 shadow-xl scale-in p-6 space-y-5">
        <div className="text-center space-y-1">
          <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">帮助我们改进 V-Partner</h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">测试版问卷（约 1 分钟）</p>
        </div>

        <div className="space-y-4">
          {/* 满意度 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">整体满意度</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  className={`text-xl transition-transform ${n <= rating ? "scale-110" : "opacity-30"}`}
                >
                  ⭐
                </button>
              ))}
            </div>
          </div>

          {/* 最满意 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">最满意的功能</label>
            <input
              type="text"
              value={best}
              onChange={(e) => setBest(e.target.value)}
              placeholder="例如：AI 回复很真实、设置向导简单..."
              className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            />
          </div>

          {/* 最不满意 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">最不满意或遇到的问题</label>
            <input
              type="text"
              value={worst}
              onChange={(e) => setWorst(e.target.value)}
              placeholder="例如：QQ 连不上、回复太慢..."
              className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            />
          </div>

          {/* NPS */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">愿意推荐给朋友吗？（0-10）</label>
            <div className="flex gap-1">
              {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                <button
                  key={n}
                  onClick={() => setNps(n)}
                  className={`w-7 h-7 rounded-lg text-[10px] font-medium transition-colors ${
                    nps === n
                      ? "bg-violet-500 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* 建议 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">其他建议（可选）</label>
            <textarea
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder="任何想法都可以告诉我们..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 outline-none resize-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button variant="primary" className="flex-1" onClick={handleSubmit}>
            提交反馈
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>稍后</Button>
          <button
            onClick={handleDismiss}
            className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 ml-auto"
          >
            不再提示
          </button>
        </div>
      </div>
    </div>
  );
}
