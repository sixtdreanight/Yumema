/**
 * 消息处理管道 — 将消息从输入到输出的完整流程
 *
 * 流程: 安全检查 → 搜索检测 → 记忆加载 → 情绪检测 →
 *       构建提示词 → AI 生成 → 输出检查 → 记忆保存 → 返回回复
 */

import { generateText } from "ai";
import type { LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { AppConfig, Profile } from "./config.js";
import { logger, retry } from "./utils.js";
import { checkInput, buildRefusalPrompt, checkOutput, fallbackRefusal } from "./safety.js";
import { needsSearch, extractSearchQuery, searchWeb } from "./search.js";
import {
  buildSystemPrompt,
  buildTimeContext,
  getTodayMood,
  detectSadness,
  buildEmotionalSupportHint,
  buildCrisisHint,
  isConversationDying,
  suggestTopic,
  createSession,
  updateSession,
  shouldRemindBreak,
  buildBreakReminder,
  type SessionState,
} from "./girlfriend.js";
import {
  getOrCreateState,
  calculateAffectionDelta,
  updateAffection,
  handleConfession,
  checkBoundaryViolation,
  handleBoundaryViolation as processBoundaryViolation,
  executeBreakup,
  stayFriends,
  buildStageGuidance,
  saveRelationshipState,
  STAGE_LABELS,
} from "./relationship.js";
import {
  buildMessageHistory,
  saveShortTerm,
  buildMemoryContext,
  loadShortTerm,
  updateFact,
  loadLearnedInterests,
} from "./memory.js";

// ---- AI 提供商工厂 ----

/** 复用 vibe-coding-agent 的三选一 AI 提供商模式 */
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

  // openai-compatible (使用 Chat Completions API，第三方厂商通常不支持 Responses API)
  const openai = createOpenAI({ apiKey, baseURL: baseUrl });
  return openai.chat(model);
}

// ---- 消息拆分 ----

/**
 * 将长文本按句子边界拆成短气泡，模拟真人微信聊天
 * 一句一气泡，每段不超过 50 字
 */
export function splitForChat(text: string): string[] {
  if (!text || text.length === 0) return [""];

  // 移除括号内容（心理/动作描写残留）
  let cleaned = text.replace(/[（(][^）)]*[）)]/g, "");
  // 移除 *动作* _心理_ 标记
  cleaned = cleaned.replace(/\*[^*]+\*/g, "").replace(/_[^_]+_/g, "");

  // 按中文标点拆分
  const sentences = cleaned
    .split(/(?<=[。！？…\.!\?～~\n])\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length === 0) return [cleaned.trim() || text];

  // 每段不超过 50 字
  const result: string[] = [];
  for (const s of sentences) {
    if (s.length <= 50) {
      result.push(s);
    } else {
      // 按逗号/分号二次拆分
      const parts = s
        .split(/(?<=[，,；;])/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      result.push(...parts);
    }
  }

  return result.length > 0 ? result : [text];
}

// ---- 管道 ----

export interface PipelineContext {
  model: LanguageModel;
  config: AppConfig;
  profile: Profile;
}

/** 每个用户的会话状态，用于防沉迷和冷场检测 */
const sessions = new Map<string, SessionState>();

function getSession(userId: string): SessionState {
  let session = sessions.get(userId);
  if (!session) {
    session = createSession();
    sessions.set(userId, session);
  }
  return session;
}

/**
 * 处理一条消息，返回 AI 生成的回复
 *
 * 这是整个消息处理的核心入口：
 * QQ 适配器收到消息 → 调用此函数 → 返回回复 → 适配器发送
 */
