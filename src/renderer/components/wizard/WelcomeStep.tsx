import Button from "../ui/Button";
import Badge from "../ui/Badge";

export default function WelcomeStep({ next }: { next: () => void }) {
  return (
    <div className="text-center space-y-10">
      <div className="space-y-5">
        {/* Logo */}
        <div
          className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center shadow-xl shadow-violet-500/20"
          style={{ background: "linear-gradient(135deg, var(--vp-primary-soft), #ede9fe)" }}
        >
          <span className="text-3xl">💕</span>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100">V-Partner</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">创建属于你的 AI 伴侣</p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2">
          <Badge variant="primary">记住你的一切</Badge>
          <Badge variant="default">陪聊倾诉</Badge>
          <Badge variant="default">QQ 机器人</Badge>
        </div>
      </div>

      <Button variant="primary" size="lg" className="w-full" onClick={next}>
        开始设置
      </Button>

      <p className="text-[11px] text-zinc-400 dark:text-zinc-500">14 步简单配置，约 2 分钟完成</p>
    </div>
  );
}
