import { useState, useEffect } from "react";
import { Flex, Text, Button, Dialog } from "@radix-ui/themes";
import { Container } from "lucide-react";
import { GlassCard, CardHeader } from "../components/ui/GlassCard";

export default function WeChatSetup({ onBack }: { onBack: () => void }) {
  const [status, setStatus] = useState<Record<string, unknown>>({ status: "stopped", message: "" });

  useEffect(() => {
    window.api.getWeChatStatus().then((s: unknown) => setStatus(s as Record<string, unknown>));
    const unsub = window.api.on("wechat:status-changed", (s: unknown) => {
      setStatus(s as Record<string, unknown>);
    });
    return () => { unsub(); };
  }, []);

  const handleStart = async () => {
    const result = await window.api.startWeChat();
    if (!(result as { success: boolean }).success) {
      setStatus({ status: "error", message: (result as { error: string }).error });
    }
  };

  const handleStop = async () => {
    await window.api.stopWeChat();
  };

  const s = status.status as string;
  const isWorking = ["checking", "pulling", "starting"].includes(s);

  return (
    <Dialog.Root open onOpenChange={() => onBack()}>
      <Dialog.Content maxWidth="448px" style={{ padding: 0, background: "transparent" }}>
        <GlassCard padding="p-0">
          <CardHeader title="微信登录" onClose={onBack} />
          <div style={{ padding: "24px 28px 28px" }}>
            <Flex direction="column" align="center" gap="5">

            {isWorking && (
              <Flex direction="column" align="center" gap="4" className="scale-in">
                <div className="animate-spin" style={{ width: 48, height: 48, borderRadius: "50%", border: "2px solid var(--gray-5)", borderTopColor: "var(--accent-9)" }} />
                <Text size="2" color="gray">{status.message as string || "处理中..."}</Text>
              </Flex>
            )}

            {s === "waiting-qr" && (
              <Flex direction="column" align="center" gap="4" className="scale-in">
                <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-4)", background: "var(--secondary)" }}>
                  <div className="p-4">
                    <Flex direction="column" align="center" gap="3">
                      <Text size="2" color="gray">等待服务就绪...</Text>
                      <Text size="1" color="gray">请确保 Docker 正在运行</Text>
                    </Flex>
                  </div>
                </div>
              </Flex>
            )}

            {s === "connected" && (
              <Flex direction="column" align="center" gap="4" className="scale-in">
                <Flex width="64px" height="64px" align="center" justify="center"
                  style={{ borderRadius: "50%", background: "var(--green-3)" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green-9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </Flex>
                <Text size="3" weight="bold" style={{ color: "var(--green-9)" }}>微信已成功连接</Text>
                <Button color="red" variant="soft" onClick={handleStop} style={{ width: "100%" }}>停止服务</Button>
                <Button onClick={onBack} style={{ width: "100%" }}>返回聊天</Button>
              </Flex>
            )}

            {s === "error" && (
              <Flex direction="column" align="center" gap="4" className="scale-in">
                <Flex width="64px" height="64px" align="center" justify="center"
                  style={{ borderRadius: "50%", background: "var(--red-3)" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--red-9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                </Flex>
                <Text size="2" color="red">{status.message as string || "启动失败"}</Text>
                <Button onClick={handleStart} style={{ width: "100%" }}>重试</Button>
              </Flex>
            )}

            {s === "no-docker" && (
              <Flex direction="column" align="center" gap="4" className="scale-in">
                <Flex width="64px" height="64px" align="center" justify="center"
                  style={{ borderRadius: "50%", background: "var(--amber-3)" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--amber-9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                </Flex>
                <Text size="3" weight="bold">未检测到 Docker</Text>
                <Text size="2" color="gray" align="center">
                  微信接入需要 Docker 环境运行 Gewechat 服务。<br />
                  请先安装 <a href="https://www.docker.com" target="_blank" rel="noreferrer">Docker Desktop</a>
                </Text>
                <Button onClick={handleStart} style={{ width: "100%" }}>重新检测</Button>
              </Flex>
            )}

            {s !== "waiting-qr" && !isWorking && s !== "connected" && s !== "error" && s !== "no-docker" && (
              <Flex direction="column" align="center" gap="5" className="scale-in">
                <Flex width="64px" height="64px" align="center" justify="center"
                  style={{ borderRadius: "50%", background: "var(--accent-3)" }}>
                  <Container size={28} color="var(--accent-9)" />
                </Flex>
                <Flex direction="column" align="center" gap="1">
                  <Text size="5" weight="bold">连接微信机器人</Text>
                  <Text size="2" color="gray" align="center">
                    通过 Docker 运行 Gewechat 服务<br />需要先安装 Docker Desktop
                  </Text>
                </Flex>
                <Button size="3" onClick={handleStart} style={{ width: "100%" }}>
                  启动微信服务
                </Button>
              </Flex>
            )}

            </Flex>
          </div>
        </GlassCard>
      </Dialog.Content>
    </Dialog.Root>
  );
}
