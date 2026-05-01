/**
 * PostProcessStage — 记忆保存 + 事实提取 + 兴趣分析 + 消息拆分
 */

import { generateText } from "ai";
import type { LanguageModel } from "ai";
import type { AppConfig, Profile } from "../config.js";
import { logger } from "../utils.js";
import { saveShortTerm } from "../memory.js";
import { extractFactsFromConversation, analyzeUserInterests, updateFact } from "../memory.js";
import { splitForChat } from "../split.js";

export interface PostProcessInput {
  userId: string;
  userMessage: string;
  reply: string;
  model: LanguageModel;
  config: AppConfig;
  profile: Profile;
  totalTurns: number;
}

export function postProcessStage(input: PostProcessInput): string[] {
  const { userId, userMessage, reply, model, config, profile, totalTurns } = input;

  // 1. 保存短期记忆
  saveShortTerm(userId, userMessage, reply);

  // 2. 长期记忆提取（每 longTermExtractInterval 轮触发 LLM 提取）
  if (totalTurns % config.memory.longTermExtractInterval === 0) {
    const extractPrompt = async (prompt: string) => {
      const result = await generateText({
        model,
        system: "你是一个事实提取助手，请按要求提取信息。",
        messages: [{ role: "user", content: prompt }],
        maxOutputTokens: 500,
        temperature: 0.3,
      });
      return result.text || "";
    };
    extractFactsFromConversation(userId, extractPrompt).catch((err) =>
      logger.warn("LLM 事实提取失败:", err),
    );
  }

  // 3. 兴趣分析（每 40 轮触发）
  if (totalTurns % 40 === 0 && totalTurns > 0) {
    const analyzePrompt = async (prompt: string) => {
      const result = await generateText({
        model,
        system: "你是一个兴趣分析助手，请按要求分析对话。",
        messages: [{ role: "user", content: prompt }],
        maxOutputTokens: 500,
        temperature: 0.5,
      });
      return result.text || "";
    };
    const profileForAnalysis = {
      name: profile.name,
      temperament: profile.temperament,
      hobbies: profile.hobbies,
      occupation: profile.occupation,
    };
    analyzeUserInterests(userId, profileForAnalysis, analyzePrompt).catch((err) =>
      logger.warn("兴趣分析失败:", err),
    );
  }

  // 4. 简易正则提取（长消息立即提取）
  if (userMessage.length > 30) {
    const patterns = [
      /我(在|是|做)(.{2,15}?)(工作|上班|上学|读书)/,
      /我喜欢(.{2,15}?)(游戏|音乐|电影|书|运动|吃的|喝)/,
      /我住在(.{2,10})/,
      /我养了(.{2,10})/,
    ];
    for (const pattern of patterns) {
      const match = userMessage.match(pattern);
      if (match) {
        updateFact(match[0].slice(0, 2), match[0]);
        break;
      }
    }
  }

  return splitForChat(reply);
}
