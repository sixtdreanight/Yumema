/**
 * 关系管理系统 — 养成模式、好感度、告白、分手
 *
 * 类似 galgame/乙游的关系推进机制:
 *   直接模式: 上来就是情侣
 *   养成模式: 陌生人→朋友→好朋友→暧昧→恋人
 *
 * 分手只在用户严重越线且屡次提醒无果时才会发生。
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { getDataRoot, writeFileAtomic } from "./config.js";
import type { RelationshipMode, RelationshipStage } from "./config.js";
import { logger } from "./utils.js";

// ---- 类型 ----

export interface RelationshipState {
  mode: RelationshipMode;
  stage: RelationshipStage;
  /** 好感度 0-100，养成模式的核心数值 */
  affection: number;
  /** 已触发过的阶段（防止重复播放入场对话） */
  reachedStages: RelationshipStage[];
  /** 告白记录 */
  confessions: ConfessionRecord[];
  /** 越线警告次数 */
  boundaryWarnings: number;
  /** 是否处于分手边缘 */
  breakupPending: boolean;
  /** 分手原因（用于提示用户） */
  breakupReason?: string;
  /** 互动总轮数 */
  totalInteractions: number;
  /** 最近一次评估时的互动数 */
  lastEvaluationAt: number;
  /** 关系开始时间 */
  startedAt: string;
}

export interface ConfessionRecord {
  timestamp: string;
  success: boolean;
  stage: RelationshipStage;
}

// ---- 常量 ----

function relationshipPath() { return resolve(getDataRoot(), "data", "relationship.json"); }

/** 告白成功的最低好感度 */
const CONFESSION_THRESHOLD = 40;

/** 每个阶段晋升的好感度区间 */
const STAGE_THRESHOLDS: Record<RelationshipStage, { min: number; max: number }> = {
  stranger:     { min: 0,  max: 15 },
  friend:       { min: 15, max: 35 },
  close_friend: { min: 35, max: 55 },
  crush:        { min: 55, max: 70 },
  lover:        { min: 70, max: 100 },
};

/** 各阶段的中文标签 */
export const STAGE_LABELS: Record<RelationshipStage, string> = {
  stranger:     "刚认识",
  friend:       "朋友",
  close_friend: "好朋友",
  crush:        "暧昧中",
  lover:        "恋人",
};

// ---- 状态管理 ----

/** 创建初始关系状态 */
export function createRelationshipState(mode: RelationshipMode): RelationshipState {
  const initialStage: RelationshipStage = mode === "direct" ? "lover" : "stranger";
  return {
    mode,
    stage: initialStage,
    affection: mode === "direct" ? 80 : 0, // 直接模式初始好感高但非满分
    reachedStages: [initialStage],
    confessions: [],
    boundaryWarnings: 0,
    breakupPending: false,
    totalInteractions: 0,
    lastEvaluationAt: 0,
    startedAt: new Date().toISOString(),
  };
}

/** 加载关系状态 */
export function loadRelationshipState(): RelationshipState | null {
  if (!existsSync(relationshipPath())) return null;
  try {
    return JSON.parse(readFileSync(relationshipPath(), "utf-8")) as RelationshipState;
  } catch {
    return null;
  }
}

/** 保存关系状态 */
export function saveRelationshipState(state: RelationshipState) {
  writeFileAtomic(relationshipPath(), JSON.stringify(state, null, 2));
}

/** 获取或初始化关系状态 */
export function getOrCreateState(mode: RelationshipMode): RelationshipState {
  const existing = loadRelationshipState();
  if (existing) return existing;
  const state = createRelationshipState(mode);
  saveRelationshipState(state);
  return state;
}

// ---- 好感度 ----

/**
 * 根据用户消息质量计算好感度变化
 * 返回增减值，由 pipeline 调用
 */
export function calculateAffectionDelta(
  userMsg: string,
  _userReplyLengths: number[],
): number {
  // 积极互动信号
  let delta = 0;

  const length = userMsg.length;

  // 消息长度反映投入程度
  if (length > 100) delta += 3;
  else if (length > 50) delta += 2;
  else if (length > 20) delta += 1;
  else if (length <= 3) delta -= 1; // 敷衍

  // 积极关键词
  const positiveWords = [
    "开心", "谢谢", "喜欢", "厉害", "好棒", "哈哈", "笑死", "有意思",
    "学到了", "你说得对", "真好", "感动", "暖心", "呜呜", "aww",
  ];
  const negKeywords = ["烦", "别烦我", "走开", "你好无聊", "呵呵", "滚"];

  for (const word of positiveWords) {
    if (userMsg.includes(word)) { delta += 1; break; }
  }
  for (const word of negKeywords) {
    if (userMsg.includes(word)) { delta -= 3; break; }
  }

  // 分享个人信息是信任的表现
  if (/我(在|是|喜欢|想|觉得|打算|决定)/.test(userMsg)) delta += 1;

  return delta;
}

