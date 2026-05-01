/**
 * PreProcessStage — 安全检查 + 关系状态机 + 搜索
 *
 * 如果返回 earlyReturn，编排器应跳过后续阶段直接进入 PostProcess。
 */

import type { LanguageModel } from "ai";
import type { AppConfig, Profile } from "../config.js";
import { logger } from "../utils.js";
import { checkInput, buildRefusalPrompt, fallbackRefusal } from "../safety.js";
import { needsSearch, extractSearchQuery, searchWeb } from "../search.js";
import {
  getOrCreateState,
  calculateAffectionDelta,
  updateAffection,
  handleConfession,
  checkBoundaryViolation,
  handleBoundaryViolation,
  executeBreakup,
  stayFriends,
  saveRelationshipState,
  STAGE_LABELS,
} from "../relationship.js";

export interface PreProcessInput {
  userId: string;
  userMessage: string;
  model: LanguageModel;
  config: AppConfig;
  profile: Profile;
}

export interface PreProcessOutput {
  /** 非 null 表示安全拦截或关系事件触发，应直接返回此回复 */
  earlyReturn: string | null;
  /** 搜索结果文本，undefined 表示无需搜索或搜索失败 */
  searchResults: string | undefined;
  /** 关系状态（用于后续阶段注入行为指引） */
  relState: ReturnType<typeof getOrCreateState>;
}

export async function preProcessStage(input: PreProcessInput): Promise<PreProcessOutput> {
  const { userId, userMessage, model, config, profile } = input;

  // 1. 安全检查
  const safetyResult = checkInput(userMessage, config.contentFilter);
  if (!safetyResult.ok) {
    const refusal = await generateRefusal(model, profile, safetyResult.reason || "illegal");
    return { earlyReturn: refusal, searchResults: undefined, relState: getOrCreateState(profile.relationship_mode) };
  }

  // 2. 关系状态机
  const relState = getOrCreateState(profile.relationship_mode);
  const relationReply = handleRelationshipFlow(userMessage, profile, relState);
  if (relationReply !== null) return { earlyReturn: relationReply, searchResults: undefined, relState };

  // 3. 好感度更新
  if (relState.mode === "slow_burn" && relState.stage !== "lover") {
    const delta = calculateAffectionDelta(userMessage, []);
    updateAffection(relState, delta);
  }

  // 4. 联网搜索
  let searchResults: string | undefined;
  if (needsSearch(userMessage)) {
    const query = extractSearchQuery(userMessage);
    searchResults = await searchWeb(query);
    logger.debug(`搜索完成: ${searchResults.length} 字符`);
  }

  return { earlyReturn: null, searchResults, relState };
}

// ---- 关系状态机（从 pipeline.ts 提取） ----

function handleRelationshipFlow(
  userMessage: string,
  profile: Profile,
  relState: ReturnType<typeof getOrCreateState>,
): string | null {
  // 用户告白
  if (/(告白|表白|我喜欢你|我爱你|在一起|做我(女朋友|男朋友)|交往)/.test(userMessage)) {
    if (relState.stage === "lover") {
      return `${profile.user_nickname}...我们不是早就在一起了吗？傻瓜~ ❤️`;
    }
    if (profile.relationship_mode === "direct") {
      return `我们已经在一起了呀，${profile.user_nickname}~`;
    }
    const result = handleConfession(relState);
    if (result.success) {
      logger.info(`告白成功! 阶段: ${STAGE_LABELS[relState.stage]}`);
      return result.message;
    }
    logger.info(`告白失败。阶段: ${STAGE_LABELS[relState.stage]}`);
    return result.message +
      "\n\n[提示] 你可以选择: 继续做朋友聊下去 / 发送「删好友」结束这段关系";
  }

  // 删好友
  if (/删好友/.test(userMessage)) {
    if (relState.breakupPending) { executeBreakup(relState); return "好的...那就这样吧。再见。"; }
    if (relState.confessions.length > 0 && !relState.confessions[relState.confessions.length - 1].success) {
      executeBreakup(relState);
      return "嗯...我尊重你的选择。谢谢你曾经喜欢过我。再见。";
    }
    return "你确定要删除我吗？这之后我们就不会再聊天了。如果确定的话，再发一次「确认删除」。";
  }

  if (/确认删除/.test(userMessage)) {
    executeBreakup(relState);
    return "好的。祝你一切都好。再见。";
  }

  // 越线检测
  if (checkBoundaryViolation(userMessage)) {
    const boundary = handleBoundaryViolation(relState);
    if (boundary.shouldBreakup) {
      return boundary.warningMessage +
        "\n\n[提示] 这是最后一次警告。你可以选择: 发送「我改」来挽回 / 发送「分手吧」结束关系";
    }
    return boundary.warningMessage;
  }

  // 分手/挽回
  if (/(分手|分手吧|结束吧|我们不合适|我们分手)/.test(userMessage)) {
    if (relState.breakupPending) {
      return "我尊重你的决定。分手之后我们可以选择继续做朋友，或者就此告别。\n\n发送「做朋友」保持联系 / 发送「删好友」彻底告别";
    }
    return `${profile.user_nickname}...你真的想好了吗？如果只是一时冲动，我们可以好好聊聊。如果你真的决定了，我会尊重你。但请再确认一次——发送「我确定要分手」。`;
  }

  if (/我确定要分手/.test(userMessage)) {
    return "好。谢谢我们曾经拥有过的时光。\n\n发送「做朋友」保持联系 / 发送「删好友」彻底告别";
  }

  if (/做朋友/.test(userMessage) && relState.breakupPending) {
    stayFriends(relState);
    return "好...做朋友也好。谢谢你。我们重新开始吧，以朋友的身份。";
  }

  if (/我改/.test(userMessage) && relState.breakupPending) {
    relState.breakupPending = false;
    relState.boundaryWarnings = Math.max(0, relState.boundaryWarnings - 1);
    saveRelationshipState(relState);
    return "好。我相信你。我们重新开始吧。";
  }

  return null;
}

async function generateRefusal(
  model: LanguageModel,
  profile: Profile,
  reason: string,
): Promise<string> {
  try {
    const { generateText } = await import("ai");
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
