import { useState } from "react";
import { Flex, Text } from "@radix-ui/themes";
import Button from "../ui/Button";
import { GlassCard, CardHeader, DialogOverlay } from "../ui/GlassCard";
import ToggleTag from "../shared/ToggleTag";

const STORAGE_KEY = "yumema_survey";
const TRIGGER_COUNT = 20;
const DISMISS_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

export function shouldShowSurvey(): boolean {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (data.dismissed) {
      const dismissedAt = data.dismissedAt || 0;
      if (Date.now() - dismissedAt < DISMISS_DURATION) return false;
      // Reset after 30 days
      data.dismissed = false;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
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

const EMOJI_RATINGS = [
  { value: 1, emoji: "😞", label: "很差" },
  { value: 2, emoji: "😕", label: "不太好" },
  { value: 3, emoji: "😐", label: "一般" },
  { value: 4, emoji: "😊", label: "不错" },
  { value: 5, emoji: "😍", label: "很棒" },
];

const FEATURES = ["应用内聊天", "QQ 机器人", "微信机器人"];
const PROBLEMS = [
  "QQ 无法连接",
  "回复答非所问",
  "回复太慢",
  "软件闪退/卡死",
  "安装失败",
  "设置太复杂",
  "界面不好看",
];

export default function SurveyDialog({ onClose }: { onClose: () => void }) {
  const [satisfaction, setSatisfaction] = useState(0);
  const [features, setFeatures] = useState<string[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [otherProblem, setOtherProblem] = useState("");
  const [missing, setMissing] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const toggle = (list: string[], set: (v: string[]) => void, item: string) => {
    set(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const handleSubmit = async () => {
    try {
      await window.api.submitSurvey({
        satisfaction,
        features,
        problems: otherProblem ? [...problems, otherProblem] : problems,
        missing,
        notes,
      });
    } catch {
      // ignore — data saved locally even if IPC fails
    }
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      data.submitted = true;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
    setSubmitted(true);
  };

  const handleDismiss = () => {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      data.dismissed = true;
      data.dismissedAt = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
    onClose();
  };

  if (submitted) {
    return (
      <DialogOverlay onClose={onClose} offset="pt-0">
        <div className="w-[480px] scale-in">
          <GlassCard padding="p-8">
            <div className="text-center space-y-4">
              <div style={{ fontSize: 48 }}>😍</div>
              <h3 className="text-lg font-semibold">感谢你的反馈！</h3>
              <p className="text-sm text-muted-foreground">
                你的意见会帮助我们让 Yumema 变得更好
              </p>
              <Button variant="primary" onClick={onClose}>完成</Button>
            </div>
          </GlassCard>
        </div>
      </DialogOverlay>
    );
  }

  return (
    <DialogOverlay onClose={onClose} offset="pt-0">
      <div className="w-[480px] scale-in">
        <GlassCard padding="p-0">
          <CardHeader title="帮助我们改进" onClose={onClose} />
          <div className="max-h-[70vh] overflow-y-auto">
          <Flex direction="column" px="6" py="5" gap="4">
            {/* Satisfaction */}
            <GlassCard variant="solid" padding="p-4">
              <div className="space-y-3">
              <label className="text-sm font-medium">你对 Yumema 的整体感受？</label>
              <div className="flex items-center justify-center gap-3">
                {EMOJI_RATINGS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setSatisfaction(r.value)}
                    className="flex flex-col items-center gap-1 transition-all"
                    style={{
                      transform: satisfaction === r.value ? "scale(1.25)" : "scale(1)",
                      opacity: satisfaction === 0 || satisfaction === r.value ? 1 : 0.5,
                      filter: satisfaction === 0 || satisfaction === r.value ? "none" : "grayscale(0.5)",
                    }}
                  >
                    <span style={{ fontSize: 28 }}>{r.emoji}</span>
                    <span className="text-xs text-muted-foreground">{r.label}</span>
                  </button>
                ))}
                </div>
              </div>
            </GlassCard>

            {/* Features */}
            <Flex direction="column" gap="2">
              <Text size="1" color="gray">你主要使用哪些功能？（多选）</Text>
              <div className="flex flex-wrap gap-3">
                {FEATURES.map((f) => (
                  <ToggleTag key={f} active={features.includes(f)} onClick={() => toggle(features, setFeatures, f)}>
                    {f}
                  </ToggleTag>
                ))}
              </div>
            </Flex>

            {/* Problems */}
            <Flex direction="column" gap="2">
              <Text size="1" color="gray">遇到了哪些问题？（多选）</Text>
              <div className="flex flex-wrap gap-3">
                {PROBLEMS.map((p) => (
                  <ToggleTag key={p} active={problems.includes(p)} onClick={() => toggle(problems, setProblems, p)} variant="destructive">
                    {p}
                  </ToggleTag>
                ))}
              </div>
              <input
                type="text"
                value={otherProblem}
                onChange={(e) => setOtherProblem(e.target.value)}
                placeholder="其他问题..."
                style={{ width: "100%", padding: "8px 12px", borderRadius: "var(--radius-3)", fontSize: 14, background: "var(--background)", border: "1px solid var(--input)", color: "var(--foreground)", outline: "none" }}
              />
            </Flex>

            {/* Missing features */}
            <Flex direction="column" gap="2">
              <Text size="1" color="gray">缺少什么功能？（选填）</Text>
              <input
                type="text"
                value={missing}
                onChange={(e) => setMissing(e.target.value)}
                placeholder="例如：语音消息、多语言..."
                style={{ width: "100%", padding: "8px 12px", borderRadius: "var(--radius-3)", fontSize: 14, background: "var(--background)", border: "1px solid var(--input)", color: "var(--foreground)", outline: "none" }}
              />
            </Flex>

            {/* Notes */}
            <Flex direction="column" gap="2">
              <Text size="1" color="gray">还有什么想说的？（选填）</Text>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="任何想法都可以告诉我们..."
                rows={2}
                className="w-full px-4 py-3 rounded-xl text-sm bg-background border border-input text-foreground outline-none resize-none placeholder:text-muted-foreground"
              />
            </Flex>
          </Flex>

          {/* Footer */}
          <Flex px="6" pb="4" align="center" gap="3">
            <Button variant="primary" className="flex-1 gradient-btn" onClick={handleSubmit} disabled={satisfaction === 0}>
              提交反馈
            </Button>
            <button
              onClick={handleDismiss}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              不再提示
            </button>
          </Flex>
          </div>
        </GlassCard>
      </div>
    </DialogOverlay>
  );
}
