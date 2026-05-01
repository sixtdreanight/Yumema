import { contextBridge, ipcRenderer } from "electron";

/** 提供给渲染进程的类型安全 API */
const api = {
  // 应用状态
  getState: () => ipcRenderer.invoke("app:get-state"),
  getPlatform: () => process.platform,

  // 设置向导
  parseDescription: (desc: string) =>
    ipcRenderer.invoke("setup:parse-description", desc),
  saveProfile: (data: Record<string, unknown>) =>
    ipcRenderer.invoke("setup:save-profile", data),
  importCard: () =>
    ipcRenderer.invoke("setup:import-card"),
  getMBTITypes: () =>
    ipcRenderer.invoke("app:get-mbti-types"),
  getMemoryFacts: () =>
    ipcRenderer.invoke("memory:get-facts"),
  updateMemoryFact: (fact: { topic: string; content: string }) =>
    ipcRenderer.invoke("memory:update-fact", fact),
  deleteMemoryFact: (topic: string) =>
    ipcRenderer.invoke("memory:delete-fact", topic),
  searchChat: (query: string) =>
    ipcRenderer.invoke("chat:search", query),

  // 聊天
  sendMessage: (message: string) =>
    ipcRenderer.invoke("chat:send", message),
  loadHistory: (limit?: number) =>
    ipcRenderer.invoke("chat:load-history", limit),
  regenerateLast: () =>
    ipcRenderer.invoke("chat:regenerate"),

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
  updateProfile: (data: Record<string, unknown>) =>
    ipcRenderer.invoke("settings:update-profile", data),
  submitSurvey: (data: { satisfaction: number; features: string[]; problems: string[]; missing: string; notes: string }) =>
    ipcRenderer.invoke("survey:submit", data),

  // 头像
  pickAvatar: () => ipcRenderer.invoke("app:pick-avatar"),
  getAvatar: () => ipcRenderer.invoke("app:get-avatar"),

  // 版本
  getVersion: () => ipcRenderer.invoke("app:get-version"),

  // 角色卡导入导出
  exportProfile: () => ipcRenderer.invoke("app:export-profile"),
  importProfile: () => ipcRenderer.invoke("app:import-profile"),

  // 聊天记录导出
  exportChat: (format: "json" | "txt" | "md") => ipcRenderer.invoke("app:export-chat", format),

  // 消息反馈
  submitFeedback: (data: { type: string; userMessage: string; aiReply: string; correctionText?: string }) =>
    ipcRenderer.invoke("feedback:submit", data),

  // 重置数据
  resetAllData: () => ipcRenderer.invoke("app:reset-data"),

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
      "chat:typing",
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