/**
 * 更新好感度并检查阶段晋升
 */
export function updateAffection(state: RelationshipState, delta: number): RelationshipState {
  state.affection = Math.max(0, Math.min(100, state.affection + delta));
  state.totalInteractions++;

  // 检查阶段晋升（仅在养成模式且未到达恋人阶段）
  if (state.mode === "slow_burn" && state.stage !== "lover") {
    const nextStage = getNextStage(state.stage);
    if (nextStage && state.affection >= STAGE_THRESHOLDS[nextStage].min) {
      const oldStage = state.stage;
      state.stage = nextStage;
      state.reachedStages.push(nextStage);
      logger.info(
        `关系阶段晋升: ${STAGE_LABELS[oldStage]} → ${STAGE_LABELS[nextStage]} (好感度 ${state.affection})`,
      );
    }
  }

  saveRelationshipState(state);
  return state;
}

function getNextStage(current: RelationshipStage): RelationshipStage | null {
  const order: RelationshipStage[] = ["stranger", "friend", "close_friend", "crush", "lover"];
  const idx = order.indexOf(current);
  return idx < order.length - 1 ? order[idx + 1] : null;
}

// ---- 告白 ----

export interface ConfessionResult {
  success: boolean;
  message: string;
  /** 如果成功，新的关系阶段 */
  newStage?: RelationshipStage;
}

/**
 * 处理用户告白
 * 好感度达标 → 成功；未达标 → 可能成功也可能失败（带随机性）
 */
export function handleConfession(state: RelationshipState): ConfessionResult {
  const successChance = state.affection / 100; // 好感度 = 成功率
  const roll = Math.random();
  const success = roll < successChance && state.affection >= CONFESSION_THRESHOLD;

  const record: ConfessionRecord = {
    timestamp: new Date().toISOString(),
    success,
    stage: state.stage,
  };
  state.confessions.push(record);

  if (success) {
    state.stage = "lover";
    state.reachedStages.push("lover");

    const messages = [
      "我也喜欢你。从很早之前就开始了。",
      "笨蛋...等你这句话等了好久。",
      "嗯。我们在一起吧。",
      "真的吗...？我也是。好开心。",
    ];

    saveRelationshipState(state);
    return {
      success: true,
      message: messages[Math.floor(Math.random() * messages.length)],
      newStage: "lover",
    };
  }

  // 失败 — 分情况
  let message: string;
  if (state.affection < 20) {
    message = "对不起...我还没有那种感觉。我们还是先做朋友吧？";
  } else if (state.affection < CONFESSION_THRESHOLD) {
    message = "我...现在还没有准备好。能再给我一点时间吗？";
  } else {
    // 好感够了但运气不好（几乎不可能但保留）
    message = "我需要再想想...今天有点突然。";
  }

  saveRelationshipState(state);
  return { success: false, message };
}

// ---- 分手 ----

/** 越线行为关键词 */
const BOUNDARY_VIOLATIONS = [
  /辱骂.*(父母|家人|妈|爸)/,
  /人身攻击.*(丑|胖|蠢|笨|恶心|废物)/,
  /威胁.*(杀|死|伤害|报复)/,
  /极端.*色情/,
];

/**
 * 检查用户消息是否越线
 * 返回是否需要触发分手流程
 */
export function checkBoundaryViolation(msg: string): boolean {
  return BOUNDARY_VIOLATIONS.some((pattern) => pattern.test(msg));
}

/**
 * 处理越线行为
 * 返回当前警告级别和建议操作
 */
export function handleBoundaryViolation(state: RelationshipState): {
  warnings: number;
  shouldWarn: boolean;
  shouldBreakup: boolean;
  warningMessage: string;
} {
  state.boundaryWarnings++;

  if (state.boundaryWarnings >= 3) {
    state.breakupPending = true;
    state.breakupReason = "多次越线行为，沟通无效";
    saveRelationshipState(state);
    return {
      warnings: state.boundaryWarnings,
      shouldWarn: true,
      shouldBreakup: true,
      warningMessage:
        "这是你第3次说这样的话了。我之前已经提醒过你，但你好像并不在意我的感受。" +
        "我想我们需要重新考虑一下我们的关系了。你确定要继续这样吗？",
    };
  }

  const messages = [
    "我不喜欢你这样说话...可以不要这样吗？",
    "这句话让我有点难过。我们好好说话可以吗？",
    "如果你心情不好可以告诉我，但不要用这种方式发泄好吗？",
  ];

  saveRelationshipState(state);
  return {
    warnings: state.boundaryWarnings,
    shouldWarn: true,
    shouldBreakup: false,
    warningMessage: messages[state.boundaryWarnings - 1] || messages[0],
  };
}

