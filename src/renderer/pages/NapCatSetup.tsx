import { useState, useEffect } from "react";
import { Flex, Text, Button } from "@radix-ui/themes";
import { Cat, ArrowLeft } from "lucide-react";
import TitleBar from "../components/shared/TitleBar";
import { GlassCard } from "../components/ui/GlassCard";

export default function NapCatSetup({ onBack }: { onBack: () => void }) {
  const [status, setStatus] = useState<Record<string, unknown>>({ status: "stopped", message: "" });
  const [qrData, setQrData] = useState<string | null>(null);

  useEffect(() => {
    window.api.getNapCatStatus().then((s: unknown) => setStatus(s as Record<string, unknown>));
    const unsub1 = window.api.on("napcat:status-changed", (s: unknown) => {
      setStatus(s as Record<string, unknown>);
    });
    const unsub2 = window.api.on("napcat:qr-ready", (data: unknown) => {
      setQrData((data as { qrData: string }).qrData);
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  const handleStart = async () => {
    setQrData(null);
    const result = await window.api.startNapCat();
    if (!(result as { success: boolean }).success) {
      setStatus({ status: "error", message: (result as { error: string }).error });
    }
  };

  const s = status.status as string;
  const isWorking = ["downloading", "extracting", "configuring", "starting"].includes(s);

  return (
    <Flex direction="column" height="100vh" className="page-enter"
      style={{ background: "transparent" }}>
      <TitleBar height={56} borderColor="transparent" background="transparent" justify="start">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          style={{ WebkitAppRegion: "no-drag" }}
        >
          <ArrowLeft size={16} />
        </button>
        <h3 className="text-base font-semibold ml-3">QQ 登录</h3>
      </TitleBar>

      <Flex flexGrow="1" align="center" justify="center" p="8">
        <GlassCard padding="p-10" className="w-full" style={{ maxWidth: 420 }}>
          <Flex direction="column" align="center" gap="6">

          {(s === "waiting-qr" || qrData) && (
            <Flex direction="column" align="center" gap="4" className="scale-in">
              <div
                style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-4)", background: "var(--secondary)" }}>
                <div className="p-5">
                <Flex direction="column" align="center" gap="3">
                <Flex width="144px" height="144px" align="center" justify="center"
                  style={{ background: "var(--gray-3)", borderRadius: "var(--radius-3)" }}>
                  <Text size="1" color="gray">
                    {qrData ? "QR 码" : "准备中..."}
                  </Text>
                </Flex>
                <Text size="1" color="gray">
                  {qrData ? "请用手机 QQ 扫描" : "准备中..."}
                </Text>
              </Flex>
                </div>
              </div>
              <Text size="2" color="gray">请使用手机 QQ 扫描二维码登录</Text>
            </Flex>
          )}

          {isWorking && (
            <Flex direction="column" align="center" gap="4" className="scale-in">
              <div className="animate-spin" style={{ width: 48, height: 48, borderRadius: "50%", border: "2px solid var(--gray-5)", borderTopColor: "var(--accent-9)" }} />
              <Text size="2" color="gray">{status.message as string || "处理中..."}</Text>
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
              <Text size="3" weight="semibold" style={{ color: "var(--green-9)" }}>QQ 已成功连接</Text>
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

          {s !== "waiting-qr" && !qrData && !isWorking && s !== "connected" && s !== "error" && (
            <Flex direction="column" align="center" gap="6" className="scale-in">
              <Flex width="64px" height="64px" align="center" justify="center"
                style={{ borderRadius: "50%", background: "var(--accent-3)" }}>
                <Cat size={28} color="var(--accent-9)" />
              </Flex>
              <Flex direction="column" align="center" gap="1">
                <h2 className="text-lg font-semibold">连接 QQ 机器人</h2>
                <Text size="2" color="gray" align="center">
                  启动后需要扫码登录 QQ<br />建议使用小号，存在封号风险
                </Text>
              </Flex>
              <Button size="4" onClick={handleStart} style={{ width: "100%" }}>
                启动 NapCatQQ
              </Button>
              <Text size="2" color="gray" onClick={onBack} style={{ cursor: "pointer" }}>
                暂时跳过
              </Text>
            </Flex>
          )}
          </Flex>
        </GlassCard>
      </Flex>
    </Flex>
  );
}
