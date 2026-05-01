import { useState, useEffect } from "react";
import { Flex } from "@radix-ui/themes";
import { MessageCircle, MessageSquare } from "lucide-react";
import { Badge } from "../ui/Badge";
import Button from "../ui/Button";
import { GlassCard } from "../ui/GlassCard";

const QQ_STATUS_LABELS: Record<string, string> = {
  stopped: "未启动",
  downloading: "下载中...",
  extracting: "解压中...",
  configuring: "配置中...",
  starting: "启动中...",
  "waiting-qr": "等待扫码",
  connected: "已连接",
  error: "错误",
};

const WECHAT_STATUS_LABELS: Record<string, string> = {
  stopped: "未启动",
  checking: "检查中...",
  pulling: "拉取镜像...",
  starting: "启动中...",
  "waiting-qr": "等待登录",
  connected: "运行中",
  error: "错误",
  "no-docker": "未安装 Docker",
};

export default function PlatformSetupStep({
  data,
  update,
}: {
  data: {
    qqEnabled: boolean;
    wechatEnabled: boolean;
    qqWsUrl: string;
    qqAccessToken: string;
    wechatBaseUrl: string;
    wechatFileUrl: string;
  };
  update: (d: Partial<{
    qqEnabled: boolean;
    wechatEnabled: boolean;
    qqWsUrl: string;
    qqAccessToken: string;
    wechatBaseUrl: string;
    wechatFileUrl: string;
  }>) => void;
}) {
  const [qqStatus, setQqStatus] = useState<string>("stopped");
  const [wechatStatus, setWechatStatus] = useState<string>("stopped");

  useEffect(() => {
    window.api.getNapCatStatus().then((s: unknown) => {
      setQqStatus((s as { status: string }).status);
    });
    const unsubQq = window.api.on("napcat:status-changed", (s: unknown) => {
      setQqStatus((s as { status: string }).status);
    });

    window.api.getWeChatStatus().then((s: unknown) => {
      setWechatStatus((s as { status: string }).status);
    });
    const unsubWc = window.api.on("wechat:status-changed", (s: unknown) => {
      setWechatStatus((s as { status: string }).status);
    });

    return () => { unsubQq(); unsubWc(); };
  }, []);

  const handleStartQq = async () => {
    update({ qqEnabled: true });
    const result = await window.api.startNapCat() as { success: boolean; error?: string };
    if (!result.success) {
      alert(`QQ 启动失败: ${result.error}`);
      update({ qqEnabled: false });
    }
  };

  const handleStartWechat = async () => {
    update({ wechatEnabled: true });
    const result = await window.api.startWeChat() as { success: boolean; error?: string };
    if (!result.success) {
      alert(`微信启动失败: ${result.error}`);
      update({ wechatEnabled: false });
    }
  };

  const qqConnected = qqStatus === "connected";
  const qqWorking = ["downloading", "extracting", "configuring", "starting", "waiting-qr"].includes(qqStatus);
  const qqCanStart = ["stopped", "error"].includes(qqStatus);

  const wcConnected = wechatStatus === "connected";
  const wcWorking = ["checking", "pulling", "starting", "waiting-qr"].includes(wechatStatus);
  const wcCanStart = ["stopped", "error", "no-docker"].includes(wechatStatus);

  return (
    <Flex direction="column" gap="6">
      <Flex direction="column" gap="1">
        <h2 className="text-lg font-semibold">连接聊天平台</h2>
        <p className="text-sm text-muted-foreground">让 TA 能在 QQ 或微信上和你聊天</p>
      </Flex>

      {/* QQ Card */}
      <GlassCard variant="solid" padding="p-4">
        <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold">QQ</span>
          </div>
          <Badge
            variant={qqConnected ? "success" : qqStatus === "error" ? "error" : "default"}
            dot
          >
            {QQ_STATUS_LABELS[qqStatus] || qqStatus}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground">
          自动下载并启动 NapCatQQ，扫码即可登录。建议使用小号。
        </p>

        <Button
          variant={qqCanStart ? "primary" : "secondary"}
          size="sm"
          className="w-full"
          disabled={!qqCanStart}
          loading={qqWorking}
          onClick={handleStartQq}
        >
          {qqStatus === "stopped" ? "启动 NapCatQQ" : qqWorking ? "处理中..." : "重新启动"}
        </Button>

        {!data.qqEnabled && (
          <button
            onClick={() => update({ qqEnabled: false })}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            跳过 QQ 配置
          </button>
        )}
        </div>
      </GlassCard>

      {/* WeChat Card */}
      <GlassCard variant="solid" padding="p-4">
        <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-semibold">微信</span>
          </div>
          <Badge
            variant={wcConnected ? "success" : wechatStatus === "error" || wechatStatus === "no-docker" ? "error" : "default"}
            dot
          >
            {WECHAT_STATUS_LABELS[wechatStatus] || wechatStatus}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground">
          自动启动 Gewechat Docker 容器。需预先安装 Docker。
        </p>

        <Button
          variant={wcCanStart ? "primary" : "secondary"}
          size="sm"
          className="w-full"
          disabled={!wcCanStart}
          loading={wcWorking}
          onClick={handleStartWechat}
        >
          {wechatStatus === "stopped" ? "启动 Gewechat" : wcWorking ? "处理中..." : "重新启动"}
        </Button>

        {!data.wechatEnabled && (
          <button
            onClick={() => update({ wechatEnabled: false })}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            跳过微信配置
          </button>
        )}
        </div>
      </GlassCard>

      <p className="text-xs text-center text-muted-foreground">
        也可稍后在设置中配置，不影响应用内聊天
      </p>
    </Flex>
  );
}
