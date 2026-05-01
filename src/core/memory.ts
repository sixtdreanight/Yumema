/**
 * 记忆系统 — 模拟人类的两层记忆
 *
 * 短期记忆: 最近 N 轮对话，像人的"刚才我们聊了什么"
 * 长期记忆: 反复提到的事实，像人的"我知道关于你的一些事"
 * 遗忘曲线: 不是无限完美记忆 — 久了不提就忘了
 */

import { readFileSync, existsSync, mkdirSync, renameSync, appendFileSync, statSync, writeFileSync } from "node:fs";
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
  /** high = 提到 5+ 次, medium = 3-4 次, low = 1-2 次 */
  confidence: "high" | "medium" | "low";
  /** 重要性评分 [0, 1]，初始 0.5，受反馈调整 */
  importance: number;
  /** 上次被检索/注入上下文的时间 */
  lastAccess: string;
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
    try {
      const backupPath = filePath + `.corrupted-${Date.now()}.json`;
      renameSync(filePath, backupPath);
      logger.warn(`对话历史损坏，已备份至 ${backupPath}，从头开始`);
    } catch {
      logger.warn(`读取 ${userId} 对话历史失败，从头开始`);
    }
    return [];
  }
}

/**
 * 追加一轮对话到短期记忆
 * 使用文件追加替代全量读写，避免每条消息 O(n) 文件 I/O
 */
export function saveShortTerm(userId: string, userMsg: string, assistantMsg: string) {
  ensureDirs();
  const filePath = resolve(convDir(), `${userId}.json`);
  const now = new Date().toISOString();
  const userTurn = { role: "user" as const, content: userMsg, timestamp: now };
  const assistantTurn = { role: "assistant" as const, content: assistantMsg, timestamp: now };

  if (!existsSync(filePath)) {
    // 新文件：直接写入完整 JSON 数组
    writeFileAtomic(filePath, JSON.stringify([userTurn, assistantTurn], null, 2) + "\n");
    return;
  }

  // 已有文件：截掉末尾的 "]" 换行，追加新条目
  const stat = statSync(filePath);
  const lastBytes = readFileSync(filePath, { encoding: "utf-8", flag: "r" });
  // 找到最后一个非空白字符（即 "]"），截断后再追加
  const trimmed = lastBytes.trimEnd();
  if (!trimmed.endsWith("]")) {
    // 文件格式异常，回退到全量读写
    const history = loadShortTerm(userId, 9999);
    history.push(userTurn, assistantTurn);
    writeFileAtomic(filePath, JSON.stringify(history, null, 2) + "\n");
    return;
  }
  const cutoff = lastBytes.length - (lastBytes.length - trimmed.length) - 1; // before the "]"
  const prefix = lastBytes.slice(0, cutoff);
  const prevEntries = trimmed.startsWith("[") && trimmed.endsWith("]") && trimmed.length > 2;
  const newEntries = JSON.stringify([userTurn, assistantTurn], null, 2).trimStart().slice(1).trimEnd().slice(0, -1);
  writeFileSync(filePath, prefix + (prevEntries ? ",\n  " : "") + newEntries + "\n]\n", "utf-8");
}

/**
 * 移除最后一轮对话（user+assistant），返回被移除的用户消息。
 * 用于"重新生成"功能——删除最后一条 AI 回复后重新生成。
 * 返回 null 表示没有可移除的对话。
 */
