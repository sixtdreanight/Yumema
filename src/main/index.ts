import { app, BrowserWindow, dialog, Notification, session } from "electron";
import { safeHandle } from "./handler-utils.js";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import electronUpdater from "electron-updater";
const { autoUpdater } = electronUpdater;
import { registerIpcHandlers } from "./ipc-handlers.js";
import { loadProfile, getDataRoot, initDataRoot } from "@sixtdreamnight/companion-engine";
import { logger, setLogFile, GUI_USER_ID } from "@sixtdreamnight/companion-engine";
import { startScheduler } from "@sixtdreamnight/companion-engine";
import { napCatManager } from "./napcat-manager.js";
import { weChatManager } from "./wechat-manager.js";
import { writeFileSync, mkdirSync } from "node:fs";

let mainWindow: BrowserWindow | null = null;

function createWindow(startRoute: "setup" | "chat") {
  const isSetup = startRoute === "setup";

  mainWindow = new BrowserWindow({
    width: isSetup ? 600 : 900,
    height: isSetup ? 750 : 680,
    minWidth: isSetup ? 600 : 700,
    minHeight: isSetup ? 750 : 500,
    resizable: !isSetup,
    titleBarStyle: "hiddenInset",
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.on("ready-to-show", () => mainWindow?.show());
  mainWindow.on("closed", () => (mainWindow = null));

  const hash = `#/${startRoute}`;
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}/${hash}`);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"), {
      hash: `/${startRoute}`,
    });
  }
}

// ---- 自动更新 ----

function sendUpdateStatus(status: { type: string; message?: string; version?: string; percent?: number }) {
  for (const w of BrowserWindow.getAllWindows()) {
    w.webContents.send("app:update-status", status);
  }
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on("checking-for-update", () => {
    sendUpdateStatus({ type: "checking" });
  });

  autoUpdater.on("update-available", (info) => {
    sendUpdateStatus({ type: "available", version: info.version });
  });

  autoUpdater.on("update-not-available", () => {
    sendUpdateStatus({ type: "not-available" });
  });

  autoUpdater.on("download-progress", (progress) => {
    sendUpdateStatus({ type: "progress", percent: progress.percent });
  });

  autoUpdater.on("update-downloaded", () => {
    sendUpdateStatus({ type: "downloaded" });
  });

  autoUpdater.on("error", (err) => {
    sendUpdateStatus({ type: "error", message: err.message });
  });

  safeHandle("app:check-update", async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { hasUpdate: !!result?.updateInfo?.version, version: result?.updateInfo?.version };
    } catch (err) {
      return { hasUpdate: false, error: String(err) };
    }
  });

  safeHandle("app:download-update", async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  safeHandle("app:install-update", () => {
    autoUpdater.quitAndInstall(true, true);
  });
}

// ---- 全局崩溃处理 ----

process.on("uncaughtException", (err) => {
  const crashDir = join(getDataRoot(), "crashes");
  try { mkdirSync(crashDir, { recursive: true }); } catch { /* ignore */ }
  const crashFile = join(crashDir, `crash-${Date.now()}.log`);
  try {
    // 清理堆栈中的 API 密钥和敏感路径
    const sanitized = (err.stack || err.message)
      .replace(/api_key[=:]\S+/gi, "api_key=***")
      .replace(/token[=:]\S+/gi, "token=***")
      .replace(/secret[=:]\S+/gi, "secret=***");
    writeFileSync(crashFile, `${new Date().toISOString()} uncaughtException\n${sanitized}\n`);
  } catch { /* ignore */ }
  logger.error("Uncaught exception:", err);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection:", reason);
});

// 退出前清理子进程
app.on("before-quit", () => {
  napCatManager.stop();
  weChatManager.stop();
});

app.whenReady().then(() => {
  // CSP: restrict renderer to app-owned resources only (production only; Vite dev server needs looser CSP)
  if (!process.env.ELECTRON_RENDERER_URL) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          // NOTE: The hardcoded SHA256 hash below is fragile — it must be regenerated
          // whenever the renderer bundle changes. For production, prefer a nonce-based
          // CSP served via a per-request nonce generated at runtime.
          "Content-Security-Policy": [
            "default-src 'self'; script-src 'self' 'sha256-0vhENBDiXt7C/5mQpX0pintncSH8cMav2aVDGcEhUZk='; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self';",
          ],
        },
      });
    });
  }

  // 初始化数据根目录（必须在 registerIpcHandlers 之前）
  const isDev = !!process.env.ELECTRON_RENDERER_URL;
  const __dirname = fileURLToPath(new URL(".", import.meta.url));
  const dataRoot = isDev ? join(__dirname, "..", "..") : app.getPath("userData");
  initDataRoot(dataRoot);
  const dataDir = join(getDataRoot(), "data");
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(join(dataDir, "conversations"), { recursive: true });
  mkdirSync(join(dataDir, "feedback"), { recursive: true });

  // 启用文件日志输出
  setLogFile(join(getDataRoot(), "logs", "app.log"));

  registerIpcHandlers();
  setupAutoUpdater();

  // 延迟检查更新，避免启动时卡顿
  setTimeout(() => {
    if (!process.env.ELECTRON_RENDERER_URL) {
      autoUpdater.checkForUpdates().catch(() => {});
    }
  }, 30000);

  const profile = loadProfile();
  if (profile) {
    startScheduler({
      profile,
      getActiveUsers: () => [GUI_USER_ID],
      sendMessage: async (_userId: string, message: string) => {
        logger.info(`定时消息: ${message.slice(0, 40)}`);
      },
      showNotification: (title: string, body: string) => {
        if (Notification.isSupported()) {
          new Notification({ title, body, silent: false }).show();
        }
      },
    });
  }
  createWindow(profile ? "chat" : "setup");
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow(loadProfile() ? "chat" : "setup");
  }
});
