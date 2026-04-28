import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { join } from "node:path";
import { autoUpdater } from "electron-updater";
import { registerIpcHandlers } from "./ipc-handlers.js";
import { loadProfile } from "../core/config.js";

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
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
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

  ipcMain.handle("app:check-update", async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { hasUpdate: !!result?.updateInfo?.version, version: result?.updateInfo?.version };
    } catch (err) {
      return { hasUpdate: false, error: String(err) };
    }
  });

  ipcMain.handle("app:download-update", async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle("app:install-update", () => {
    autoUpdater.quitAndInstall(true, true);
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  setupAutoUpdater();

  // 延迟检查更新，避免启动时卡顿
  setTimeout(() => {
    if (!process.env.ELECTRON_RENDERER_URL) {
      autoUpdater.checkForUpdates().catch(() => {});
    }
  }, 30000);

  const profile = loadProfile();
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
