import { contextBridge, ipcRenderer } from "electron";

/** 提供给渲染进程的类型安全 API */
const api = {
  // 应用状态
  getState: () => ipcRenderer.invoke("app:get-state"),

  // 设置向导
  parseDescription: (desc: string) =>
    ipcRenderer.invoke("setup:parse-description", desc),
  saveProfile: (data: Record<string, unknown>) =>
    ipcRenderer.invoke("setup:save-profile", data),

  // 聊天
  sendMessage: (message: string) =>
    ipcRenderer.invoke("chat:send", message),
  loadHistory: (limit?: number) =>
    ipcRenderer.invoke("chat:load-history", limit),

  // 窗口控制
  transitionToChat: () => ipcRenderer.invoke("window:transition-to-chat"),

  // NapCatQQ
  getNapCatStatus: () => ipcRenderer.invoke("napcat:get-status"),
  startNapCat: () => ipcRenderer.invoke("napcat:start"),
  stopNapCat: () => ipcRenderer.invoke("napcat:stop"),

  // WeChat
  getWeChatStatus: () => ipcRenderer.invoke("wechat:get-status"),
  startWeChat: () => ipcRenderer.invoke("wechat:start"),
  stopWeChat: () => ipcRenderer.invoke("wechat:stop"),

  // 设置
  getConfig: () => ipcRenderer.invoke("settings:get-config"),
  updateConfig: (config: Record<string, unknown>) =>
    ipcRenderer.invoke("settings:update-config", config),

  // 自动更新
  checkUpdate: () => ipcRenderer.invoke("app:check-update"),
  downloadUpdate: () => ipcRenderer.invoke("app:download-update"),
  installUpdate: () => ipcRenderer.invoke("app:install-update"),

  // 监听主进程推送事件
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const valid = [
      "napcat:status-changed",
      "napcat:qr-ready",
      "wechat:status-changed",
      "chat:reply-chunk",
      "app:update-status",
    ];
    if (valid.includes(channel)) {
      const listener = (_: Electron.IpcRendererEvent, ...args: unknown[]) =>
        callback(...args);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    }
    return () => {};
  },
};

contextBridge.exposeInMainWorld("api", api);

export type VPapi = typeof api;
