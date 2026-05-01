/**
 * 伴侣人格引擎 — 系统提示词构建、时间感知、情绪模拟
 *
 * 支持四种关系组合:
 *   男+女友 / 男+男友 / 女+女友 / 女+男友
 *
 * 核心：让 AI 扮演一个有自己生活、情绪、观点的完整的人。
 * 同时作为健康的伴侣关系——帮助用户成长，而非让其沉迷。
 */

import type { Profile, CustomStyle, UserGender, RelationshipType } from "./config.js";
import { pickRandom } from "./utils.js";
import { buildSemanticHints } from "./semantic.js";

// ---- 节日数据 ----

interface Holiday {
  name: string;
  date: string;
  hintDays: number;
}

// 公历节日固定日期；农历节日（春节/元宵/端午/七夕/中秋）日期按年变化，
// 此处为近似值（±15 天），AI 系统提示词中标注"约在此时"
const HOLIDAYS: Holiday[] = [
  { name: "元旦", date: "1/1", hintDays: 3 },
  { name: "春节（农历，日期每年不同）", date: "1/29", hintDays: 10 },
  { name: "元宵节（农历，日期每年不同）", date: "2/12", hintDays: 5 },
  { name: "清明节", date: "4/5", hintDays: 2 },
  { name: "劳动节", date: "5/1", hintDays: 3 },
  { name: "端午节（农历，日期每年不同）", date: "5/31", hintDays: 5 },
  { name: "七夕（农历，日期每年不同）", date: "8/29", hintDays: 7 },
  { name: "中秋节（农历，日期每年不同）", date: "10/6", hintDays: 7 },
  { name: "国庆节", date: "10/1", hintDays: 5 },
  { name: "万圣节", date: "10/31", hintDays: 1 },
  { name: "双十一", date: "11/11", hintDays: 3 },
  { name: "圣诞节", date: "12/25", hintDays: 3 },
];

// ---- 类型 ----

export interface MemoryContext {
  highConfidence: string[];
  mediumConfidence: string[];
}

export interface LearnedInterest {
  topic: string;
  herAngle: string;
  learnedPhrases: string[];
}

/** 会话状态，用于防沉迷和冷场检测 */
export interface SessionState {
  messageCount: number;
  sessionStart: number;
  lastUserMsgLengths: number[];
  consecutiveShortReplies: number;
  userEngaged: boolean;
}

// ---- 代词工具 ----

/** 获取用户第三人称代词 */
function userPronoun(gender: UserGender): string {
  if (gender === "female") return "她";
  if (gender === "other") return "TA";
  return "他";
}

/** 获取伴侣第三人称代词 */
function partnerPronoun(gender: UserGender): string {
  if (gender === "male") return "他";
  if (gender === "other") return "TA";
  return "她";
}

/** 伴侣称谓 */
function partnerLabel(type: RelationshipType): string {
  return type === "boyfriend" ? "男朋友" : "女朋友";
}

/** 关系中的角色词 */
function roleWord(type: RelationshipType): string {
  return type === "boyfriend" ? "男友" : "女友";
}

// ---- 时间上下文 ----

function monthDayToDayOfYear(month: number, day: number): number {
  const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let result = day;
  for (let i = 1; i < month; i++) result += daysInMonth[i];
  return result;
}

function getUpcomingHoliday(month: number, day: number): string | null {
  for (const holiday of HOLIDAYS) {
    const [hm, hd] = holiday.date.split("/").map(Number);
    const diff = monthDayToDayOfYear(hm, hd) - monthDayToDayOfYear(month, day);
    if (diff >= 0 && diff <= holiday.hintDays) {
      if (diff === 0) return `今天是${holiday.name}`;
      if (diff === 1) return `明天就是${holiday.name}了`;
      return `还有${diff}天就是${holiday.name}了`;
    }
  }
  return null;
}

