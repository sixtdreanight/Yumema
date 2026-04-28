import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as dotenvParse } from "dotenv";
import { logger } from "./utils.js";

// ---- 类型定义 ----

/** 用户的性别 */
export type UserGender = "male" | "female" | "other";

/** 关系类型: 女友还是男友 */
export type RelationshipType = "girlfriend" | "boyfriend";

/** 关系模式 */
export type RelationshipMode = "direct" | "slow_burn";

/** 养成模式的关系阶段 */
export type RelationshipStage =
  | "stranger"      // 刚认识
  | "friend"        // 朋友
  | "close_friend"  // 好朋友
  | "crush"         // 暧昧期
  | "lover";        // 恋人

export interface Profile {
  name: string;
  age: number;
  city: string;
  occupation: string;
  education: string;
  major: string;
  hobbies: string[];
  temperament: string;
  speaking_style: string;
  /** 用户怎么被称呼 */
  user_nickname: string;
  /** 用户的性别 */
  user_gender: UserGender;
  /** 伴侣是女友还是男友 */
  relationship_type: RelationshipType;
  /** 关系模式: 直接情侣 / 养成模式 */
  relationship_mode: RelationshipMode;
  /** 用户所在城市（用于地区相关话题） */
  user_city: string;
  user_timezone: string;
  opinions: Record<string, string>;
  daily_life: string;
  quirks: string[];
  meme_style: string;
  custom_style?: CustomStyle;
}

export interface CustomStyle {
  emoticons?: string;
  verbal_tics?: string[];
  catchphrases?: string[];
  typing_quirks?: string;
}

export interface AIConfig {
  provider: "anthropic" | "openai" | "openai-compatible";
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxTokens: number;
  temperature: number;
}

export interface QQConfig {
  wsUrl: string;
  accessToken: string;
  reconnectIntervalMs: number;
}

export interface WeChatConfig {
  baseUrl: string;
  fileUrl: string;
  token?: string;
  appid?: string;
}

export interface AppConfig {
  ai: AIConfig;
  qq: QQConfig;
  wechat: WeChatConfig;
  memory: {
    maxHistoryTurns: number;
    longTermExtractInterval: number;
    maxFactsInContext: number;
  };
}

const __dirname = fileURLToPath(new URL(".", import.meta.url));

let _dataRoot: string | null = null;

export function initDataRoot(path: string): void {
  if (_dataRoot !== null) {
    logger.warn("Data root already initialized, ignoring");
    return;
  }
  _dataRoot = path;
  loadEnvFile(path);
}

export function getDataRoot(): string {
  if (_dataRoot !== null) return _dataRoot;
  return resolve(__dirname, "..", "..");
}

/** Load .env from data root into process.env (only keys not already set by system) */
function loadEnvFile(dataRoot: string): void {
  const envPath = resolve(dataRoot, ".env");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf-8");
  const parsed = dotenvParse(content);
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined && value) {
      process.env[key] = value;
    }
  }
  logger.info(`Loaded .env from ${envPath}`);
}

/** Re-read .env from current data root — picks up runtime config changes */
export function reloadEnv(): void {
  loadEnvFile(getDataRoot());
}

/** Write env values to .env in data root */
export function writeEnvFile(partial: {
  ai?: Partial<AIConfig>;
  qq?: Partial<QQConfig>;
  wechat?: Partial<WeChatConfig>;
}): void {
  const envPath = resolve(getDataRoot(), ".env");
  let content = "";
  if (existsSync(envPath)) {
    content = readFileSync(envPath, "utf-8");
  }
  const setEnv = (key: string, value: string | undefined) => {
    if (value === undefined) return;
    const re = new RegExp(`^${key}=.*`, "m");
    if (re.test(content)) {
      content = content.replace(re, `${key}=${value}`);
    } else {
      content = content.endsWith("\n") ? content : content + "\n";
      content += `${key}=${value}\n`;
    }
  };
  if (partial.ai) {
    setEnv("AI_PROVIDER", partial.ai.provider);
    setEnv("AI_MODEL", partial.ai.model);
    setEnv("AI_API_KEY", partial.ai.apiKey);
    if (partial.ai.baseUrl) setEnv("AI_BASE_URL", partial.ai.baseUrl);
  }
  if (partial.qq) {
    setEnv("QQ_WS_URL", partial.qq.wsUrl);
    setEnv("QQ_ACCESS_TOKEN", partial.qq.accessToken);
  }
  if (partial.wechat) {
    setEnv("WECHAT_BASE_URL", partial.wechat.baseUrl);
    setEnv("WECHAT_FILE_URL", partial.wechat.fileUrl);
    if (partial.wechat.token) setEnv("WECHAT_TOKEN", partial.wechat.token);
    if (partial.wechat.appid) setEnv("WECHAT_APPID", partial.wechat.appid);
  }
  const tmpPath = envPath + ".tmp." + Date.now();
  writeFileSync(tmpPath, content, "utf-8");
  renameSync(tmpPath, envPath);
  reloadEnv();
}

/** 默认配置，提供所有 fallback 值 */
const DEFAULTS: Partial<AppConfig> = {
  memory: {
    maxHistoryTurns: 24,
    longTermExtractInterval: 20,
    maxFactsInContext: 5,
  },
};

// ---- 加载函数 ----

/** 从 .env 加载 AI、QQ 和微信配置 */
function loadEnvConfig(): { ai: AIConfig; qq: QQConfig; wechat: WeChatConfig } {
  const provider = (process.env.AI_PROVIDER || "anthropic") as AIConfig["provider"];
  const model = process.env.AI_MODEL || "claude-sonnet-4-20250514";
  const apiKey =
    process.env.AI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.OPENAI_API_KEY ||
    "";

  if (!apiKey) {
    logger.warn("未设置 AI_API_KEY，AI 功能将不可用");
  }

  return {
    ai: {
      provider,
      model,
      apiKey,
      baseUrl: process.env.AI_BASE_URL,
      maxTokens: 2048,
      temperature: 0.85,
    },
    qq: {
      wsUrl: process.env.QQ_WS_URL || "ws://127.0.0.1:3001",
      accessToken: process.env.QQ_ACCESS_TOKEN || "",
      reconnectIntervalMs: 5000,
    },
    wechat: {
      baseUrl: process.env.WECHAT_BASE_URL || "",
      fileUrl: process.env.WECHAT_FILE_URL || "",
      token: process.env.WECHAT_TOKEN || "",
      appid: process.env.WECHAT_APPID || "",
    },
  };
}

/** 从 data/profile.json 加载女友角色卡 */
export function loadProfile(): Profile | null {
  const profilePath = resolve(getDataRoot(), "data", "profile.json");
  if (!existsSync(profilePath)) {
    logger.warn("未找到 data/profile.json，请先运行 npm run setup");
    return null;
  }
  const raw = readFileSync(profilePath, "utf-8");
  return JSON.parse(raw) as Profile;
}

/** 加载完整应用配置 */
export function loadConfig(): AppConfig {
  const env = loadEnvConfig();
  return {
    ai: env.ai,
    qq: env.qq,
    wechat: env.wechat,
    memory: DEFAULTS.memory!,
  };
}

/** Atomic write: write to temp then rename (crash-safe on same filesystem) */
export function writeFileAtomic(filePath: string, content: string): void {
  const tmpPath = filePath + ".tmp." + Date.now();
  writeFileSync(tmpPath, content, "utf-8");
  renameSync(tmpPath, filePath);
}