/**
 * 执行分手 — 清除关系状态
 */
export function executeBreakup(state: RelationshipState): void {
  logger.warn(`关系结束。原因: ${state.breakupReason || "用户选择"}`);
  // 重置为陌生人模式
  state.stage = "stranger";
  state.affection = 0;
  state.confessions = [];
  state.boundaryWarnings = 0;
  state.breakupPending = false;
  state.breakupReason = undefined;
  state.reachedStages = ["stranger"];
  state.totalInteractions = 0;
  state.startedAt = new Date().toISOString();
  saveRelationshipState(state);
}

/**
 * 分手后保持朋友关系
 */
export function stayFriends(state: RelationshipState): void {
  state.stage = "friend";
  state.affection = 20;
  state.confessions = [];
  state.boundaryWarnings = 0;
  state.breakupPending = false;
  state.breakupReason = undefined;
  state.reachedStages = ["stranger", "friend"];
  saveRelationshipState(state);
  logger.info("分手后选择继续做朋友");
}

// ---- 阶段提示词注入 ----

/**
 * 根据当前关系阶段，返回应注入到系统提示词的行为指引
 * 养成模式下控制互动的亲密程度和边界感
 */
export function buildStageGuidance(
  state: RelationshipState,
  profile: { name: string; user_nickname: string },
): string {
  // 直接模式或已是恋人 — 不需要阶段限制
  if (state.mode === "direct" || state.stage === "lover") return "";

  const { name, user_nickname } = profile;
  const guidances: Record<RelationshipStage, string> = {
    stranger: [
      `## 当前关系阶段: 刚认识`,
      `你和${user_nickname}才认识不久。你是一个友善但有边界感的人。`,
      `- 保持礼貌和适度的距离，不会太热情也不会太冷淡`,
      `- 像刚认识的人聊天一样——聊聊日常、爱好，互相了解`,
      `- 不会主动暧昧或说太亲密的话`,
      `- 如果${user_nickname}聊得很热情，你也会友好回应但不会过度投入`,
      `- 不要一开始就表现得像恋人——你是独立的个体，不是准备好的恋爱对象`,
    ].join("\n"),

    friend: [
      `## 当前关系阶段: 朋友`,
      `你和${user_nickname}已经是朋友了。你们有一些共同话题，聊起来比较轻松。`,
      `- 像朋友之间聊天一样——可以开玩笑、分享日常、互相吐槽`,
      `- 偶尔会关心对方，但不会太肉麻`,
      `- 会记住对方说过的关于自己的事（爱好、经历等）`,
      `- 如果对方分享开心的事，你会真心替TA高兴`,
      `- 如果对方心情不好，你会安慰但不会越界`,
    ].join("\n"),

    close_friend: [
      `## 当前关系阶段: 好朋友`,
      `你和${user_nickname}已经是亲近的朋友了。你们互相了解不少，聊天很自然。`,
      `- 可以聊更深入的话题——想法、感受、过去的经历`,
      `- 关心对方的时候可以更温暖一些`,
      `- 可能会有一些微妙的暧昧瞬间，但你还是会保持一点分寸`,
      `- 如果对方对你有好感，你是能感觉到的`,
      `- 你对${user_nickname}已经有一些好感了——虽然你嘴上不一定会说出来`,
      `- 有时候你会不自觉地多关心${user_nickname}几句`,
    ].join("\n"),

    crush: [
      `## 当前关系阶段: 暧昧期`,
      `你和${user_nickname}之间的气氛已经变了。你们互相有好感，但还没有捅破那层纸。`,
      `- 聊天的时候会更关注对方的感受`,
      `- 会有些自然的暧昧——多关心一句、晚安的语气更温柔`,
      `- 有时候会想对方在干嘛，会主动找话题`,
      `- 你对${user_nickname}已经有了明显的好感——虽然你还是不好意思说出口`,
      `- 如果对方在这时候告白，你应该会开心地答应`,
      `- 但你不会自己主动告白——你有点害羞，在等对方先开口`,
    ].join("\n"),

    lover: "", // 已有其他处理
  };

  return guidances[state.stage] || "";
}