export function removeLastTurn(userId: string): string | null {
  ensureDirs();
  const history = loadShortTerm(userId, 9999);
  if (history.length < 2) return null;
  const lastAssistant = history[history.length - 1];
  const lastUser = history[history.length - 2];
  if (lastAssistant.role !== "assistant" || lastUser.role !== "user") return null;
  history.splice(-2, 2);
  writeFileAtomic(resolve(convDir(), `${userId}.json`), JSON.stringify(history, null, 2));
  return lastUser.content;
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

// ---- 对话摘要 ----

function summaryPath(userId: string) {
  return resolve(convDir(), `${userId}.summary.json`);
}

export function loadSummary(userId: string): string | null {
  ensureDirs();
  const filePath = summaryPath(userId);
  if (!existsSync(filePath)) return null;
  try {
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    return data.summary || null;
  } catch {
    return null;
  }
}

export function saveSummary(userId: string, summary: string) {
  ensureDirs();
  writeFileAtomic(
    summaryPath(userId),
    JSON.stringify({ summary, updatedAt: new Date().toISOString() }, null, 2),
  );
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
    existing.content = content;
    if (existing.mentions >= 5) existing.confidence = "high";
    else if (existing.mentions >= 3) existing.confidence = "medium";
    else existing.confidence = "low";
    // 每次确认性提及略微提升重要性（上限 1.0）
    existing.importance = Math.min(1.0, (existing.importance ?? 0.5) + 0.05);
    logger.debug(`长期记忆更新: ${topic} (提及 ${existing.mentions} 次)`);
  } else {
    memory.facts.push({
      topic,
      content,
      mentions: 1,
      firstMentioned: new Date().toISOString(),
      lastMentioned: new Date().toISOString(),
      confidence: "low",
      importance: 0.5,
      lastAccess: new Date().toISOString(),
    });
    logger.debug(`长期记忆新增: ${topic}`);
  }

  saveLongTerm(memory);
}

/**
 * 应用艾宾浩斯遗忘曲线
 *
 * 基础阈值: 30 天未提及 → 降级, 60 天 → 删除
 * 重要性修正:
 *   importance > 0.7 → ×2 容忍期（60/120 天）
 *   importance < 0.3 → ×0.5 容忍期（15/30 天）
 */
export function applyForgettingCurve() {
  const memory = loadLongTerm();
  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const SIXTY_DAYS = 60 * 24 * 60 * 60 * 1000;

  const before = memory.facts.length;

  memory.facts = memory.facts.filter((fact) => {
    const importance = fact.importance ?? 0.5;

    // 重要性缩放因子
    let scale = 1;
    if (importance > 0.7) scale = 2;
    else if (importance < 0.3) scale = 0.5;

    const degradeThreshold = THIRTY_DAYS * scale;
    const deleteThreshold = SIXTY_DAYS * scale;

    const lastMentioned = new Date(fact.lastMentioned).getTime();
    const elapsed = now - lastMentioned;

    if (elapsed > deleteThreshold) {
      logger.debug(`遗忘: ${fact.topic} (超过${Math.round(deleteThreshold / (24 * 60 * 60 * 1000))}天未提及, importance=${importance.toFixed(2)})`);
      return false;
    }
    if (elapsed > degradeThreshold && fact.confidence === "high") {
      fact.confidence = "medium";
      fact.importance = Math.max(0, importance - 0.1);
      logger.debug(`记忆降级: ${fact.topic} (超过${Math.round(degradeThreshold / (24 * 60 * 60 * 1000))}天未提及)`);
    }
    return true;
  });

  if (before !== memory.facts.length) {
    saveLongTerm(memory);
  }
}

/**
 * 构建注入提示词的记忆上下文
 * 使用三维评分排序: relevance + recency + importance
 */
export function buildMemoryContext(maxFacts = 5, userQuery?: string): MemoryContext {
  const memory = loadLongTerm();
  const now = Date.now();

  // 三维评分: 0.4 × relevance + 0.3 × recency + 0.3 × importance
  const score = (f: Fact): number => {
    let relevance = 0.5; // 默认中性值
    if (userQuery) {
      relevance = topicRelevance(f, userQuery);
    }
    const recency = expRecencyDecay(f.lastAccess || f.lastMentioned, now);
    const importance = f.importance ?? 0.5;
    return 0.4 * relevance + 0.3 * recency + 0.3 * importance;
  };

  const sorted = [...memory.facts].sort((a, b) => score(b) - score(a));

  // 标记被检索的事实（更新 lastAccess）
  const selectedHigh = sorted.filter((f) => f.confidence === "high").slice(0, maxFacts);
  const selectedMedium = sorted.filter((f) => f.confidence === "medium").slice(0, maxFacts);
  const selected = [...selectedHigh, ...selectedMedium];

  for (const fact of selected) {
    fact.lastAccess = new Date().toISOString();
  }
  if (selected.length > 0) saveLongTerm(memory);

  return {
    highConfidence: selectedHigh.map((f) => f.content),
    mediumConfidence: selectedMedium.map((f) => f.content),
  };
}

