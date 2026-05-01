/**
 * MemoryStage — 记忆加载 + 对话摘要
 */

import { generateText } from "ai";
import type { LanguageModel } from "ai";
import type { AppConfig } from "../config.js";
import {
  buildMessageHistory,
  loadShortTerm,
  buildMemoryContext,
  loadLearnedInterests,
  loadSummary,
  saveSummary,
  type MemoryContext,
  type LearnedInterest,
} from "../memory.js";
import {
  generateConversationSummary,
  formatSummaryBlock,
  shouldTriggerSummary,
} from "../summary.js";
import { getModelStrategy } from "../model-strategy.js";

export interface MemoryInput {
  userId: string;
  userMessage?: string;
  model: LanguageModel;
  config: AppConfig;
}

export interface MemoryOutput {
  history: Array<{ role: "user" | "assistant"; content: string }>;
  memoryContext: MemoryContext;
  learnedInterests: LearnedInterest[];
  conversationSummary: string | undefined;
  fullHistory: ReturnType<typeof loadShortTerm>;
  summaryState: SummaryState;
}

export interface SummaryState {
  totalTurns: number;
  lastSummaryTurn: number;
}

export async function memoryStage(
  input: MemoryInput,
  existingState: SummaryState | undefined,
): Promise<MemoryOutput> {
  const { userId, model, config } = input;

  const history = buildMessageHistory(userId, config.memory.maxHistoryTurns);
  const memoryContext = buildMemoryContext(config.memory.maxFactsInContext, input.userMessage);
  const learnedInterests = loadLearnedInterests().interests;
  const fullHistory = loadShortTerm(userId, 9999);

  let state = existingState || {
    totalTurns: Math.floor(fullHistory.length / 2),
    lastSummaryTurn: 0,
  };
  state = { ...state, totalTurns: state.totalTurns + 1 };

  const strategy = getModelStrategy(config.ai.provider);
  const maxContextTokens = strategy.maxContextTokens;

  let conversationSummary: string | undefined;
  const MIN_TURNS_FOR_SUMMARY = 6;

  // 动态摘要触发：当估算 token 用量 > 60% 上下文窗口时触发
  if (state.totalTurns >= MIN_TURNS_FOR_SUMMARY) {
    const needsSummary = shouldTriggerSummary(history, maxContextTokens);
    const existingSummary = loadSummary(userId);

    if (!existingSummary && needsSummary) {
      // 首次摘要：压缩旧消息
      const oldTurns = fullHistory.slice(0, -(config.memory.maxHistoryTurns * 2));
      if (oldTurns.length >= 6) {
        const summary = await generateConversationSummary(oldTurns, async (prompt) => {
          const result = await generateText({
            model,
            system: "你是一个摘要助手，请按要求生成对话摘要。",
            messages: [{ role: "user", content: prompt }],
            maxOutputTokens: 300,
            temperature: 0.5,
          });
          return result.text || "";
        });
        if (summary) {
          saveSummary(userId, summary);
          state.lastSummaryTurn = state.totalTurns;
          conversationSummary = formatSummaryBlock(summary);
        }
      }
    } else if (existingSummary) {
      const turnsSinceUpdate = state.totalTurns - state.lastSummaryTurn;
      // 增量更新：超过 4 轮且 token 压力仍然大
      if (turnsSinceUpdate >= 4 && needsSummary) {
        const sinceLastSummary = fullHistory.slice(-(turnsSinceUpdate * 4));
        const summary = await generateConversationSummary(sinceLastSummary, async (prompt) => {
          const result = await generateText({
            model,
            system: "你是一个摘要助手，请按要求生成对话摘要。",
            messages: [{ role: "user", content: prompt }],
            maxOutputTokens: 300,
            temperature: 0.5,
          });
          return result.text || "";
        });
        if (summary) {
          saveSummary(userId, summary);
          state.lastSummaryTurn = state.totalTurns;
        }
      }
      conversationSummary = formatSummaryBlock(existingSummary);
    }
  }

  return { history, memoryContext, learnedInterests, conversationSummary, fullHistory, summaryState: state };
}


