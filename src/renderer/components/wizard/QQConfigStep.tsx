import { useState, useEffect } from "react";
import { Input, Field } from "../ui/Input";
import Badge from "../ui/Badge";
import Button from "../ui/Button";

const STATUS_LABELS: Record<string, string> = {
  stopped: "未启动",
  downloading: "下载中...",
  extracting: "解压中...",
  configuring: "配置中...",
  starting: "启动中...",
  "waiting-qr": "等待扫码",
  connected: "已连接",
  error: "错误",
};

export default function QQConfigStep({
  data, update,
}: {
  data: { qqWsUrl: string; qqAccessToken: string };
  update: (d: Partial<{ qqWsUrl: string; qqAccessToken: string }>) => void;
}) {
  const [napCatStatus, setNapCatStatus] = useState<string>("stopped");

  useEffect(() => {
    window.api.getNapCatStatus().then((s: unknown) => {
      setNapCatStatus((s as { status: string }).status);
    });
    const unsub = window.api.on("napcat:status-changed", (s: unknown) => {
      setNapCatStatus((s as { status: string }).status);
    });
    return unsub;
  }, []);

  const handleStartNapCat = async () => {
    await window.api.startNapCat();
  };

  const isConnected = napCatStatus === "connected";
  const isWorking = ["downloading", "extracting", "configuring", "starting", "waiting-qr"].includes(napCatStatus);
  const canStart = ["stopped", "error"].includes(napCatStatus);

  const badgeVariant = isConnected ? "success" : napCatStatus === "error" ? "error" : "default";

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">配置 QQ 机器人</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">让 TA 能在 QQ 上和你聊天</p>
      </div>

      {/* NapCatQQ status card */}
      <div className="rounded-xl p-4 space-y-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">NapCatQQ</span>
          <Badge variant={badgeVariant} dot>
            {STATUS_LABELS[napCatStatus] || napCatStatus}
          </Badge>
        </div>

        {isWorking && (
          <div className="flex items-center gap-2 fade-in">
            <div className="w-4 h-4 rounded-full border-2 border-zinc-200 dark:border-zinc-700 border-t-violet-500 animate-spin" />
            <span className="text-xs text-zinc-400 dark:text-zinc-500">{STATUS_LABELS[napCatStatus]}</span>
          </div>
        )}

        <Button
          variant={canStart ? "primary" : "secondary"}
          className="w-full"
          disabled={!canStart}
          loading={isWorking}
          onClick={handleStartNapCat}
        >
          {napCatStatus === "stopped" ? "启动 NapCatQQ" : isWorking ? "启动中..." : "重新启动"}
        </Button>
      </div>

      {/* Manual config fields */}
      <div className="space-y-3">
        <Field label="WebSocket 地址（可选，自动填充）">
          <Input
            type="text"
            value={data.qqWsUrl}
            onChange={(e) => update({ qqWsUrl: e.target.value })}
            placeholder="ws://localhost:3001"
          />
        </Field>
        <Field label="Access Token（可选，自动填充）">
          <Input
            type="text"
            value={data.qqAccessToken}
            onChange={(e) => update({ qqAccessToken: e.target.value })}
            placeholder="自动生成"
          />
        </Field>
      </div>

      <p className="text-xs text-center text-zinc-400 dark:text-zinc-500">
        也可稍后在设置中配置，或使用终端模式不依赖 QQ
      </p>
    </div>
  );
}
