/**
 * 对话摘要引擎 — 压缩早期对话历史，解决 "lost in the middle" 问题
 *
 * 当对话轮次超过阈值时，将早期对话压缩为 150-200 字中文摘要，
 * 注入 system prompt Layer 2，让 AI 在关注最近对话的同时不丢失早期上下文。
 */

import type { ConversationTurn } from "./memory.js";
import { logger } from "./utils.js";

/**
 * 使用 AI model 从对话轮次中生成摘要
 * 聚焦：关键话题、用户提到的重要信息、情绪变化、决定/共识
 */
export async function generateConversationSummary(
  turns: ConversationTurn[],
  generateText: (prompt: string) => Promise<string>,
): Promise<string> {
  const conversationText = turns
    .map((t) => `[${t.role === "user" ? "用户" : "伴侣"}]: ${t.content}`)
    .join("\n");

  const prompt = `请将以下对话压缩为一段 150-200 字的中文摘要。
摘要需要覆盖：
- 聊了哪些关键话题（按时间顺序）
- 用户提到的个人信息或重要事件
- 用户明显的情绪变化
- 达成的共识或做的决定

对话:
${conversationText}

请直接输出摘要文本，不需要前缀或格式。`;

  try {
    const result = await generateText(prompt);
    return result.trim();
  } catch (err) {
    logger.warn("对话摘要生成失败:", err);
    return "";
  }
}

/** 将摘要格式化为注入 system prompt 的 XML 块 */
export function formatSummaryBlock(summary: string): string {
  if (!summary) return "";
  return [
    "<conversation_summary>",
    "以下是更早之前的对话摘要，帮助你记住之前聊过什么：",
    summary,
    "当对方提到'刚才说的那个''之前提到的'等回指词时，",
    "如果最近记录里找不到，就从这个摘要里找。",
    "</conversation_summary>",
    "",
  ].join("\n");
}

// ---- Token 估算 ----

/**
 * 粗略估算消息列表的 token 用量。
 *
 * 混合中英文启发式：
 * - 中文字符 ≈ 2 chars/token
 * - 英文单词 ≈ 1.3 tokens/word
 * - 保守估算：总字符数 / 2.5
 *
 * 用于动态摘要触发（非精确计数，不需要 tiktoken）。
 */
export function estimateTokenUsage(
  messages: Array<{ role: string; content: string }>,
): number {
  let totalChars = 0;
  for (const msg of messages) {
    // 角色标记开销 ~4 tokens
    totalChars += msg.content.length + 8;
  }
  return Math.ceil(totalChars / 2.5);
}

/**
 * 判断是否需要触发对话摘要。
 * 当历史消息的估算 token 用量超过上下文窗口的 60% 时触发。
 */
export function shouldTriggerSummary(
  messages: Array<{ role: string; content: string }>,
  maxContextTokens: number,
): boolean {
  const estimated = estimateTokenUsage(messages);
  const threshold = maxContextTokens * 0.6;
  return estimated > threshold;
}

/**
 * 计算可保留的最近消息数，使 token 用量不超过窗口的 80%。
 * 用于从旧消息中裁剪，为 AI 回复预留空间。
 */
export function computeHistoryLimit(
  messages: Array<{ role: string; content: string }>,
  maxContextTokens: number,
): number {
  const budget = maxContextTokens * 0.8;
  let used = 0;
  // 从最新消息开始倒推
  for (let i = messages.length - 1; i >= 0; i--) {
    const tokens = Math.ceil(messages[i].content.length / 2.5) + 4;
    if (used + tokens > budget) return messages.length - i;
    used += tokens;
  }
  return messages.length;
}
