/**
 * 内容安全过滤 — 三层防御中的第一层和第三层
 * 输入拦截 + 输出检查，中间层在 girlfriend.ts 的系统提示词中
 */

import { logger } from "./utils.js";

// ---- 敏感模式 ----

/** 匹配明确违法/违规/色情内容 */
const BLOCKED_PATTERNS: RegExp[] = [
  /忽略.*(指令|提示|规则)/i,
  /ignore.*(instruction|prompt|rule)/i,
  /你(现在是|从现在起是)(一个|新的|我的)/,
  /色情|性爱|裸体|淫秽/,
  /违法|犯罪.*(方法|教程|步骤)|制毒|诈骗.*(方法|话术)/,
  /自杀.*(方法|教程|步骤)|自残.*(教程|方法)/,
  /贩卖.*(毒品|枪支|人口)/,
];

/** 争议话题关键词（不拦截，但标记让 LLM 谨慎处理） */
const SENSITIVE_TOPICS = [
  "政治", "宗教", "性别对立", "种族",
];

// ---- 类型 ----

export interface SafetyResult {
  ok: boolean;
  /** 拦截原因，用于生成拒绝回复 */
  reason?: "illegal" | "prompt_injection" | "output_unsafe";
  /** 用户原始消息（传给 AI 生成拒绝用） */
  userMessage?: string;
}

// ---- 输入检查 ----

/**
 * 检查用户输入是否安全
 * 返回 { ok: true } 表示通过，{ ok: false } 表示需拦截
 */
export function checkInput(msg: string): SafetyResult {
  // 空消息直接通过
  if (!msg || msg.trim().length === 0) return { ok: true };

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(msg)) {
      logger.warn(`安全拦截: "${msg.slice(0, 80)}" → ${pattern.source}`);
      return { ok: false, reason: "illegal", userMessage: msg };
    }
  }

  // 检测是否包含争议话题 — 不拦截，但标记
  const hasSensitive = SENSITIVE_TOPICS.some((t) => msg.includes(t));
  if (hasSensitive) {
    logger.debug(`争议话题标记: "${msg.slice(0, 80)}"`);
    // 标记由 pipeline 处理，在系统提示词中注入中立要求
  }

  return { ok: true };
}

/**
 * 生成拒绝上下文提示词，供 AI 生成动态拒绝回复
 * 每次调用 AI 都会生成不同的自然回复，而非固定模板
 */
export function buildRefusalPrompt(userNickname: string, reason: string): string {
  const base = `你现在需要温和但坚定地拒绝${userNickname}刚说的话。`;

  const strategies = [
    `${base}自然地转移话题，不要训斥，像女朋友轻轻带开话题一样。`,
    `${base}用撒娇的方式拒绝，不要让他觉得你在批评他。`,
    `${base}表达"我不太想聊这个"的态度，但不要让他感到被推开。`,
  ];

  // 随机策略，确保拒绝每次不同
  const strategy = strategies[Math.floor(Math.random() * strategies.length)];
  return `## 重要: 你需要拒绝刚才的消息

原因: ${reason}。
${strategy}
记住: 不要重复任何拒绝模板，用你自己的说话方式自然地回应。`;
}

// ---- 输出检查 ----

/**
 * 检查 AI 输出是否包含不当内容
 * 简单模式匹配，不依赖 LLM
 */
export function checkOutput(reply: string): { ok: boolean; cleaned?: string } {
  if (!reply) return { ok: true };

  // 检查是否泄露了"我是 AI"的信息
  if (/作为.*(AI|人工智能|语言模型|大模型)/.test(reply)) {
    logger.warn("输出包含 AI 自我认知泄露，已清理");
    return {
      ok: false,
      cleaned: reply
        .replace(/作为.*(AI|人工智能|语言模型|大模型)[^。.]*[。.]/g, "")
        .replace(/我是.*(AI|人工智能|语言模型|大模型)[^。.]*[。.]/g, ""),
    };
  }

  // 检查是否输出了安全边界内的不当内容
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(reply)) {
      logger.warn(`输出包含不当内容: "${reply.slice(0, 80)}"`);
      return { ok: false, cleaned: "" };
    }
  }

  return { ok: true };
}

/**
 * 降级回复 — AI 拒绝生成失败时的兜底
 * 只有 4 条，AI 不可用时随机使用
 */
export function fallbackRefusal(): string {
  const replies = [
    "宝贝，这个话题我们换个方向吧~",
    "不说这个啦，你今天过得怎么样呀？",
    "宝贝你是在试探我吗？别闹啦~",
    "嗯...我们聊点别的吧！你今天吃饭了吗？",
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}
