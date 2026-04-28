import { useState, useEffect } from "react";
import Button from "../ui/Button";

export default function UpdateToast() {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [version, setVersion] = useState<string>("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const unsub = window.api.on("app:update-status", (data: unknown) => {
      const d = data as { type: string; message?: string; version?: string; percent?: number };
      switch (d.type) {
        case "available":
          setVersion(d.version || "");
          setStatus("available");
          setVisible(true);
          break;
        case "not-available":
          setVisible(false);
          break;
        case "progress":
          setStatus("downloading");
          setProgress(Math.round(d.percent || 0));
          break;
        case "downloaded":
          setStatus("downloaded");
          break;
        case "error":
          setStatus("error");
          setTimeout(() => setVisible(false), 3000);
          break;
      }
    });
    return unsub;
  }, []);

  const handleDownload = async () => {
    setStatus("downloading");
    await window.api.downloadUpdate();
  };

  const handleInstall = () => {
    window.api.installUpdate();
  };

  if (!visible) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 fade-in">
      <div className="glass rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 shadow-lg px-5 py-3 flex items-center gap-4 min-w-[320px]">
        <div className="flex-1">
          {status === "available" && (
            <div className="text-sm">
              <span className="font-medium text-zinc-800 dark:text-zinc-100">发现新版本</span>
              <span className="text-zinc-500 dark:text-zinc-400 ml-1">v{version}</span>
            </div>
          )}
          {status === "downloading" && (
            <div className="text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">正在下载更新… {progress}%</span>
              <div className="mt-1.5 h-1 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                <div
                  className="h-full bg-violet-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          {status === "downloaded" && (
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
              更新已下载，重启后安装
            </div>
          )}
          {status === "error" && (
            <div className="text-sm text-red-500">更新检查失败</div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {status === "available" && (
            <>
              <Button variant="primary" size="sm" onClick={handleDownload}>下载</Button>
              <Button variant="ghost" size="sm" onClick={() => setVisible(false)}>稍后</Button>
            </>
          )}
          {status === "downloaded" && (
            <Button variant="primary" size="sm" onClick={handleInstall}>重启</Button>
          )}
        </div>
      </div>
    </div>
  );
}