/**
 * 多维度记忆评分 — 用于检索与当前查询最相关的记忆。
 *
 * score = 0.4 × relevance + 0.3 × recency + 0.3 × importance
 *
 * 参考 ACMS 2025 三维评分模型。
 */
export function scoreMemoryFacts(userId: string, query: string, topN = 5): Fact[] {
  const memory = loadLongTerm();
  const now = Date.now();

  const scored = memory.facts.map((fact) => {
    const relevance = topicRelevance(fact, query);
    const recency = expRecencyDecay(fact.lastAccess || fact.lastMentioned, now);
    const importance = fact.importance ?? 0.5;
    return {
      fact,
      score: 0.4 * relevance + 0.3 * recency + 0.3 * importance,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  const top = scored.slice(0, topN).map((s) => s.fact);
  for (const fact of top) {
    fact.lastAccess = new Date().toISOString();
  }
  if (top.length > 0) saveLongTerm(memory);

  return top;
}

// ---- 评分辅助函数 ----

/** 话题相关性：基于 token 重叠的简单文本匹配 */
function topicRelevance(fact: Fact, query: string): number {
  const queryTokens = tokenize(query.toLowerCase());
  const factText = `${fact.topic} ${fact.content}`.toLowerCase();

  let matches = 0;
  for (const token of queryTokens) {
    if (factText.includes(token)) matches++;
  }

  if (matches === 0) return 0;
  // Jaccard-like: matched tokens / total unique tokens
  const factTokens = new Set(tokenize(factText));
  const intersection = queryTokens.filter((t) => factTokens.has(t)).length;
  const union = new Set([...queryTokens, ...factTokens]).size;
  return union > 0 ? intersection / union : 0;
}

function tokenize(text: string): string[] {
  // 中文按字符切分，英文按空格切分
  return text
    .split(/[\s,，。！？、；：""''「」【】《》（）\(\)]+/)
    .filter((t) => t.length > 0)
    .flatMap((t) => {
      if (/^[一-鿿]+$/.test(t) && t.length > 2) {
        // 中文词：单字和双字组合
        const chars = [...t];
        const result: string[] = [t]; // 完整词
        for (let i = 0; i < chars.length - 1; i++) {
          result.push(chars[i] + chars[i + 1]); // bigrams
        }
        return result;
      }
      return [t];
    });
}

/** 指数衰减 recency: exp(-λ·Δt)，λ=0.05 → ~50% 权重在 14 天后 */
function expRecencyDecay(lastTimestamp: string, now: number): number {
  const lastTime = new Date(lastTimestamp).getTime();
  const daysAgo = (now - lastTime) / (24 * 60 * 60 * 1000);
  const lambda = 0.05;
  return Math.exp(-lambda * daysAgo);
}

// ---- 重要性调整（反馈闭环） ----

/**
 * 调整事实的重要性评分。
 * 用户点赞 → delta +0.1
 * 用户踩 → delta -0.1
 * 用户纠错 → delta +0.3（并更新内容）
 */
export function adjustFactImportance(
  topic: string,
  delta: number,
  newContent?: string,
): void {
  const memory = loadLongTerm();
  const fact = memory.facts.find(
    (f) => f.topic === topic || f.content.includes(topic.slice(0, 10)),
  );

  if (!fact) return;

  fact.importance = Math.max(0, Math.min(1, (fact.importance ?? 0.5) + delta));
  if (newContent) {
    fact.content = newContent;
    fact.mentions += 1;
    fact.lastMentioned = new Date().toISOString();
  }
  fact.lastAccess = new Date().toISOString();

  saveLongTerm(memory);
  logger.debug(`记忆重要性调整: ${topic} ${delta >= 0 ? "+" : ""}${delta} → ${fact.importance.toFixed(2)}`);
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
    .map((t) => `[${t.role === "user" ? "用户" : "伴侣"}]: ${t.content}`)
    .join("\n");

  const extractionPrompt = `请从以下对话中提取关于"用户"的值得长期记住的事实。
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

