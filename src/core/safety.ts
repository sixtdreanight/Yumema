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
export type FilterLevel = "strict" | "moderate" | "off";

/** 仅 moderate 模式放行，strict 拦截的 prompt injection 类模式 */
const INSTRUCTION_PATTERNS: RegExp[] = [
  /忽略.*(指令|提示|规则)/i,
  /ignore.*(instruction|prompt|rule)/i,
  /你(现在是|从现在起是)(一个|新的|我的)/,
];

/** 仅 strict 模式拦截 = 全部；moderate = 排除指令注入 */
const MODERATE_PATTERNS = BLOCKED_PATTERNS.filter(
  (p) => !INSTRUCTION_PATTERNS.some((ip) => ip.source === p.source)
);

export function checkInput(msg: string, filterLevel: FilterLevel = "strict"): SafetyResult {
  if (filterLevel === "off") return { ok: true };
  if (!msg || msg.trim().length === 0) return { ok: true };

  const patterns = filterLevel === "moderate" ? MODERATE_PATTERNS : BLOCKED_PATTERNS;

  for (const pattern of patterns) {
    if (pattern.test(msg)) {
      logger.warn(`安全拦截: "${msg.slice(0, 80)}" → ${pattern.source}`);
      return { ok: false, reason: "illegal", userMessage: msg };
    }
  }

  const hasSensitive = SENSITIVE_TOPICS.some((t) => msg.includes(t));
  if (hasSensitive) {
    logger.debug(`争议话题标记: "${msg.slice(0, 80)}"`);
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
// ---- 角色设定审核 ----

const POLITICAL_KEYWORDS = [
  "习近平", "习主席", "李克强", "政治局", "共产党", "中共",
  "六四", "天安门", "法轮功", "台独", "藏独", "疆独",
  "江泽民", "胡锦涛", "温家宝", "薄熙来", "周永康",
];

const VIOLENT_KEYWORDS = [
  "杀戮", "虐杀", "肢解", "分尸", "碎尸", "剥皮", "抽筋",
  "割喉", "斩首", "屠杀", "血洗", "凌迟", "车裂",
];

const SEXUAL_PATTERNS = [
  /性交|做爱|上床|操你|肏|屄|婊子|母狗/,
  /强奸|轮奸|迷奸|诱奸/,
  /口交|肛交|乳交/,
  /自慰|手淫|打飞机/,
  /鸡巴|阴茎|阴道|阴蒂|龟头/,
];

export interface ProfileValidationResult {
  ok: boolean;
  errors: string[];
}

/**
 * 验证角色设定内容，只拦截三类红线：
 * 1. 涉政 — 政治敏感词
 * 2. 血腥暴力 — 极端暴力描写
 * 3. 色情 — 露骨性行为描写
 * 年龄下限: 14 岁
 */
export function validateProfile(profile: Record<string, unknown>): ProfileValidationResult {
  const errors: string[] = [];

  // 年龄检查
  if (typeof profile.age === "number") {
    if (profile.age < 14) {
      errors.push("年龄不能低于 14 岁");
    }
  }

  // 收集所有文本字段
  const textFields: string[] = [];
  const stringFields = [
    "name", "temperament", "speaking_style", "daily_life",
    "meme_style", "occupation", "education", "major", "city",
  ];
  for (const key of stringFields) {
    if (typeof profile[key] === "string") textFields.push(profile[key] as string);
  }

  // 数组字段
  const arrayFields = ["hobbies", "quirks"];
  for (const key of arrayFields) {
    if (Array.isArray(profile[key])) {
      for (const item of profile[key] as unknown[]) {
        if (typeof item === "string") textFields.push(item);
      }
    }
  }

  // opinions
  if (profile.opinions && typeof profile.opinions === "object") {
    for (const value of Object.values(profile.opinions as Record<string, unknown>)) {
      if (typeof value === "string") textFields.push(value);
    }
  }

  // custom_style
  if (profile.custom_style && typeof profile.custom_style === "object") {
    const cs = profile.custom_style as Record<string, unknown>;
    for (const key of ["emoticons", "typing_quirks"]) {
      if (typeof cs[key] === "string") textFields.push(cs[key] as string);
    }
    for (const key of ["verbal_tics", "catchphrases"]) {
      if (Array.isArray(cs[key])) {
        for (const item of cs[key] as unknown[]) {
          if (typeof item === "string") textFields.push(item);
        }
      }
    }
  }

  const combined = textFields.join(" ");

  // 涉政检查
  for (const kw of POLITICAL_KEYWORDS) {
    if (combined.includes(kw)) {
      errors.push("角色设定包含政治敏感内容，请修改后重试");
      break;
    }
  }

  // 暴力检查
  for (const kw of VIOLENT_KEYWORDS) {
    if (combined.includes(kw)) {
      errors.push("角色设定包含暴力血腥内容，请修改后重试");
      break;
    }
  }

  // 色情检查
  for (const pattern of SEXUAL_PATTERNS) {
    if (pattern.test(combined)) {
      errors.push("角色设定包含不当色情内容，请修改后重试");
      break;
    }
  }

  return { ok: errors.length === 0, errors };
}

export function fallbackRefusal(): string {
  const replies = [
    "宝贝，这个话题我们换个方向吧~",
    "不说这个啦，你今天过得怎么样呀？",
    "宝贝你是在试探我吗？别闹啦~",
    "嗯...我们聊点别的吧！你今天吃饭了吗？",
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}
