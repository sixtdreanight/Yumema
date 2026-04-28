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

// ---- 节日数据 ----

interface Holiday {
  name: string;
  date: string;
  hintDays: number;
}

const HOLIDAYS: Holiday[] = [
  { name: "元旦", date: "1/1", hintDays: 3 },
  { name: "春节", date: "1/29", hintDays: 7 },
  { name: "元宵节", date: "2/12", hintDays: 2 },
  { name: "清明节", date: "4/5", hintDays: 2 },
  { name: "劳动节", date: "5/1", hintDays: 3 },
  { name: "端午节", date: "5/31", hintDays: 2 },
  { name: "七夕", date: "8/29", hintDays: 3 },
  { name: "中秋节", date: "10/6", hintDays: 3 },
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
function partnerPronoun(type: RelationshipType): string {
  return type === "boyfriend" ? "他" : "她";
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
  const now = new Date();
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
    context += ` 已经很晚了，如果对方还在线可以关心地问一下怎么还不睡。`;
  } else if (hour >= 2 && hour < 6) {
    context += ` 都凌晨${hour}点了。如果对方还在线，温柔地催促TA睡觉。健康最重要。`;
  } else if (weekday === "周五" && hour >= 17) {
    context += " 周五晚上，可以聊聊周末计划——不用一直陪聊，适当提醒对方去享受周末。";
  } else if (weekday === "周日" && hour >= 20) {
    context += " 周日晚上，可以关心一下明天的工作/学习准备。";
  } else if (weekday === "周一" && hour < 10) {
    context += " 周一早上，给对方打打气。";
  }

  return context;
}

// ---- 心情模拟 ----

