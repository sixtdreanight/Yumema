import { useState, useEffect } from "react";
import { Cat } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

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
    <div className="h-screen flex flex-col bg-background page-enter">
      <header className="h-14 flex items-center px-5 shrink-0 glass border-b border-border">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="text-sm font-semibold ml-3">QQ 登录</span>
      </header>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm text-center space-y-6">

          {(s === "waiting-qr" || qrData) && (
            <div className="space-y-4 scale-in">
              <div className="w-52 h-52 mx-auto rounded-2xl flex flex-col items-center justify-center gap-2 p-4 bg-card border-2 border-border shadow-lg">
                <div className="w-36 h-36 rounded-xl flex items-center justify-center bg-muted">
                  <span className="text-xs text-muted-foreground">
                    {qrData ? "QR 码" : "准备中..."}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {qrData ? "请用手机 QQ 扫描" : "准备中..."}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                请使用手机 QQ 扫描二维码登录
              </p>
            </div>
          )}

          {isWorking && (
            <div className="space-y-4 scale-in">
              <div className="w-12 h-12 mx-auto rounded-full border-2 border-muted border-t-primary animate-spin" />
              <p className="text-sm text-muted-foreground">
                {status.message as string || "处理中..."}
              </p>
            </div>
          )}

          {s === "connected" && (
            <div className="space-y-4 scale-in">
              <div
                className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
                style={{ background: "var(--vp-success-soft)" }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--vp-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">QQ 已成功连接</p>
              <Button variant="primary" className="w-full" onClick={onBack}>返回聊天</Button>
            </div>
          )}

          {s === "error" && (
            <div className="space-y-4 scale-in">
              <div
                className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
                style={{ background: "var(--vp-error-soft)" }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--vp-error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
              </div>
              <p className="text-sm text-destructive">{status.message as string || "启动失败"}</p>
              <Button variant="primary" className="w-full" onClick={handleStart}>重试</Button>
            </div>
          )}

          {s !== "waiting-qr" && !qrData && !isWorking && s !== "connected" && s !== "error" && (
            <div className="space-y-6 scale-in">
              <div
                className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
                style={{ background: "var(--vp-primary-soft)" }}
              >
                <Cat className="w-7 h-7 text-primary" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-semibold">连接 QQ 机器人</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  启动后需要扫码登录 QQ<br />建议使用小号，存在封号风险
                </p>
              </div>
              <Button variant="primary" size="lg" className="w-full" onClick={handleStart}>
                启动 NapCatQQ
              </Button>
              <button
                onClick={onBack}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                暂时跳过
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