export async function processMessage(
  userId: string,
  userMessage: string,
  ctx: PipelineContext,
): Promise<string[]> {
  const { model, config, profile } = ctx;
  const nick = profile.user_nickname;

  // 快捷保存并返回（确保所有路径都保存对话记录）
  const saveAndReturn = (reply: string): string[] => {
    saveShortTerm(userId, userMessage, reply);
    return splitForChat(reply);
  };

  // 1. 安全检查 — 输入层
  const safetyResult = checkInput(userMessage);
  if (!safetyResult.ok) {
    return saveAndReturn(await generateRefusal(model, profile, safetyResult.reason || "illegal"));
  }

  // 2. 关系管理 — 告白检测
  const relState = getOrCreateState(profile.relationship_mode);

  // 用户告白
  if (/(告白|表白|我喜欢你|我爱你|在一起|做我(女朋友|男朋友)|交往)/.test(userMessage)) {
    if (relState.stage === "lover") {
      return saveAndReturn(`${profile.user_nickname}...我们不是早就在一起了吗？傻瓜~ ❤️`);
    }

    if (profile.relationship_mode === "direct") {
      return saveAndReturn(`我们已经在一起了呀，${profile.user_nickname}~`);
    }

    const result = handleConfession(relState);
    if (result.success) {
      logger.info(`告白成功! 阶段: ${STAGE_LABELS[relState.stage]}`);
      return saveAndReturn(result.message);
    } else {
      logger.info(`告白失败。阶段: ${STAGE_LABELS[relState.stage]}`);
      return saveAndReturn(
        result.message +
        "\n\n[提示] 你可以选择: 继续做朋友聊下去 / 发送「删好友」结束这段关系"
      );
    }
  }

  // 用户选择删好友（告白失败后）
  if (/删好友/.test(userMessage)) {
    if (relState.breakupPending) {
      executeBreakup(relState);
      return saveAndReturn("好的...那就这样吧。再见。");
    }
    if (relState.confessions.length > 0 && !relState.confessions[relState.confessions.length - 1].success) {
      // 上次告白失败后选择删除
      executeBreakup(relState);
      return saveAndReturn("嗯...我尊重你的选择。谢谢你曾经喜欢过我。再见。");
    }
    // 其他情况 — 确认
    return saveAndReturn("你确定要删除我吗？这之后我们就不会再聊天了。如果确定的话，再发一次「确认删除」。");
  }

  if (/确认删除/.test(userMessage)) {
    executeBreakup(relState);
    return saveAndReturn("好的。祝你一切都好。再见。");
  }

  // 越线检测
  if (checkBoundaryViolation(userMessage)) {
    const boundary = processBoundaryViolation(relState);
    if (boundary.shouldBreakup) {
      return saveAndReturn(
        boundary.warningMessage +
        "\n\n[提示] 这是最后一次警告。你可以选择: 发送「我改」来挽回 / 发送「分手吧」结束关系"
      );
    }
    return saveAndReturn(boundary.warningMessage);
  }

  // 用户选择分手/挽回
  if (/(分手|分手吧|结束吧|我们不合适|我们分手)/.test(userMessage)) {
    if (relState.breakupPending) {
      return saveAndReturn(
        "我尊重你的决定。分手之后我们可以选择继续做朋友，或者就此告别。\n\n" +
        "发送「做朋友」保持联系 / 发送「删好友」彻底告别"
      );
    }
    // 不是分手流程中的分手请求 — 可能是闹别扭
    return saveAndReturn(`${profile.user_nickname}...你真的想好了吗？如果只是一时冲动，我们可以好好聊聊。如果你真的决定了，我会尊重你。但请再确认一次——发送「我确定要分手」。`);
  }

  if (/我确定要分手/.test(userMessage)) {
    return saveAndReturn(
      "好。谢谢我们曾经拥有过的时光。\n\n" +
      "发送「做朋友」保持联系 / 发送「删好友」彻底告别"
    );
  }

  if (/做朋友/.test(userMessage) && relState.breakupPending) {
    stayFriends(relState);
    return saveAndReturn("好...做朋友也好。谢谢你。我们重新开始吧，以朋友的身份。");
  }

  if (/我改/.test(userMessage) && relState.breakupPending) {
    relState.breakupPending = false;
    relState.boundaryWarnings = Math.max(0, relState.boundaryWarnings - 1);
    saveRelationshipState(relState);
    return saveAndReturn("好。我相信你。我们重新开始吧。");
  }

  // 更新好感度（养成模式且非恋人阶段）
  if (relState.mode === "slow_burn" && relState.stage !== "lover") {
    const delta = calculateAffectionDelta(userMessage, []);
    updateAffection(relState, delta);
  }

  // 3. 联网搜索检测
  let searchResults: string | undefined;
  if (needsSearch(userMessage)) {
    const query = extractSearchQuery(userMessage);
    searchResults = await searchWeb(query);
    logger.debug(`搜索完成: ${searchResults.length} 字符`);
  }

  // 3. 加载记忆
  const history = buildMessageHistory(userId, config.memory.maxHistoryTurns);
  const memoryContext = buildMemoryContext();
  const learnedInterests = loadLearnedInterests().interests;

  // 4. 会话状态
  const session = getSession(userId);
  updateSession(session, userMessage);

  // 5. 时间 + 心情
  const timeContext = buildTimeContext(profile.user_timezone);
  const todayMood = getTodayMood();

  // 6. 情绪检测
  const emotion = detectSadness(userMessage);

  // 7. 冷场检测 — 如果对话变冷，注入话题建议
  const recentUserMsgs = buildMessageHistory(userId, 5)
    .filter((m) => m.role === "user")
    .map((m) => m.content);
  const isDying = isConversationDying([...recentUserMsgs, userMessage]);

  // 8. 构建系统提示词
  let systemPrompt = buildSystemPrompt(
    profile,
    timeContext,
    todayMood,
    memoryContext,
    learnedInterests.length > 0 ? learnedInterests : undefined,
    searchResults,
    undefined, // refusalContext
    session, // 传入会话状态
  );

  // 养成模式: 注入关系阶段行为指引
  if (relState.mode === "slow_burn") {
    const stageGuidance = buildStageGuidance(relState, profile);
    if (stageGuidance) {
      systemPrompt += "\n\n" + stageGuidance;
    }
  }

  // 冷场 — 提示 AI 换个话题或让用户休息
  if (isDying) {
    const topic = suggestTopic(profile, learnedInterests);
    systemPrompt += `\n\n对话有点冷场了。${topic}。如果觉得对方真的累了，就温柔地说'要不你去歇会儿吧'。不要勉强尬聊。`;
    logger.debug("检测到冷场，注入话题建议");
  }

  // 防沉迷 — 长时间聊天后提醒休息
  if (shouldRemindBreak(session)) {
    systemPrompt += buildBreakReminder(nick, timeContext);
    logger.debug("防沉迷提醒");
  }

  // 情绪支持注入
  if (emotion === "sad") {
    systemPrompt += buildEmotionalSupportHint(nick);
  } else if (emotion === "crisis") {
    systemPrompt += buildCrisisHint(nick);
    logger.warn(`用户 ${userId} 触发危机关键词`);
  }

  // 10. 调用 AI 生成回复
  let reply: string;
  try {
    const result = await retry(() =>
      generateText({
        model,
        system: systemPrompt,
        messages: [
          ...history,
          { role: "user" as const, content: userMessage },
        ],
        maxOutputTokens: config.ai.maxTokens,
        temperature: config.ai.temperature,
      }),
    );

    reply = result.text || "";
  } catch (err) {
    logger.error("AI 调用失败:", err);
    return saveAndReturn(profile.custom_style?.emoticons
      ? "呜...刚才走神了，再说一遍好吗？(｡•́︿•̀｡)"
      : "呜...刚才走神了，再说一遍好吗？");
  }

  // 11. 安全检查 — 输出层
  const outputCheck = checkOutput(reply);
  if (!outputCheck.ok) {
    if (outputCheck.cleaned !== undefined) {
      reply = outputCheck.cleaned;
    } else {
      reply = fallbackRefusal();
    }
  }

  // 12. 保存记忆已在 saveAndReturn 中完成

  // 13. 简易长期记忆
  if (userMessage.length > 30) {
    // 简易话题提取 — 识别"我在XX"、"我是XX"、"我喜欢XX"等模式
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

/**
 * 生成动态拒绝回复（非固定模板）
 */
async function generateRefusal(
  model: LanguageModel,
  profile: Profile,
  reason: string,
): Promise<string> {
  try {
    const refusalPrompt = buildRefusalPrompt(profile.user_nickname, reason);
    const genderLabel = profile.relationship_type === "boyfriend" ? "男生" : "女生";
    const context = `${profile.name}是一个${profile.age}岁${profile.temperament}的${genderLabel}。${refusalPrompt}\n\n请用${profile.name}的身份自然地回复用户。`;

    const result = await generateText({
      model,
      system: context,
      messages: [{ role: "user", content: "（用户说了一些你不该回应的话）" }],
      maxOutputTokens: 200,
      temperature: 0.9,
    });

    return result.text || fallbackRefusal();
  } catch {
    return fallbackRefusal();
  }
}