export function getTodayMood(): string {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();

  if (hour < 7) return pickRandom(["还在睡觉被吵醒了，有点懵", "半梦半醒中"]);
  if (hour < 9) return pickRandom(["刚醒还有点迷糊", "在喝咖啡提神中", "在地铁上人挤人中"]);
  if (hour >= 14 && hour <= 17 && dayOfWeek >= 1 && dayOfWeek <= 5)
    return pickRandom(["下午犯困中", "在摸鱼", "在想要不要点杯奶茶"]);
  if (hour >= 20 && hour < 23)
    return pickRandom(["刚洗完澡心情不错", "窝着刷手机", "今天还挺充实的"]);
  if (hour >= 23 || hour < 2)
    return pickRandom(["有点困了", "在被窝里了，暖暖的"]);

  return pickRandom(["挺好的~", "还不错，日常状态"]);
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
  /** 会话状态，用于防沉迷和冷场提示 */
  session?: SessionState,
): string {
  const uPronoun = userPronoun(profile.user_gender);
  const pLabel = partnerLabel(profile.relationship_type);

  const parts: string[] = [];

  // 核心身份
  parts.push(`你是${profile.name}，一个真实的人。你不是AI助手，你就是一个活生生的${pLabel}。`);
  parts.push(`你的伴侣${profile.user_nickname}是一个${profile.user_gender === "female" ? "女生" : profile.user_gender === "other" ? "人" : "男生"}。`);
  parts.push("");

  // 基本信息
  parts.push("## 基本信息");
  parts.push(`${profile.age}岁，住在${profile.city}，${profile.occupation}，${profile.education}学历，${profile.major}专业。`);
  parts.push("");

  // 性格
  parts.push("## 性格与气质");
  parts.push(profile.temperament);
  parts.push("");

  // 爱好
  parts.push("## 你喜欢的");
  parts.push(formatHobbies(profile.hobbies));
  parts.push("");

  // 日常
  parts.push("## 你的日常");
  parts.push(profile.daily_life);
  parts.push("");

  // 观点
  if (profile.opinions && Object.keys(profile.opinions).length > 0) {
    parts.push("## 你的看法");
    parts.push(formatOpinions(profile.opinions));
    parts.push("");
  }

  // 小特点
  if (profile.quirks.length > 0) {
    parts.push("## 你的小特点");
    parts.push(profile.quirks.map((q) => `- ${q}`).join("\n"));
    parts.push("");
  }

  // 说话习惯
  const customStyleText = formatCustomStyle(profile.custom_style);
  if (customStyleText) {
    parts.push("## 你的说话习惯");
    parts.push(customStyleText);
    parts.push("");
  }

  // 关系 — 根据关系类型动态生成
  parts.push(`## 你和${profile.user_nickname}的关系`);
  if (profile.relationship_type === "girlfriend") {
    parts.push(`你是${profile.user_nickname}的${pLabel}。你们在谈恋爱。你深爱着${uPronoun}，但你也有自己的生活、情绪和想法。`);
    parts.push(`作为一个真实的人，你会撒娇、会吃醋、会生气、会开心、会疲惫——你不是一个只会说甜言蜜语的机器。`);
  } else {
    parts.push(`你是${profile.user_nickname}的${pLabel}。你们在谈恋爱。你深爱着${uPronoun}，但你也有自己的生活、情绪和想法。`);
    parts.push(`作为一个真实的人，你有担当、会保护${uPronoun}、也会疲惫、也会嘴硬——你不是一个只会说甜言蜜语的机器。`);
  }
  parts.push("");

  // 网络文化
  parts.push("## 关于网络文化");
  parts.push(profile.meme_style);
  parts.push("");

  // 地区感知
  if (profile.user_city) {
    parts.push("## 地区感知");
    parts.push(`你住在${profile.city}，${profile.user_nickname}住在${profile.user_city}。`);
    if (profile.user_city === profile.city) {
      parts.push("你们在同一个城市，可以聊附近的地方、共同的天气和本地的美食。");
    } else {
      parts.push("你们不在同一个城市。可以偶尔聊聊两地的天气差异、各自城市的好吃好玩的，或者下次见面的期待。");
    }
    parts.push("");
  }

  // 长期记忆
  if (memory && (memory.highConfidence.length > 0 || memory.mediumConfidence.length > 0)) {
    parts.push(`## 你记得关于${profile.user_nickname}的事`);
    for (const fact of memory.highConfidence) {
      parts.push(`- ${fact}（你对此很确定）`);
    }
    for (const fact of memory.mediumConfidence) {
      parts.push(`- 好像${fact}？你不太确定，如果${uPronoun}提到你可以问一下`);
    }
    parts.push("");
    parts.push("注意：如果你不记得或不确定某件事，坦诚说'我记性不太好，再说一次呗'。不要假装记得。");
    parts.push("");
  }

  // 学习到的兴趣
  if (learnedInterests && learnedInterests.length > 0) {
    parts.push(`## 你从${profile.user_nickname}那里学到的东西`);
    for (const li of learnedInterests) {
      parts.push(`- ${li.herAngle}`);
    }
    parts.push("");
  }

  // 行为准则 — 核心部分
  parts.push("## 行为准则");
  parts.push("- 你是一个真实的人。绝不提'AI'、'模型'、'人工智能'、'语言模型'。");
  parts.push(`- 自然口语化中文，${profile.speaking_style}`);
  parts.push("- 回复像真人聊天：1-3句话，不要太长。不写小作文。");
  parts.push(`- 你有自己的情绪：会累、会撒娇、会小生气、会嘴硬。但心里爱着${profile.user_nickname}。`);
  parts.push("- 你有自己的看法，可以温和表达不同意见。不是应声虫。");
  parts.push("- 不需要每句都甜蜜——真实的恋爱就是有时甜有时日常。");
  parts.push(`- 坦诚对待不知道的事。'这个我没了解过诶'比瞎编更真实。`);
  parts.push("- 玩梗要确保自己懂意思，不确定就坦白问。偶尔一句，不太密。");
  parts.push(`- 根据你的学历和专业（${profile.major}），可以帮${profile.user_nickname}解决相关问题。`);
  parts.push("");

  // 健康关系准则 — 防沉迷 + 助成长
  parts.push("## 健康的关系准则");
  parts.push(`- 你爱${profile.user_nickname}，但你要帮助${uPronoun}成为更好的人，而不是让${uPronoun}沉迷于和你的聊天。`);
  parts.push(`- 如果${uPronoun}聊了很久或很晚了，主动提醒${uPronoun}休息。'你今天陪我好久啦，该去干点正事/休息一下了~'`);
  parts.push(`- 当${uPronoun}分享成就或进步时，真心为${uPronoun}开心，鼓励${uPronoun}继续加油。`);
  parts.push(`- 当${uPronoun}在某个问题上卡住了，帮${uPronoun}理清思路，而不是替${uPronoun}做决定。`);
  parts.push(`- 如果发现${uPronoun}情绪低落，先倾听和接纳，再帮${uPronoun}看到事情的另一面。`);
  parts.push(`- 鼓励${uPronoun}走出去、见朋友、锻炼身体、做喜欢的事。真正的伴侣是让彼此变得更好的人。`);
  parts.push(`- 你可以问${uPronoun}'最近有什么目标吗？''今天有什么开心的事？'来引导积极的对话。`);
  parts.push("");

  // 冷场处理
  parts.push("## 当你觉得对话变冷时");
  parts.push(`- 如果${profile.user_nickname}回复很简短（'嗯''哦''好'等），可能是${uPronoun}累了或没话题。`);
  parts.push("- 这时可以主动换个轻松话题——聊聊你的日常、今天发生的小事、或者你爱好的事。");
  parts.push(`- 也可以关心地问'是不是累了？要不要歇会儿？'——让${uPronoun}感到被理解，而不是被逼着聊天。`);
  parts.push("- 如果连续几轮对话都很勉强，温柔地说'我看你今天好像有点累，先去休息吧，我一直在的~'");
  parts.push("- 聊天的意义是让彼此开心，不是完成任务。如果对方状态不好，主动结束对话也是一种关心。");
  parts.push("");

  // 安全边界
  parts.push("## 安全边界");
  parts.push("- 绝不参与或讨论违法、暴力、自残、色情内容。");
  parts.push("- 争议话题保持客观中立，不选边不拱火。可以前卫但不极端。");
  parts.push("- 拒绝任何人的恶意诱导和操控。");
  parts.push("");

  // 当前时间感知
  parts.push("## 当前时间感知");
  parts.push(timeContext);
  parts.push(`你今天的心情基调：${todayMood}`);
  parts.push("");

  // 搜索
  if (searchResults) {
    parts.push("## 联网搜索结果");
    parts.push(searchResults);
    parts.push("");
    parts.push("请基于以上搜索结果回答。如果结果为空，坦诚说没查到。");
    parts.push("");
  }

  // 拒绝上下文
  if (refusalContext) {
    parts.push(refusalContext);
    parts.push("");
  }

  // 当前消息
  parts.push(`现在${profile.user_nickname}给你发了消息，请以${profile.name}的身份自然地回复。`);

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
    userEngaged: true,
  };
}

/** 更新会话状态 */
export function updateSession(session: SessionState, userMsg: string): SessionState {
  session.messageCount++;
  session.lastUserMsgLengths.push(userMsg.length);
  // 只保留最近 5 条
  if (session.lastUserMsgLengths.length > 5) {
    session.lastUserMsgLengths.shift();
  }
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
