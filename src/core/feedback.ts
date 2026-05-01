/**
 * 消息级 AI 反馈 — thumbs up/down + 纠错
 *
 * 用户对 AI 回复的反馈被存储并注入到后续对话的 system prompt 中，
 * 让 AI 逐渐适应用户的偏好。
 */

import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { getDataRoot, writeFileAtomic } from "./config.js";
import { logger } from "./utils.js";
import { adjustFactImportance, loadLongTerm } from "./memory.js";

export interface FeedbackEntry {
  type: "thumbs_up" | "thumbs_down" | "correction";
  userMessage: string;
  aiReply: string;
  correctionText?: string;
  timestamp: string;
}

const MAX_FEEDBACK = 50;

function feedbackDir(): string {
  return resolve(getDataRoot(), "data", "feedback");
}

function feedbackFile(userId: string): string {
  return resolve(feedbackDir(), `${userId}.json`);
}

function ensureDir(): void {
  const dir = feedbackDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function saveFeedback(
  userId: string,
  entry: FeedbackEntry,
): void {
  ensureDir();
  const file = feedbackFile(userId);
  let list: FeedbackEntry[] = [];
  if (existsSync(file)) {
    try {
      list = JSON.parse(readFileSync(file, "utf-8"));
      if (!Array.isArray(list)) list = [];
    } catch {
      list = [];
    }
  }
  list.push(entry);
  if (list.length > MAX_FEEDBACK) list = list.slice(-MAX_FEEDBACK);
  writeFileAtomic(file, JSON.stringify(list, null, 2) + "\n");

  // 反馈闭环 → 调整记忆重要性
  try {
    const memory = loadLongTerm();
    const relatedFacts = findRelatedFacts(entry.userMessage, memory.facts, 2);

    let delta = 0;
    if (entry.type === "thumbs_up") delta = 0.1;
    else if (entry.type === "thumbs_down") delta = -0.1;
    else if (entry.type === "correction") delta = 0.3;

    for (const fact of relatedFacts) {
      const newContent = entry.type === "correction" ? entry.correctionText : undefined;
      adjustFactImportance(fact.topic, delta, newContent);
    }
  } catch {
    // 重要性调整失败不影响反馈存储
  }
}

/** 简单文本匹配找与用户消息最相关的长期记忆事实 */
function findRelatedFacts(
  userMessage: string,
  facts: Array<{ topic: string; content: string }>,
  topN: number,
): Array<{ topic: string; content: string }> {
  const msgLower = userMessage.toLowerCase();
  const scored = facts.map((f) => {
    const text = `${f.topic} ${f.content}`.toLowerCase();
    const msgTokens = new Set(msgLower.split(/[\s,，。！？、；：""''「」【】《》（）\(\)]+/));
    const factTokens = new Set(text.split(/[\s,，。！？、；：""''「」【】《》（）\(\)]+/));
    const intersection = [...msgTokens].filter((t) => factTokens.has(t) && t.length > 0).length;
    return { fact: f, score: intersection };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((s) => s.fact);
}

export function loadRecentFeedback(userId: string, count = 5): FeedbackEntry[] {
  const file = feedbackFile(userId);
  if (!existsSync(file)) return [];
  try {
    const list: unknown = JSON.parse(readFileSync(file, "utf-8"));
    if (!Array.isArray(list)) return [];
    return list.slice(-count) as FeedbackEntry[];
  } catch {
    logger.warn(`反馈文件损坏: ${file}`);
    return [];
  }
}

export function buildFeedbackContext(userId: string): string | undefined {
  const recent = loadRecentFeedback(userId, 5);
  if (recent.length === 0) return undefined;

  const disliked = recent.filter((f) => f.type === "thumbs_down" || f.type === "correction");
  const corrections = recent.filter((f) => f.type === "correction" && f.correctionText);

  const lines: string[] = [];

  if (disliked.length > 0) {
    const examples = disliked.slice(-3).map((f) =>
      `用户说"${f.userMessage.slice(0, 60)}"时，你回复了"${f.aiReply.slice(0, 60)}"，用户不太满意`
    );
    lines.push("最近用户对以下回复表示不满意，避免类似的风格或内容：");
    lines.push(...examples.map((e) => `- ${e}`));
  }

  if (corrections.length > 0) {
    const examples = corrections.slice(-2).map((f) =>
      `当用户说"${f.userMessage.slice(0, 40)}"时，用户期望你这样说："${f.correctionText!.slice(0, 80)}"`
    );
    lines.push("用户期望的回复风格（参考）：");
    lines.push(...examples.map((e) => `- ${e}`));
  }

  return lines.length > 0 ? lines.join("\n") : undefined;
}