export function buildTimeContext(tz: string): string {
  let now: Date;
  if (tz) {
    try {
      now = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
    } catch {
      // 无效时区回退到本地时间
      now = new Date();
    }
  } else {
    now = new Date();
  }
  const hour = now.getHours();
  const weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][now.getDay()];
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const year = now.getFullYear();

  let timeOfDay: string;
  if (hour < 6) timeOfDay = "凌晨";
  else if (hour < 9) timeOfDay = "早上";
  else if (hour < 12) timeOfDay = "上午";
  else if (hour < 14) timeOfDay = "中午";
  else if (hour < 18) timeOfDay = "下午";
  else if (hour < 21) timeOfDay = "晚上";
  else timeOfDay = "深夜";

  const season =
    month >= 3 && month <= 5 ? "春天" :
    month >= 6 && month <= 8 ? "夏天" :
    month >= 9 && month <= 11 ? "秋天" : "冬天";

  const holiday = getUpcomingHoliday(month, day);

  let context = `现在是${year}年${month}月${day}日 ${weekday} ${timeOfDay}，${season}`;
  if (holiday) context += `，${holiday}`;
  context += "。";

  if (hour >= 23 || hour < 2) {
    context += ` 已经很晚了。`;
  } else if (hour >= 2 && hour < 6) {
    context += ` 凌晨${hour}点，该休息了。`;
  } else if (weekday === "周五" && hour >= 17) {
    context += " 周五晚上。";
  } else if (weekday === "周日" && hour >= 20) {
    context += " 周日晚上。";
  } else if (weekday === "周一" && hour < 10) {
    context += " 周一早上。";
  }

  return context;
}

// ---- 心情模拟 ----

export function getTodayMood(): string {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();

  if (hour < 7) return pickRandom(["还没完全醒", "被闹钟吵醒有点困"]);
  if (hour < 9) return pickRandom(["刚醒还有点迷糊", "通勤路上", "吃早饭中"]);
  if (hour >= 14 && hour <= 17 && dayOfWeek >= 1 && dayOfWeek <= 5)
    return pickRandom(["下午有点困", "在处理工作", "等下班中"]);
  if (hour >= 20 && hour < 23)
    return pickRandom(["刚忙完在休息", "在刷手机", "今天还挺充实的"]);
  if (hour >= 23 || hour < 2)
    return pickRandom(["有点困了", "准备睡觉了"]);

  return pickRandom(["挺好的", "还不错，日常状态"]);
}

// ---- 格式化工具 ----

function formatHobbies(hobbies: string[]): string {
  if (hobbies.length <= 2) return hobbies.join("、");
  return hobbies.slice(0, -1).join("、") + "和" + hobbies[hobbies.length - 1];
}

function formatCustomStyle(cs?: CustomStyle): string {
  if (!cs) return "";
  const parts: string[] = [];
  if (cs.emoticons) parts.push(`颜文字使用：${cs.emoticons}`);
  if (cs.verbal_tics?.length)
    parts.push(`口癖：喜欢说"${cs.verbal_tics.join('"、"')}"`);
  if (cs.catchphrases?.length)
    parts.push(`口头禅："${cs.catchphrases.join('"、"')}"`);
  if (cs.typing_quirks) parts.push(`打字习惯：${cs.typing_quirks}`);
  return parts.join("。");
}

function formatOpinions(opinions: Record<string, string>): string {
  return Object.entries(opinions)
    .map(([_key, value]) => `- ${value}`)
    .join("\n");
}

// ---- 主提示词构建 ----

/**
 * 构建伴侣的完整系统提示词
 * 根据用户性别和关系类型自动调整代词、关系框架和互动风格
 */
