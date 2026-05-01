/**
 * 消息处理管道 — 编排器
 *
 * 流程: PreProcess → Memory → Context → Generation → PostProcess
 *
 * 每个 stage 是独立可测试的纯函数（或注入依赖）。
 * 参考 Letta OS-style memory + LangGraph Checkpointer/Store 模式。
 */

import type { LanguageModel } from "ai";
import type { AppConfig, Profile } from "./config.js";
import { logger } from "./utils.js";
import { saveShortTerm } from "./memory.js";
import { splitForChat } from "./split.js";
import { preProcessStage } from "./stages/preprocess.js";
import { memoryStage, type SummaryState } from "./stages/memory.js";
import { contextStage } from "./stages/context.js";
import { generationStage, createAIProvider } from "./stages/generation.js";
import { postProcessStage } from "./stages/postprocess.js";

export { createAIProvider, splitForChat };

export interface PipelineContext {
  model: LanguageModel;
  config: AppConfig;
  profile: Profile;
}

/** 每个用户的摘要状态 */
const summaryStates = new Map<string, SummaryState>();

/** 会话最后活跃时间，用于 TTL 淘汰 */
const lastActive = new Map<string, number>();

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const SESSION_MAX = 100;

export function cleanupSessions(): void {
  const now = Date.now();

  for (const [userId, ts] of lastActive) {
    if (now - ts > SESSION_TTL_MS) {
      summaryStates.delete(userId);
      lastActive.delete(userId);
    }
  }

  if (summaryStates.size > SESSION_MAX) {
    const sorted = [...lastActive.entries()]
      .sort((a, b) => a[1] - b[1]);
    for (const [userId] of sorted.slice(0, summaryStates.size - SESSION_MAX)) {
      summaryStates.delete(userId);
      lastActive.delete(userId);
    }
  }
}

function getSummaryState(userId: string): SummaryState | undefined {
  const state = summaryStates.get(userId);
  lastActive.set(userId, Date.now());
  return state;
}

function setSummaryState(userId: string, state: SummaryState): void {
  summaryStates.set(userId, state);
  lastActive.set(userId, Date.now());
}

/**
 * 处理一条消息，返回 AI 生成的回复气泡数组
 *
 * 编排 5 个独立 stage:
 *   PreProcess → Memory → Context → Generation → PostProcess
 */
export async function processMessage(
  userId: string,
  userMessage: string,
  ctx: PipelineContext,
): Promise<string[]> {
  const { model, config, profile } = ctx;

  // 定期清理过期会话
  cleanupSessions();

  // Stage 1: PreProcess — 安全 + 关系 + 搜索
  const pre = await preProcessStage({ userId, userMessage, model, config, profile });
  if (pre.earlyReturn !== null) {
    saveShortTerm(userId, userMessage, pre.earlyReturn);
    return splitForChat(pre.earlyReturn);
  }

  // Stage 2: Memory — 记忆加载 + 摘要
  const mem = await memoryStage(
    { userId, userMessage, model, config },
    getSummaryState(userId),
  );
  setSummaryState(userId, mem.summaryState);

  // Stage 3: Context — 系统提示词组装
  const ctxOut = contextStage({
    userId, userMessage, profile, config,
    searchResults: pre.searchResults,
    memoryContext: mem.memoryContext,
    learnedInterests: mem.learnedInterests,
    conversationSummary: mem.conversationSummary,
    relState: pre.relState,
  });

  // Stage 4: Generation — AI 调用 + 备用模型 + 输出检查
  const gen = await generationStage({
    userMessage,
    systemPrompt: ctxOut.systemPrompt,
    history: mem.history,
    model,
    config,
  });

  // Stage 5: PostProcess — 记忆保存 + 事实提取 + 气泡拆分
  return postProcessStage({
    userId,
    userMessage,
    reply: gen.reply,
    model,
    config,
    profile,
    totalTurns: mem.summaryState.totalTurns,
  });
}
