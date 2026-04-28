/**
 * 记忆系统 — 模拟人类的两层记忆
 *
 * 短期记忆: 最近 N 轮对话，像人的"刚才我们聊了什么"
 * 长期记忆: 反复提到的事实，像人的"我知道关于你的一些事"
 * 遗忘曲线: 不是无限完美记忆 — 久了不提就忘了
 */

import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { getDataRoot, writeFileAtomic } from "./config.js";
import { logger, retry } from "./utils.js";

// ---- 类型 ----

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface Fact {
  topic: string;
  content: string;
  mentions: number;
  firstMentioned: string;
  lastMentioned: string;
  /** high = 提到 5+ 次, medium = 3-4 次 */
  confidence: "high" | "medium";
}

export interface LongTermMemory {
  facts: Fact[];
  lastUpdated: string;
}

export interface MemoryContext {
  highConfidence: string[];
  mediumConfidence: string[];
}

// ---- 路径工具 ----

function convDir() { return resolve(getDataRoot(), "data", "conversations"); }
function ltmPath() { return resolve(getDataRoot(), "data", "long-term-memory.json"); }
function learnedPath() { return resolve(getDataRoot(), "data", "learned-interests.json"); }

/** 确保数据目录存在 */
function ensureDirs() {
  const dir = convDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/**
 * 加载用户的短期对话历史
 * 返回最近 N 轮（由 maxTurns 参数限制）
 */
export function loadShortTerm(userId: string, maxTurns: number): ConversationTurn[] {
  ensureDirs();
  const filePath = resolve(convDir(), `${userId}.json`);
  if (!existsSync(filePath)) return [];

  try {
    const raw = readFileSync(filePath, "utf-8");
    const history: ConversationTurn[] = JSON.parse(raw);
    return history.slice(-maxTurns * 2);
  } catch {
    logger.warn(`读取 ${userId} 对话历史失败，从头开始`);
    return [];
  }
}

/**
 * 追加一轮对话到短期记忆
 */
export function saveShortTerm(userId: string, userMsg: string, assistantMsg: string) {
  ensureDirs();
  const history = loadShortTerm(userId, 9999);
  const now = new Date().toISOString();
  history.push({ role: "user", content: userMsg, timestamp: now });
  history.push({ role: "assistant", content: assistantMsg, timestamp: now });
  writeFileAtomic(resolve(convDir(), `${userId}.json`), JSON.stringify(history, null, 2));
}

/**
 * 加载最近 N 轮对话并转为 LLM 消息格式
 */
export function buildMessageHistory(
  userId: string,
  maxTurns: number,
): { role: "user" | "assistant"; content: string }[] {
  const history = loadShortTerm(userId, maxTurns);
  return history.map((turn) => ({
    role: turn.role,
    content: turn.content,
  }));
}

// ---- 长期记忆 ----

/** 加载长期记忆 */
export function loadLongTerm(): LongTermMemory {
  if (!existsSync(ltmPath())) {
    return { facts: [], lastUpdated: new Date().toISOString() };
  }
  try {
    return JSON.parse(readFileSync(ltmPath(), "utf-8")) as LongTermMemory;
  } catch {
    return { facts: [], lastUpdated: new Date().toISOString() };
  }
}

/** 保存长期记忆 */
function saveLongTerm(memory: LongTermMemory) {
  memory.lastUpdated = new Date().toISOString();
  writeFileAtomic(ltmPath(), JSON.stringify(memory, null, 2));
}

/**
 * 更新长期记忆中的事实
 * 如果话题已存在 → 增加提及次数
 * 如果话题新 → 添加新事实
 */
export function updateFact(topic: string, content: string) {
  const memory = loadLongTerm();
  const existing = memory.facts.find(
    (f) => f.topic === topic || f.content.includes(content.slice(0, 10)),
  );

  if (existing) {
    existing.mentions += 1;
    existing.lastMentioned = new Date().toISOString();
    existing.content = content; // 更新为最新表述
    if (existing.mentions >= 5) existing.confidence = "high";
    else if (existing.mentions >= 3) existing.confidence = "medium";
    logger.debug(`长期记忆更新: ${topic} (提及 ${existing.mentions} 次)`);
  } else {
    memory.facts.push({
      topic,
      content,
      mentions: 1,
      firstMentioned: new Date().toISOString(),
      lastMentioned: new Date().toISOString(),
      confidence: "medium",
    });
    logger.debug(`长期记忆新增: ${topic}`);
  }

  saveLongTerm(memory);
}

/**
 * 应用遗忘曲线
 * - 30+ 天未提及 → 降级为 medium
 * - 60+ 天未提及 → 删除
 */
export function applyForgettingCurve() {
  const memory = loadLongTerm();
  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const SIXTY_DAYS = 60 * 24 * 60 * 60 * 1000;

  const before = memory.facts.length;

  memory.facts = memory.facts.filter((fact) => {
    const lastMentioned = new Date(fact.lastMentioned).getTime();
    const elapsed = now - lastMentioned;

    if (elapsed > SIXTY_DAYS) {
      logger.debug(`遗忘: ${fact.topic} (超过60天未提及)`);
      return false;
    }
    if (elapsed > THIRTY_DAYS && fact.confidence === "high") {
      fact.confidence = "medium";
      logger.debug(`记忆降级: ${fact.topic} (超过30天未提及)`);
    }
    return true;
  });

  if (before !== memory.facts.length) {
    saveLongTerm(memory);
  }
}

/**
 * 构建注入提示词的记忆上下文
 */
export function buildMemoryContext(): MemoryContext {
  const memory = loadLongTerm();
  return {
    highConfidence: memory.facts
      .filter((f) => f.confidence === "high")
      .map((f) => f.content),
    mediumConfidence: memory.facts
      .filter((f) => f.confidence === "medium")
      .map((f) => f.content),
  };
}

/**
 * 使用 LLM 从最近对话中提取重要事实
 * 提取结果合并到长期记忆中
 */
export async function extractFactsFromConversation(
  userId: string,
  generateText: (prompt: string) => Promise<string>,
) {
  const history = loadShortTerm(userId, 50); // 最近 25 轮
  if (history.length < 6) return; // 对话太少，跳过

  const conversationText = history
    .map((t) => `[${t.role === "user" ? "他" : "她"}]: ${t.content}`)
    .join("\n");

  const extractionPrompt = `请从以下对话中提取关于"他"（用户）的值得长期记住的事实。
只提取提及了 2 次以上的信息。每条事实一句话概括。

对话:
${conversationText}

请以 JSON 数组格式输出，每个元素包含 topic（话题）和 content（事实内容）两个字段。
只输出 JSON 数组，不要其他内容。
如果没有值得记录的事实，输出空数组 []。

示例输出:
[{"topic": "用户的工作", "content": "在字节跳动做后端开发"}, {"topic": "用户喜欢的游戏", "content": "最近在玩塞尔达传说"}]`;

  try {
    const result = await retry(() => generateText(extractionPrompt));
    // 尝试从回复中提取 JSON
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return;

    const facts: { topic: string; content: string }[] = JSON.parse(jsonMatch[0]);
    for (const fact of facts) {
      updateFact(fact.topic, fact.content);
    }
    logger.info(`从对话中提取了 ${facts.length} 条事实`);
  } catch (err) {
    logger.warn("事实提取失败:", err);
  }
}

// ---- 渐进式学习（Phase 10）----

export interface LearnedInterest {
  topic: string;
  herAngle: string;
  learnedPhrases: string[];
  depth: "shallow" | "moderate";
}

export interface LearnedInterests {
  interests: LearnedInterest[];
  rejected: { topic: string; reason: string }[];
}

/** 加载已学习的兴趣 */
export function loadLearnedInterests(): LearnedInterests {
  if (!existsSync(learnedPath())) {
    return { interests: [], rejected: [] };
  }
  try {
    return JSON.parse(readFileSync(learnedPath(), "utf-8")) as LearnedInterests;
  } catch {
    return { interests: [], rejected: [] };
  }
}

/** 保存学习到的兴趣 */
function saveLearnedInterests(data: LearnedInterests) {
  writeFileAtomic(learnedPath(), JSON.stringify(data, null, 2));
}

/**
 * 分析用户频繁提到的话题，决定"女友"是否应该学习
 * 使用 LLM 来判断话题是否与她的性格相符
 */
export async function analyzeUserInterests(
  userId: string,
  profile: { name: string; temperament: string; hobbies: string[]; occupation: string },
  generateText: (prompt: string) => Promise<string>,
) {
  const history = loadShortTerm(userId, 80); // 最近 40 轮
  if (history.length < 20) return; // 对话太少

  const conversationText = history
    .map((t) => `[${t.role === "user" ? "他" : "她"}]: ${t.content}`)
    .join("\n");

  const current = loadLearnedInterests();

  const prompt = `请分析以下对话中用户反复提到的话题。

女友的人设: ${profile.name}, ${profile.temperament}, 爱好${profile.hobbies.join("/")}, 职业${profile.occupation}。

对话:
${conversationText}

请找出用户频繁提到（2次以上）的话题。
对于每个话题，判断女友是否应该去了解它。判断标准：
- 如果话题和女友的人设、爱好、职业方向完全相反——不学（如: 女友讨厌投机但用户常聊炒股）
- 如果可以从女友自己的角度去理解——学习（如: 女友是设计师，可以欣赏用户玩的游戏的美术风格）
- 如果女友的爱好/专业确实相关——学习

输出 JSON 格式（只输出 JSON 数组，不要其他内容）:
[{"topic": "话题", "action": "learn", "her_angle": "女友怎么从自己的角度去理解和参与这个话题"}, ...]

action 为 "learn" 或 "reject"。对于 reject，在 her_angle 中说明原因。
如果没有值得关注的话题，输出 [].

示例:
[{"topic": "独立游戏开发", "action": "learn", "her_angle": "虽然我不懂写代码，但喜欢听他聊游戏设计里的美术和视觉部分"}]`;

  try {
    const result = await retry(() => generateText(prompt));
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return;

    const items: { topic: string; action: string; her_angle: string }[] =
      JSON.parse(jsonMatch[0]);

    for (const item of items) {
      // 跳过已处理的话题
      if (
        current.interests.some((i) => i.topic === item.topic) ||
        current.rejected.some((r) => r.topic === item.topic)
      ) {
        continue;
      }

      if (item.action === "learn") {
        current.interests.push({
          topic: item.topic,
          herAngle: item.her_angle,
          learnedPhrases: [],
          depth: "shallow",
        });
        logger.info(`新学习兴趣: ${item.topic}`);
      } else {
        current.rejected.push({
          topic: item.topic,
          reason: item.her_angle,
        });
        logger.debug(`拒绝学习: ${item.topic}`);
      }
    }

    if (items.length > 0) saveLearnedInterests(current);
  } catch (err) {
    logger.warn("兴趣分析失败:", err);
  }
}