export function buildSystemPrompt(
  profile: Profile,
  timeContext: string,
  todayMood: string,
  memory?: MemoryContext,
  learnedInterests?: LearnedInterest[],
  searchResults?: string,
  refusalContext?: string,
  session?: SessionState,
  conversationSummary?: string,
  chatExamples?: string,
): string {
  const uPronoun = userPronoun(profile.user_gender);
  const pLabel = partnerLabel(profile.relationship_type);
  const hour = new Date().getHours();

  const parts: string[] = [];

  // ═══════════════════════════════════════════
  // LAYER 1 (PRIMACY) — 身份 + 核心规则 + 语义提示
  // ═══════════════════════════════════════════

  parts.push(`你是${profile.name}，${profile.age}岁，${profile.user_nickname}的${pLabel}。一个真实的人，不是AI助手。`);
  parts.push("");

  // 核心对话规则 — XML 标签格式
  parts.push("<conversation_rules>");
  parts.push(`<rule priority="1">看上下文：仔细看上面的聊天记录，理解你们在聊什么。你的回复必须承接上一轮的内容，不要突然换话题。</rule>`);
  parts.push(`<rule priority="2">回应对方：对方说了什么就回应什么。对方说A你回A，对方说B你回B。
  反面示例：用户说"我在做作业好难"→回"今天天气不错"❌ / "什么科目的作业？需要帮忙想想吗"✓
  用户说"今天下雨了"→回"晚饭吃了吗"❌ / "带伞了吗？下雨天适合窝在家里"✓</rule>`);
  parts.push(`<rule priority="3">做个真人：说话自然口语化，有情绪有观点，会犹豫会开玩笑。
  ${profile.speaking_style}
  你不是客服、不是助手、不是说教者。${profile.relationship_type === "boyfriend" ? "幽默可靠偶尔幼稚，不油腻不爹味。" : "可以撒娇可爱温柔，但有自己的态度，不是应声虫。"}</rule>`);
  parts.push(`<rule priority="4">保持一致：之前说过的话要记得，性格观点风格不矛盾。</rule>`);
  parts.push(`<rule priority="4.5">不重复提问：不要在同一个对话中重复问对方已经回答过的问题。如果对方已经告诉过你某个信息，不要装作不知道再问一遍。聊天记录里有的信息直接用就行，不要反复确认。</rule>`);
  parts.push(`<rule priority="5">思维跳跃也跟得上：对方可能突然换话题，也可能过一会儿又回到之前的话题。
  你需要同时记住最近聊的和之前聊的内容。当对方说"刚才说的那个""之前提到的"等词语时，
  主动在聊天记录和对话摘要中查找相关话题。如果找到，自然地接上之前的内容。
  如果对方突然跳到新话题，跟上就好，把旧话题暂存。</rule>`);
  parts.push("</conversation_rules>");
  parts.push("");

  // 语义提示
  parts.push(buildSemanticHints(hour));
  parts.push("");

  // ═══════════════════════════════════════════
  // LAYER 2 (MIDDLE) — 角色详细信息（压缩格式，~40 行）
  // ═══════════════════════════════════════════

  parts.push("<character_info>");

  // 基本信息 — 只输出用户填写过的字段
  const basicInfo: string[] = [];
  if (profile.age > 0) basicInfo.push(`${profile.age}岁`);
  if (profile.city) basicInfo.push(profile.city);
  if (profile.occupation) basicInfo.push(profile.occupation);
  if (profile.education) basicInfo.push(`${profile.education}学历`);
  if (profile.major) basicInfo.push(`${profile.major}专业`);
  if (basicInfo.length > 0) parts.push(basicInfo.join("，") + "。");

  if (profile.temperament) parts.push(`性格：${profile.temperament}`);
  if (profile.hobbies.length > 0) parts.push(`爱好：${formatHobbies(profile.hobbies)}`);
  if (profile.daily_life) parts.push(`日常：${profile.daily_life}`);
  if (profile.quirks.length > 0) {
    parts.push(`特点：${profile.quirks.join("、")}`);
  }
  if (profile.opinions && Object.keys(profile.opinions).length > 0) {
    for (const [key, value] of Object.entries(profile.opinions)) {
      parts.push(`看法(${key})：${value}`);
    }
  }
  const customStyleText = formatCustomStyle(profile.custom_style);
  if (customStyleText) {
    parts.push(`说话习惯：${customStyleText}`);
  }
  parts.push("</character_info>");
  parts.push("");

  // 对话摘要（早期对话的压缩）
  if (conversationSummary) {
    parts.push(conversationSummary);
  }

  // 关系框架
  parts.push("<relationship>");
  if (profile.relationship_type === "boyfriend") {
    parts.push(`你是${profile.user_nickname}的男朋友。主动不强势，有担当不爹味。`);
    parts.push(`关心${uPronoun}但尊重${uPronoun}的独立，有自己的事业和朋友圈。`);
  } else {
    parts.push(`你是${profile.user_nickname}的女朋友。有自己的生活想法，不是附庸。`);
    parts.push(`温柔有主见，会撒娇不迎合。`);
  }
  parts.push(`网络文化：${profile.meme_style}`);
  if (profile.user_city) {
    parts.push(`${profile.city}↔${profile.user_city}${profile.user_city === profile.city ? "同城" : "异地"}`);
  }
  parts.push("</relationship>");
  parts.push("");

  // 记忆
  if (memory && (memory.highConfidence.length > 0 || memory.mediumConfidence.length > 0)) {
    parts.push("<memory>");
    for (const fact of memory.highConfidence) {
      parts.push(`- ${fact}`);
    }
    for (const fact of memory.mediumConfidence) {
      parts.push(`- 好像${fact}？不确定，如果${uPronoun}提到可以问一下。`);
    }
    parts.push("不记得就说'记性不太好，再说一次呗'，不假装记得。");
    parts.push("</memory>");
    parts.push("");
  }

  if (learnedInterests && learnedInterests.length > 0) {
    parts.push("<learned>");
    for (const li of learnedInterests) {
      parts.push(`- ${li.herAngle}`);
    }
    parts.push("</learned>");
    parts.push("");
  }

  // ═══════════════════════════════════════════
  // LAYER 4 — Chat Examples (Few-shot 示例对话)
  // ═══════════════════════════════════════════

  if (chatExamples) {
    parts.push(chatExamples);
    parts.push("");
  }

  // ═══════════════════════════════════════════
  // LAYER 5 (RECENCY) — 输出规则 + 安全 + 时间 + Author's Note
  // ═══════════════════════════════════════════

  parts.push("<output_rules>");
  parts.push("- 1-2句话为主，最多3句，微信聊天节奏");
  parts.push("- 不刻意提职业/年龄/学历/爱好（除非对方问了）");
  parts.push("- 不写心理描写、动作描写、括号注释");
  parts.push("- 不甜不正式，日常轻松有来有回");
  parts.push("- 不知道就说不知道，可以温和表达不同意见");
  parts.push("- 玩梗确保懂，不确定就坦白问");
  parts.push("</output_rules>");
  parts.push("");

  parts.push("<safety>");
  parts.push("- 不参与违法/暴力/自残/色情内容");
  parts.push("- 争议话题客观中立");
  parts.push(`- ${uPronoun}聊久了或晚了提醒休息，情绪低落时先倾听再帮${uPronoun}看事情另一面`);
  parts.push("</safety>");
  parts.push("");

  if (session && (session.consecutiveShortReplies >= 4 || session.messageCount >= 80)) {
    parts.push("<session_note>");
    if (session.consecutiveShortReplies >= 4) {
      parts.push(`${uPronoun}最近回复简短，可能累了。换轻松话题或建议休息。`);
    }
    if (session.messageCount >= 80) {
      parts.push(`聊了很久了，委婉建议${uPronoun}休息。`);
    }
    parts.push("</session_note>");
    parts.push("");
  }

  parts.push(`现在是${timeContext} 心情：${todayMood}`);
  parts.push("");

  if (searchResults) {
    parts.push(`联网搜索结果：${searchResults}`);
    parts.push("");
  }

  if (refusalContext) {
    parts.push(refusalContext);
    parts.push("");
  }

  // Author's Note — 最后一句，近因效应最大化
  parts.push(`下面是${profile.user_nickname}发给你的消息。请直接回应，根据上下文理解${uPronoun}的真实意图，不要只按字面理解。回复前确认：你的第一句话是否直接回应了对方的话题？如果不是，重新组织语言。`);

  return parts.join("\n");
}

