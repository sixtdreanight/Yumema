/**
 * 日志工具 — 带时间戳的控制台输出 + 文件输出
 *
 * 支持：级别过滤、关联 ID 追踪、文件持久化、自动轮转
 */

import { appendFileSync, renameSync, existsSync, statSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

let currentLevel: LogLevel = "info";
let logFilePath: string | null = null;
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5 MB 轮转

/** 设置日志级别 */
export function setLogLevel(level: LogLevel) {
  currentLevel = level;
}

/** 启用文件日志输出 */
export function setLogFile(path: string) {
  logFilePath = path;
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(currentLevel);
}

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function formatLine(level: string, cid: string | undefined, msg: string): string {
  const ts = timestamp();
  const prefix = cid ? `[${ts}] ${level} [${cid}]` : `[${ts}] ${level}`;
  return `${prefix} ${msg}`;
}

function writeToFile(line: string) {
  if (!logFilePath) return;
  try {
    if (existsSync(logFilePath) && statSync(logFilePath).size > MAX_LOG_SIZE) {
      const rotated = logFilePath.replace(/\.log$/, `.old.log`);
      if (existsSync(rotated)) {
        // 追加到旧日志（简单策略，避免无限增长）
        appendFileSync(rotated, `\n`);
      } else {
        renameSync(logFilePath, rotated);
      }
    }
    appendFileSync(logFilePath, line + "\n");
  } catch {
    // 文件写入失败不阻塞主流程
  }
}

export const logger = {
  debug: (msg: string, ...args: unknown[]) => {
    if (!shouldLog("debug")) return;
    const line = formatLine("DEBUG", undefined, msg);
    console.debug(line, ...args);
    writeToFile(line);
  },
  info: (msg: string, ...args: unknown[]) => {
    if (!shouldLog("info")) return;
    const line = formatLine("INFO ", undefined, msg);
    console.log(line, ...args);
    writeToFile(line);
  },
  warn: (msg: string, ...args: unknown[]) => {
    if (!shouldLog("warn")) return;
    const line = formatLine("WARN ", undefined, msg);
    console.warn(line, ...args);
    writeToFile(line);
  },
  error: (msg: string, ...args: unknown[]) => {
    if (!shouldLog("error")) return;
    const line = formatLine("ERROR", undefined, msg);
    console.error(line, ...args);
    writeToFile(line);
  },
};

/** 创建关联 ID，用于追踪一条消息的完整处理链路 */
export function createCorrelationId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${ts}-${rand}`;
}

/** 带关联 ID 的日志记录器 */
export function cidLogger(correlationId: string) {
  return {
    debug: (msg: string, ...args: unknown[]) => {
      if (!shouldLog("debug")) return;
      const line = formatLine("DEBUG", correlationId, msg);
      console.debug(line, ...args);
      writeToFile(line);
    },
    info: (msg: string, ...args: unknown[]) => {
      if (!shouldLog("info")) return;
      const line = formatLine("INFO ", correlationId, msg);
      console.log(line, ...args);
      writeToFile(line);
    },
    warn: (msg: string, ...args: unknown[]) => {
      if (!shouldLog("warn")) return;
      const line = formatLine("WARN ", correlationId, msg);
      console.warn(line, ...args);
      writeToFile(line);
    },
    error: (msg: string, ...args: unknown[]) => {
      if (!shouldLog("error")) return;
      const line = formatLine("ERROR", correlationId, msg);
      console.error(line, ...args);
      writeToFile(line);
    },
  };
}

/** 简单重试包装，仅用于网络调用 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 2,
  delayMs = 1000,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      logger.warn(`第 ${attempt} 次尝试失败，${delayMs}ms 后重试...`);
      await sleep(delayMs);
    }
  }
  throw new Error("unreachable");
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** 从数组中随机选一个 */
export function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
