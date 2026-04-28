/**
 * QQ 适配器 — OneBot v11 协议 via WebSocket
 *
 * 连接 NapCatQQ/Lagrange 的 WebSocket 服务器，
 * 收发私聊和群聊消息，通过回调接入消息管道。
 */

import { WebSocket } from "ws";
import type { QQConfig } from "../core/config.js";
import { logger } from "../core/utils.js";

// ---- 类型 ----

/** OneBot v11 消息段 */
interface MsgSegment {
  type: string;
  data: Record<string, string>;
}

/** OneBot v11 事件 */
interface OneBotEvent {
  post_type: string;
  message_type?: "private" | "group";
  sub_type?: string;
  user_id?: number;
  group_id?: number;
  sender?: {
    user_id: number;
    nickname: string;
    card?: string;
  };
  message: MsgSegment[];
  raw_message?: string;
  message_id?: number;
  time?: number;
  self_id?: number;
}

/** OneBot API 响应 */
interface OneBotResponse {
  status: "ok" | "failed";
  retcode: number;
  data: unknown;
  echo?: string;
}

/** 统一消息格式 */
export interface QQMessage {
  userId: string;
  groupId?: string;
  content: string;
  senderName: string;
  messageId?: number;
}

export type MessageHandler = (msg: QQMessage) => Promise<string[]>;

// ---- 消息处理 ----

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** 从 OneBot 消息段数组中提取纯文本 */
function extractText(segments: MsgSegment[]): string {
  return segments
    .map((seg) => {
      if (seg.type === "text") return seg.data.text || "";
      if (seg.type === "image") return "[图片]";
      if (seg.type === "face") return "[表情]";
      if (seg.type === "record") return "[语音]";
      if (seg.type === "video") return "[视频]";
      if (seg.type === "at") return `@${seg.data.qq || ""}`;
      return "";
    })
    .join("")
    .trim();
}

// ---- 适配器 ----

export function startOneBot(
  config: QQConfig,
  handler: MessageHandler,
): { stop: () => void } {
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let running = true;
  let echoCounter = 0;

  function connect() {
    if (!running) return;

    logger.info(`连接 QQ: ${config.wsUrl}`);

    ws = new WebSocket(config.wsUrl, {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    });

    ws.on("open", () => {
      logger.info("QQ WebSocket 已连接");
    });

    ws.on("message", async (raw) => {
      try {
        const data = JSON.parse(raw.toString()) as OneBotEvent | OneBotResponse;

        // API 响应（有 echo 字段）
        if ("echo" in data && data.echo) {
          logger.debug(`OneBot API 响应: echo=${data.echo}`);
          return;
        }

        // 事件推送
        if ("post_type" in data && data.post_type === "message") {
          await handleMessage(data);
        }
      } catch (err) {
        logger.warn("解析 OneBot 消息失败:", err);
      }
    });

    ws.on("close", (code, reason) => {
      logger.warn(`QQ WebSocket 断开: code=${code}`);
      if (running) {
        const delay = config.reconnectIntervalMs;
        logger.info(`${delay / 1000}s 后重连...`);
        reconnectTimer = setTimeout(connect, delay);
      }
    });

    ws.on("error", (err) => {
      logger.error("QQ WebSocket 错误:", err.message);
    });
  }

  async function handleMessage(event: OneBotEvent) {
    // 只处理消息事件
    if (event.post_type !== "message") return;

    // 忽略自己发的消息
    if (event.sender?.user_id === event.self_id) return;

    const text = extractText(event.message);
    if (!text) return; // 纯图片/表情，跳过

    const msg: QQMessage = {
      userId: String(event.sender?.user_id || event.user_id || ""),
      groupId: event.group_id ? String(event.group_id) : undefined,
      content: text,
      senderName: event.sender?.nickname || event.sender?.card || "",
      messageId: event.message_id,
    };

    logger.debug(
      `QQ ${msg.groupId ? "群聊" : "私聊"} [${msg.senderName}]: ${msg.content.slice(0, 60)}`,
    );

    try {
      const replies = await handler(msg);

      if (replies.length === 0) return;

      // 逐条发送，模拟微信聊天节奏
      const isGroup = !!msg.groupId;
      const targetId = isGroup ? String(msg.groupId) : msg.userId;

      for (let i = 0; i < replies.length; i++) {
        if (!replies[i]) continue;
        if (i > 0) {
          // 段间延迟 600~1200ms，模拟打字/思考时间
          const delay = 600 + Math.random() * 600;
          await sleep(delay);
        }
        isGroup ? sendGroupMsg(targetId, replies[i]) : sendPrivateMsg(targetId, replies[i]);
      }
    } catch (err) {
      logger.error("处理消息失败:", err);
      sendPrivateMsg(msg.userId, "呜...刚才走神了，再说一遍好吗？");
    }
  }

  function send(action: string, params: Record<string, unknown>) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      logger.warn("WebSocket 未连接，无法发送消息");
      return;
    }

    const echo = String(++echoCounter);
    ws.send(
      JSON.stringify({
        action,
        params,
        echo,
      }),
    );
  }

  function sendPrivateMsg(userId: string, message: string) {
    send("send_private_msg", {
      user_id: Number(userId),
      message,
    });
    logger.debug(`发送私聊 → ${userId}`);
  }

  function sendGroupMsg(groupId: string, message: string) {
    send("send_group_msg", {
      group_id: Number(groupId),
      message,
    });
    logger.debug(`发送群聊 → ${groupId}`);
  }

  // 启动连接
  connect();

  return {
    stop: () => {
      running = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.close();
        ws = null;
      }
      logger.info("QQ 适配器已停止");
    },
  };
}