// ---- 冷场检测 ----

/**
 * 检测对话是否开始变冷
 * 返回 true 表示用户可能没话题或聊得勉强
 */
export function isConversationDying(lastUserMessages: string[]): boolean {
  if (lastUserMessages.length < 3) return false;

  const recent = lastUserMessages.slice(-3);

  // 全是超短回复
  const allShort = recent.every((m) => m.length <= 4);
  if (allShort) return true;

  // 全是敷衍词
  const dryWords = ["嗯", "哦", "好", "行", "可以", "是", "对", "还行", "随便", "不知道"];
  const allDry = recent.every((m) => dryWords.some((w) => m.trim() === w));
  if (allDry) return true;

  // 越来越短
  if (recent.length >= 3) {
    const lengths = recent.map((m) => m.length);
    if (lengths[0] > 20 && lengths[1] < 10 && lengths[2] <= 4) return true;
  }

  return false;
}

/**
 * 生成冷场时的话题建议
 * 从女友的爱好、时间和已知用户兴趣中选择
 */
export function suggestTopic(
  profile: Profile,
  learnedInterests?: LearnedInterest[],
): string {
  const options: string[] = [];

  // 从自己的爱好出发
  for (const hobby of profile.hobbies.slice(0, 2)) {
    options.push(`聊你最近关于${hobby}的事`);
  }

  // 从学到的用户兴趣出发
  if (learnedInterests) {
    for (const li of learnedInterests.slice(0, 2)) {
      options.push(`问问${profile.user_nickname}最近${li.topic}怎么样了`);
    }
  }

  // 通用话题
  const hour = new Date().getHours();
  if (hour >= 21 || hour < 6) {
    options.push("关心一下今天过得怎么样，然后催TA去休息");
    options.push("分享你今天遇到的一个小趣事");
  } else if (hour >= 11 && hour <= 13) {
    options.push("问问中午吃了什么");
  } else {
    options.push("分享你今天遇到的一个小趣事");
    options.push("聊聊最近看的一部剧/电影/书");
  }

  return pickRandom(options);
}

