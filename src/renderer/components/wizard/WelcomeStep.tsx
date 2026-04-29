import { Heart, AlertTriangle } from "lucide-react";
import { Button } from "../ui/button";

export default function WelcomeStep({ next }: { next: () => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div
          className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
          style={{ background: "var(--vp-primary-soft)" }}
        >
          <Heart className="w-7 h-7 text-primary" fill="currentColor" />
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-medium">V-Partner</h1>
          <p className="text-sm text-muted-foreground">创建属于你的 AI 伴侣</p>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground max-w-xs mx-auto">
          TA 有自己的性格、爱好和记忆，可以通过 QQ、微信或应用内直接聊天。接下来 14 步完成配置，约 2 分钟。
        </p>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <span>选择性格</span>
          <span>→</span>
          <span>设置 AI</span>
          <span>→</span>
          <span>连接平台</span>
        </div>
      </div>

      <div
        className="rounded-xl p-4 space-y-2.5 text-left"
        style={{ background: "var(--vp-warning-soft)", border: "1px solid var(--vp-warning)" }}
      >
        <div className="flex items-center gap-2 text-[13px] font-medium" style={{ color: "var(--vp-warning)" }}>
          <AlertTriangle className="w-4 h-4" />
          使用前请阅读
        </div>
        <ul className="text-[11px] leading-relaxed space-y-1 text-muted-foreground list-disc list-inside">
          <li>AI 生成内容不代表作者立场，仅供学习娱乐</li>
          <li>QQ 使用第三方协议，建议使用小号</li>
          <li>AI API 按量计费，频繁聊天会产生费用</li>
          <li>请勿透露身份证、银行卡等敏感信息</li>
          <li>TA 不能替代真实人际关系</li>
        </ul>
      </div>

      <div className="space-y-3">
        <Button variant="primary" size="lg" className="w-full" onClick={next}>
          开始设置
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">14 步简单配置，约 2 分钟完成</p>
      </div>
    </div>
  );
}
