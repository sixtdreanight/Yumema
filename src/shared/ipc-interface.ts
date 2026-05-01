/**
 * IPC 抽象层 — 为移动端（React Native / Capacitor）准备
 *
 * 定义主进程与渲染进程之间的通信接口。
 * Electron 用 ipcMain.handle / ipcRenderer.invoke 实现，
 * 移动端可用 postMessage / bridge 实现。
 */

import type { IpcResult } from "./ipc-schemas.js";

/** 主进程侧：注册请求处理器 */
export interface IpcMainBridge {
  handle(channel: string, handler: (...args: unknown[]) => unknown): void;
  /** 向渲染进程发送推送事件 */
  send(windowId: number, channel: string, ...args: unknown[]): void;
}

/** 渲染进程侧：调用主进程方法 */
export interface IpcRendererBridge {
  invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<IpcResult<T>>;
  /** 监听主进程推送事件，返回取消订阅函数 */
  on(channel: string, callback: (...args: unknown[]) => void): () => void;
}

/** 平台适配器接口：收发消息 */
export interface PlatformAdapter {
  /** 启动适配器，传入消息回调 */
  start(handler: (msg: PlatformMessage) => Promise<string[]>): { stop: () => void };
}

export interface PlatformMessage {
  userId: string;
  groupId?: string;
  content: string;
  senderName: string;
  messageId?: number;
}