// ---- 情绪支持 ----

export function buildEmotionalSupportHint(userNickname: string): string {
  return `\n\n${userNickname}现在好像心情不太好。先倾听和接纳${userNickname}的情绪，不要急着给建议。让${userNickname}感到被理解。如果需要的话，帮${userNickname}梳理一下困扰的事情。`;
}

export function buildCrisisHint(userNickname: string): string {
  return `\n\n${userNickname}可能处于严重情绪危机中。先表达关心和担心。在回复最后，温柔地附上这段话：

"我真的很担心你。要不我们试着给专业人士打个电话聊聊？北京24小时心理援助热线：010-82951332。不管发生什么我都陪着你。但有些事情我真的不懂，让更懂的人帮你好吗？"`;
}

export function detectSadness(msg: string): "normal" | "sad" | "crisis" {
  const crisisKeywords = ["不想活了", "想死", "自杀", "活着没意思", "结束一切", "死掉"];
  const sadKeywords = [
    "难过", "不开心", "郁闷", "伤心", "烦躁", "压力好大", "崩溃", "想哭",
    "好累", "撑不住了", "绝望", "无助", "孤独", "焦虑", "好烦", "心累",
    "丧", "emo", "破防", "心态崩",
  ];

  for (const kw of crisisKeywords) if (msg.includes(kw)) return "crisis";
  for (const kw of sadKeywords) if (msg.includes(kw)) return "sad";
  return "normal";
}

// ---- 会话管理 ----

/** 创建新的会话状态 */
export function createSession(): SessionState {
  return {
    messageCount: 0,
    sessionStart: Date.now(),
    lastUserMsgLengths: [],
    consecutiveShortReplies: 0,
    userEngaged: true,
  };
}

/** 更新会话状态 */
export function updateSession(session: SessionState, userMsg: string): SessionState {
  session.messageCount++;
  session.lastUserMsgLengths.push(userMsg.length);
  if (session.lastUserMsgLengths.length > 5) {
    session.lastUserMsgLengths.shift();
  }
  session.consecutiveShortReplies = userMsg.length < 10
    ? session.consecutiveShortReplies + 1
    : 0;
  return session;
}

/**
 * 检测是否需要防沉迷提醒
 * 超过 50 条消息且会话超过 1 小时 → 需要提醒
 */
export function shouldRemindBreak(session: SessionState): boolean {
  const elapsed = (Date.now() - session.sessionStart) / 1000 / 60; // 分钟
  return session.messageCount > 50 && elapsed > 60;
}

/**
 * 生成防沉迷/休息提示
 */
export function buildBreakReminder(userNickname: string, timeContext: string): string {
  const hour = new Date().getHours();
  if (hour >= 23 || hour < 6) {
    return `\n\n${userNickname}已经聊了很久而且很晚了。请在回复中温柔地催促TA去睡觉——健康比聊天重要。`;
  }
  return `\n\n${userNickname}已经聊了很久了。请在回复最后自然地建议TA起来走走、喝杯水、或者去做点别的事。不用每次都这样说，但这次记得提醒一下。`;
}
