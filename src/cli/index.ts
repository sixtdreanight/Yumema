/**
 * V-Partner 入口
 *
 * 模式:
 *   npm start                      QQ 适配器模式（需 NapCatQQ）
 *   npm start --terminal           终端聊天模式（测试用）
 *   npm run setup                  设置向导
 *
 * 支持关系类型: 女友/男友 × 男生/女生/其他 = 全组合
 */

import "dotenv/config";
import * as readline from "node:readline";
import { loadConfig, loadProfile } from "../core/config.js";
import { logger, setLogLevel } from "../core/utils.js";
import { createAIProvider, processMessage } from "../core/pipeline.js";
import { startOneBot } from "../adapters/onebot.js";
import type { QQMessage } from "../adapters/onebot.js";
import { startWeChat } from "../adapters/wechat.js";
import type { WeChatMessage } from "../adapters/wechat.js";
import { startScheduler } from "../core/scheduler.js";

// ---- 终端测试模式 ----

async function terminalMode(pipelineCtx: Parameters<typeof processMessage>[2]) {
  const p = pipelineCtx.profile;
  logger.info("终端聊天模式 — 输入消息与女友聊天，输入 /exit 退出");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `\x1b[36m你:\x1b[0m `,
  });

  rl.prompt();

  rl.on("line", async (line) => {
    const msg = line.trim();
    if (!msg) {
      rl.prompt();
      return;
    }

    if (msg === "/exit" || msg === "/quit") {
      logger.info("再见~");
      rl.close();
      process.exit(0);
    }

    try {
      const replies = await processMessage("terminal-user", msg, pipelineCtx);
      for (let i = 0; i < replies.length; i++) {
        if (i > 0) {
          await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));
        }
        console.log(`\x1b[35m${p.name}:\x1b[0m ${replies[i]}`);
      }
      console.log();
    } catch (err) {
      logger.error("处理消息失败:", err);
      console.log(`\x1b[35m${p.name}:\x1b[0m 呜...走神了 ❤️\n`);
    }

    rl.prompt();
  });

  rl.on("close", () => process.exit(0));
}

// ---- QQ 模式 ----

async function qqMode(pipelineCtx: Parameters<typeof processMessage>[2], config: ReturnType<typeof loadConfig>) {
  const p = pipelineCtx.profile;

  // 活跃用户追踪
  const activeUsers = new Set<string>();

  // 消息处理回调
  async function handleMessage(msg: QQMessage): Promise<string[]> {
    activeUsers.add(msg.userId);

    if (msg.groupId) {
      const isAt =
        msg.content.includes(`@${p.name}`) || msg.content.includes(p.name);
      if (!isAt) return [];
      msg.content = msg.content
        .replace(new RegExp(`@${p.name}\\s*`), "")
        .trim();
      if (!msg.content) return [`${p.name}在这里~ 有什么事呀？`];
    }

    return processMessage(msg.userId, msg.content, pipelineCtx);
  }

  // 启动 QQ 适配器
  const qq = startOneBot(config.qq, handleMessage);

  // 启动定时任务
  startScheduler({
    profile: p,
    getActiveUsers: () => [...activeUsers],
    sendMessage: async (_userId: string, message: string) => {
      logger.info(`定时消息: ${message.slice(0, 40)}`);
    },
  });

  process.on("SIGINT", () => {
    logger.info("正在关闭...");
    qq.stop();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    logger.info("正在关闭...");
    qq.stop();
    process.exit(0);
  });
}

// ---- 微信模式 ----

async function wechatMode(pipelineCtx: Parameters<typeof processMessage>[2], config: ReturnType<typeof loadConfig>) {
  const p = pipelineCtx.profile;

  const activeUsers = new Set<string>();

  async function handleMessage(msg: WeChatMessage): Promise<string[]> {
    activeUsers.add(msg.userId);

    if (msg.isGroup) {
      const isAt = msg.content.includes(`@${p.name}`) || msg.content.includes(p.name);
      if (!isAt) return [];
      msg.content = msg.content.replace(new RegExp(`@${p.name}\\s*`), "").trim();
      if (!msg.content) return [`${p.name}在这里~ 有什么事呀？`];
    }

    return processMessage(msg.userId, msg.content, pipelineCtx);
  }

  const wx = startWeChat(config.wechat, handleMessage);

  startScheduler({
    profile: p,
    getActiveUsers: () => [...activeUsers],
    sendMessage: async (_userId: string, message: string) => {
      logger.info(`定时消息: ${message.slice(0, 40)}`);
    },
  });

  process.on("SIGINT", () => {
    logger.info("正在关闭...");
    wx.stop();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    logger.info("正在关闭...");
    wx.stop();
    process.exit(0);
  });
}

// ---- 主入口 ----

async function main() {
  logger.info("V-Partner 启动中...");

  const config = loadConfig();
  const profile = loadProfile();
  if (!profile) {
    logger.error("未找到角色卡，请先运行 npm run setup 创建你的 V-Partner");
    process.exit(1);
  }

  const p = profile;
  const label = p.relationship_type === "boyfriend" ? "男友" : "女友";
  const modeLabel = p.relationship_mode === "slow_burn" ? "养成模式" : "直接情侣";
  logger.info(`伴侣身份: ${p.name} (${label}), ${p.age}岁, ${p.occupation}`);
  logger.info(`关系模式: ${modeLabel}`);
  logger.info(`AI 提供商: ${config.ai.provider}, 模型: ${config.ai.model}`);

  const model = createAIProvider(config.ai);
  const pipelineCtx = { model, config, profile: p };

  // 终端模式
  if (process.argv.includes("--terminal")) {
    setLogLevel("warn");
    return terminalMode(pipelineCtx);
  }

  // 微信模式优先（如果配置了）
  if (config.wechat.baseUrl) {
    logger.info(`微信服务地址: ${config.wechat.baseUrl}`);
    return wechatMode(pipelineCtx, config);
  }

  // QQ 模式
  if (!config.qq.accessToken || config.qq.accessToken === "your_token_here") {
    logger.warn("QQ 未配置或使用默认 Token，启动终端模式");
    setLogLevel("warn");
    return terminalMode(pipelineCtx);
  }

  logger.info(`QQ 地址: ${config.qq.wsUrl}`);
  return qqMode(pipelineCtx, config);
}

main().catch((err) => {
  logger.error("致命错误:", err);
  process.exit(1);
});
