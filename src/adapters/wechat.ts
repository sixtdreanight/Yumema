/**
 * 微信适配器 — 基于 Gewechat HTTP API
 *
 * 需用户自行部署 Gewechat 服务（Docker）：
 *   docker run -itd -p 2531:2531 -p 2532:2532 --name=gewe gewe
 *
 * 本适配器通过轮询 + HTTP 回调方式收发消息。
 */

import { logger, sleep } from "../core/utils.js";

// ---- 类型 ----

export interface WeChatConfig {
  baseUrl: string;
  fileUrl: string;
  token?: string;
  appid?: string;
}

export interface WeChatMessage {
  userId: string;
  content: string;
  senderName: string;
  isGroup: boolean;
  groupId?: string;
}

export type WeChatHandler = (msg: WeChatMessage) => Promise<string[]>;

// ---- 适配器 ----

export function startWeChat(
  config: WeChatConfig,
  handler: WeChatHandler,
  opts?: { onQRCode?: (qrUrl: string) => void },
): { stop: () => void } {
  let running = true;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;

  async function loginAndInit() {
    try {
      // 1. 获取登录二维码
      const loginRes = await fetch(`${config.baseUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: config.appid || "" }),
      });
      const loginData = (await loginRes.json()) as { qrUrl?: string; token?: string };

      if (loginData.token) {
        logger.info("微信已登录，token 已获取");
      } else if (loginData.qrUrl) {
        logger.info(`请扫描微信登录二维码: ${loginData.qrUrl}`);
        opts?.onQRCode?.(loginData.qrUrl);
      }

      // 2. 开始轮询消息
      pollMessages();
    } catch (err) {
      logger.error("微信初始化失败:", err);
      throw err;
    }
  }

  async function loginWithRetry(): Promise<void> {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await loginAndInit();
        return;
      } catch (err) {
        logger.error(`微信登录尝试 ${attempt}/3 失败:`, err);
        if (attempt < 3) {
          await sleep(2000 * attempt);
        }
      }
    }
    logger.error("微信登录 3 次均失败，放弃");
  }

  async function pollMessages() {
    if (!running) return;

    try {
      const res = await fetch(`${config.baseUrl}/message/poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: config.appid,
          token: config.token,
        }),
      });

      if (!res.ok) {
        logger.warn(`微信消息轮询失败: ${res.status}`);
        pollTimer = setTimeout(pollMessages, 5000);
        return;
      }

      const data = (await res.json()) as Array<{
        fromUser: string;
        fromUserName: string;
        content: string;
        isGroup: boolean;
        groupId?: string;
      }>;

      for (const msg of data) {
        const message: WeChatMessage = {
          userId: msg.fromUser,
          content: msg.content,
          senderName: msg.fromUserName,
          isGroup: msg.isGroup,
          groupId: msg.groupId,
        };

        try {
          const replies = await handler(message);
          for (const reply of replies) {
            if (!reply) continue;
            await sendText(msg.fromUser, reply);
            await sleep(600 + Math.random() * 600);
          }
        } catch (err) {
          logger.error("处理微信消息失败:", err);
        }
      }
    } catch (err) {
      logger.error("微信轮询异常:", err);
    }

    if (running) {
      pollTimer = setTimeout(pollMessages, 3000);
    }
  }

  async function sendText(toUser: string, text: string) {
    try {
      await fetch(`${config.baseUrl}/message/postText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: config.appid,
          token: config.token,
          toWxid: toUser,
          content: text,
        }),
      });
      logger.debug(`微信发送 → ${toUser}`);
    } catch (err) {
      logger.error("微信发送失败:", err);
    }
  }

  loginWithRetry();

  return {
    stop: () => {
      running = false;
      if (pollTimer) clearTimeout(pollTimer);
      logger.info("微信适配器已停止");
    },
  };
}
