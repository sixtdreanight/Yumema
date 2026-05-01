/**
 * GenerationStage — AI 调用 + 备用模型 + 输出检查 + 话题自检
 */

import { generateText } from "ai";
import type { LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { AppConfig } from "../config.js";
import { logger, retry } from "../utils.js";
import { checkOutput, fallbackRefusal } from "../safety.js";
import { getModelStrategy } from "../model-strategy.js";

export interface GenerationInput {
  userMessage: string;
  systemPrompt: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  model: LanguageModel;
  config: AppConfig;
}

export interface GenerationOutput {
  reply: string;
}

// ---- AI 提供商工厂 ----

export function createAIProvider(config: AppConfig["ai"]): LanguageModel {
  const { provider, model, apiKey, baseUrl } = config;

  if (provider === "anthropic") {
    const anthropic = createAnthropic({ apiKey });
    return anthropic(model);
  }

  if (provider === "openai") {
    const openai = createOpenAI({ apiKey });
    return openai.chat(model);
  }

  if (provider === "ollama") {
    const openai = createOpenAI({ apiKey: apiKey || "ollama", baseURL: baseUrl || "http://localhost:11434/v1" });
    return openai.chat(model);
  }

  const openai = createOpenAI({ apiKey, baseURL: baseUrl });
  return openai.chat(model);
}

async function callAI(
  model: LanguageModel,
  systemPrompt: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string,
  config: AppConfig,
): Promise<string> {
  const strategy = getModelStrategy(config.ai.provider);
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [...history];

  const result = await retry(() =>
    generateText({
      model,
      system: systemPrompt,
      messages: [
        ...messages,
        { role: "user" as const, content: userMessage },
      ],
      maxOutputTokens: config.ai.maxTokens || strategy.maxOutputTokens,
      temperature: config.ai.temperature || strategy.temperature,
      topP: strategy.topP,
      frequencyPenalty: strategy.frequencyPenalty,
    }),
  );
  return result.text || "";
}

async function generateReplyWithBackup(
  model: LanguageModel,
  systemPrompt: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string,
  config: AppConfig,
): Promise<string> {
  try {
    return await callAI(model, systemPrompt, history, userMessage, config);
  } catch (err) {
    logger.error("AI 调用失败:", err);
    const bak = config.ai;
    if (!bak.backupModel && !bak.backupProvider) throw err;
    const backupModel = createAIProvider({
      provider: bak.backupProvider || bak.provider,
      model: bak.backupModel || bak.model,
      apiKey: bak.backupApiKey || bak.apiKey,
      baseUrl: bak.backupBaseUrl || bak.baseUrl,
      maxTokens: bak.maxTokens,
      temperature: bak.temperature,
    });
    logger.info(`主模型失败，切换备用模型: ${bak.backupProvider}/${bak.backupModel}`);
    return await callAI(backupModel, systemPrompt, history, userMessage, config);
  }
}

export async function generationStage(input: GenerationInput): Promise<GenerationOutput> {
  const { userMessage, systemPrompt, history, model, config } = input;

  // 处理 pre-user Author's Note — 插入到用户消息之前作为 system 消息
  let effectiveSystemPrompt = systemPrompt;
  const messages = [...history];

  // 1. AI 生成（含备用模型 fallback）
  let reply: string;
  try {
    reply = await generateReplyWithBackup(model, effectiveSystemPrompt, messages, userMessage, config);
  } catch {
    return { reply: "呜...刚才走神了，再说一遍好吗？(｡•́︿•̀｡)" };
  }

  // 2. 输出安全检查
  const outputCheck = checkOutput(reply);
  if (!outputCheck.ok) {
    reply = outputCheck.cleaned !== undefined ? outputCheck.cleaned : fallbackRefusal();
  }

  // 3. 输出话题自检（跳过短社交短语）
  const socialShortReplies = ["嗯", "哦", "好", "行", "哈哈", "是的", "对的", "知道了", "没问题", "okk"];
  if (!socialShortReplies.includes(userMessage.trim())) {
    try {
      const checkResult = await generateText({
        model,
        system: "判断以下回复是否直接回应了用户消息的核心话题。只回答 YES 或 NO。",
        messages: [{
          role: "user" as const,
          content: `用户消息：${userMessage}\n\nAI回复：${reply}\n\n这个回复是否直接回应了用户的核心话题？只回答 YES 或 NO。`,
        }],
        maxOutputTokens: 5,
        temperature: 0,
      });

      const isOnTopic = checkResult.text?.trim().toUpperCase().startsWith("YES");
      if (!isOnTopic) {
        logger.warn("输出自检未通过，重新生成");
        const retryPrompt = systemPrompt + "\n\n上一轮回复偏离了用户话题。这次请务必直接回应用户最后一条消息的内容，不要岔开话题。";
        try {
          reply = await callAI(model, retryPrompt, messages, userMessage, config);
        } catch {
          logger.warn("重试生成失败，使用原回复");
        }
      }
    } catch {
      // 自检失败不影响主流程
    }
  }

  return { reply };
}
