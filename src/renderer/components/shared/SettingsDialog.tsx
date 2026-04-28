import { useState, useEffect } from "react";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import Avatar from "../ui/Avatar";

export default function SettingsDialog({
  onClose, onOpenNapCat,
}: {
  onClose: () => void;
  onOpenNapCat: () => void;
}) {
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [napCatStatus, setNapCatStatus] = useState("stopped");
  const [wechatStatus, setWechatStatus] = useState("stopped");
  const [tab, setTab] = useState<"ai" | "qq" | "wechat" | "about">("ai");

  useEffect(() => {
    window.api.getConfig().then((c: unknown) => setConfig(c as Record<string, unknown>));
    window.api.getNapCatStatus().then((s: unknown) => {
      setNapCatStatus((s as { status: string }).status);
    });
    window.api.getWeChatStatus().then((s: unknown) => {
      setWechatStatus((s as { status: string }).status);
    });
    const unsub1 = window.api.on("napcat:status-changed", (s: unknown) => {
      setNapCatStatus((s as { status: string }).status);
    });
    const unsub2 = window.api.on("wechat:status-changed", (s: unknown) => {
      setWechatStatus((s as { status: string }).status);
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  const ai = config.ai as Record<string, unknown> | undefined;
  const isConnected = napCatStatus === "connected";

  const tabs = [
    { key: "ai" as const, label: "AI 配置" },
    { key: "qq" as const, label: "QQ" },
    { key: "wechat" as const, label: "微信" },
    { key: "about" as const, label: "关于" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm fade-in"
      onClick={onClose}
    >
      <div
        className="w-[400px] max-h-[80vh] rounded-2xl overflow-hidden flex flex-col glass border border-zinc-200/60 dark:border-zinc-700/60 shadow-xl scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0 border-b border-zinc-200/60 dark:border-zinc-700/60">
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">设置</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 py-2 shrink-0 border-b border-zinc-200/60 dark:border-zinc-700/60">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                tab === t.key
                  ? "bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {tab === "ai" && (
            <div className="space-y-3 fade-in">
              <div className="rounded-xl p-4 space-y-2.5 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 dark:text-zinc-400">服务商</span>
                  <Badge variant="primary">{(ai?.provider as string) || "-"}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 dark:text-zinc-400">模型</span>
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">{(ai?.model as string) || "-"}</span>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
                AI 配置在设置向导中修改，或编辑 data/.env 文件
              </p>
            </div>
          )}

          {tab === "qq" && (
            <div className="space-y-3 fade-in">
              <div className="rounded-xl p-4 flex items-center justify-between text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60">
                <span className="text-zinc-500 dark:text-zinc-400">NapCatQQ</span>
                <Badge variant={isConnected ? "success" : "default"} dot>
                  {isConnected ? "已连接" : "未连接"}
                </Badge>
              </div>
              <Button variant="primary" className="w-full" onClick={onOpenNapCat}>
                管理 QQ 连接
              </Button>
              <p className="text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
                QQ 接入使用第三方协议，建议使用小号
              </p>
            </div>
          )}

          {tab === "wechat" && (
            <div className="space-y-3 fade-in">
              <div className="rounded-xl p-4 flex items-center justify-between text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60">
                <span className="text-zinc-500 dark:text-zinc-400">Gewechat</span>
                <Badge variant={wechatStatus === "connected" ? "success" : wechatStatus === "error" || wechatStatus === "no-docker" ? "error" : "default"} dot>
                  {wechatStatus === "connected" ? "运行中" : wechatStatus === "stopped" ? "未启动" : "异常"}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="primary" className="flex-1" onClick={() => window.api.startWeChat()}>
                  启动
                </Button>
                <Button variant="secondary" className="flex-1" onClick={() => window.api.stopWeChat()}>
                  停止
                </Button>
              </div>
              <p className="text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
                微信接入基于 Gewechat Docker 服务，需预先安装 Docker。
              </p>
            </div>
          )}

          {tab === "about" && (
            <div className="space-y-4 fade-in">
              <div className="flex flex-col items-center gap-3 py-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, var(--vp-primary-soft), #ede9fe)" }}
                >
                  <span className="text-xl">💕</span>
                </div>
                <div className="text-center">
                  <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">V-Partner</h4>
                  <p className="text-xs mt-0.5 text-zinc-400 dark:text-zinc-500">v1.0 — AI 伴侣桌面应用</p>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-center px-4 text-zinc-400 dark:text-zinc-500">
                仅供学习娱乐，AI 生成内容不代表作者立场。<br />
                因使用本软件产生的任何后果由用户自担。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
