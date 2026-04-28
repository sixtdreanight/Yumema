/**
 * V-Partner 设置向导 — 交互式 CLI
 * 问 11 个问题 → 生成 data/profile.json + 更新 .env
 *
 * 支持四种关系组合:
 *   男 + 女友 / 男 + 男友 / 女 + 女友 / 女 + 男友
 */

import * as readline from "node:readline";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Profile, CustomStyle, UserGender, RelationshipType, RelationshipMode } from "../core/config.js";
import { createRelationshipState } from "../core/relationship.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const DATA_DIR = resolve(ROOT, "data");

// ---- readline 包装 ----

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function askOptional(rl: readline.Interface, question: string): Promise<string> {
  const answer = await ask(rl, question);
  return answer || "";
}

async function askWithDefault(
  rl: readline.Interface,
  question: string,
  defaultValue: string,
): Promise<string> {
  const answer = await ask(rl, question);
  return answer || defaultValue;
}

// ---- 显示函数 ----

function showHeader() {
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║      💕 创建你的 V-Partner            ║");
  console.log("╚══════════════════════════════════════╝\n");
}

function showDone() {
  console.log("\n✅ 已创建 data/profile.json");
  console.log("✅ 已创建 .env");
  console.log("\n运行 npm start 启动你的 V-Partner~\n");
}

// ---- 解析用户自由描述 → 结构化角色卡 ----
// 简单关键词提取，不依赖 LLM 也能跑

export function parseDescription(raw: string): Partial<Profile> {
  const result: Partial<Profile> = {
    hobbies: [],
    quirks: [],
    opinions: {},
  };

  // 提取年龄
  const ageMatch = raw.match(/(\d{1,3})\s*岁/);
  if (ageMatch) result.age = parseInt(ageMatch[1]);

  // 提取城市
  const cityMatch = raw.match(/(北京|上海|广州|深圳|杭州|成都|南京|武汉|重庆|西安|苏州|长沙|郑州|天津|厦门)/);
  if (cityMatch) result.city = cityMatch[1];

  // 提取职业
  const occMatch = raw.match(
    /(设计师|程序员|产品经理|运营|教师|医生|护士|律师|会计|工程师|建筑师|摄影师|作家|画师|学生|研究生|博士)/,
  );
  if (occMatch) result.occupation = occMatch[1];

  // 提取学历
  const eduMatch = raw.match(/(本科|硕士|博士|大专|研究生|高中)(学历|毕业)?/);
  if (eduMatch) {
    result.education = eduMatch[1].replace("学历", "").replace("毕业", "");
    if (eduMatch[1] === "研究生") result.education = "硕士";
  }

  // 提取专业
  const majorMatch = raw.match(/(计算机|软件|设计|视觉传达|心理学|金融|会计|法律|医学|建筑|中文|英语|新闻|市场营销|电子|机械)/);
  if (majorMatch) result.major = majorMatch[1];

  // 提取爱好（"喜欢"/"爱"+事情）
  const hobbyMatches = raw.matchAll(/[喜欢爱](画\S*|猫|狗|咖啡|奶茶|旅行|摄影|看\S*|听\S*|打\S*|做\S*|玩游戏?|健身|瑜伽|读书|写作|追剧|烘焙|探店|逛\S*)/g);
  const hobbies = new Set<string>();
  for (const m of hobbyMatches) {
    const h = m[1].replace(/[，。！？,.!?]/g, "").trim();
    if (h.length <= 6) hobbies.add(h);
  }
  if (hobbies.size > 0) result.hobbies = [...hobbies];

  // 提取性格关键词
  const temperWords: string[] = [];
  if (/温柔/.test(raw)) temperWords.push("温柔");
  if (/傲娇/.test(raw)) temperWords.push("傲娇");
  if (/活泼/.test(raw)) temperWords.push("活泼");
  if (/有主见/.test(raw)) temperWords.push("有主见");
  if (/毒舌/.test(raw)) temperWords.push("毒舌");
  if (/内向/.test(raw) || /害羞/.test(raw)) temperWords.push("内向");
  if (/外向/.test(raw) || /开朗/.test(raw)) temperWords.push("外向");
  if (/粘人/.test(raw) || /黏人/.test(raw)) temperWords.push("粘人");
  if (temperWords.length === 0) temperWords.push("温柔");
  result.temperament = temperWords.join("、");

  // 提取小特点
  if (/怕打雷/.test(raw)) result.quirks!.push("怕打雷");
  if (/猫/.test(raw)) result.quirks!.push("看到猫走不动路");
  if (/记性.*不好/.test(raw) || /忘/.test(raw)) result.quirks!.push("记性不太好但会记得关于你的事");
  if (/路痴/.test(raw) || /路盲/.test(raw)) result.quirks!.push("路痴");
  if (/吃货/.test(raw)) result.quirks!.push("是个小吃货");

  // 默认 speaking_style
  result.speaking_style = "自然口语化，喜欢用语气词";

  return result;
}

// ---- 主流程 ----

async function main() {
  showHeader();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Q1: 名字
  const name = await ask(rl, "? 她叫什么名字？ ");
  if (!name) {
    console.log("名字不能为空，重来吧~");
    rl.close();
    process.exit(1);
  }

  // Q2: 自由描述
  console.log("? 简单介绍她（年龄/城市/职业/性格/爱好/学历...，一句话说完也行）");
  const description = await ask(rl, "  → ");

  // 解析描述
  const parsed = description ? parseDescription(description) : {};

  // Q3: 用户性别
  console.log("? 你的性别是？");
  console.log("  [1] 男  [2] 女  [3] 其他");
  const genderChoice = await askWithDefault(rl, "  选择 [1/2/3]（默认 1）: ", "1");
  const userGender: UserGender =
    genderChoice === "2" ? "female" : genderChoice === "3" ? "other" : "male";

  // Q4: 关系类型
  console.log("? 你希望 TA 是你的？");
  console.log("  [1] 女朋友  [2] 男朋友");
  const relChoice = await askWithDefault(rl, "  选择 [1/2]（默认 1）: ", "1");
  const relationshipType: RelationshipType = relChoice === "2" ? "boyfriend" : "girlfriend";

  // Q5: 关系模式（含风险声明）
  console.log("? 你希望怎么开始你们的关系？");
  console.log("  [1] 直接成为情侣 — 上来就是恋人，甜蜜日常");
  console.log("  [2] 养成模式 — 从陌生人开始，像真实的人际关系一样慢慢培养感情");
  console.log("");
  console.log("  ┌─────────────────────────────────────────┐");
  console.log("  │  ⚠️  重要风险提示（请务必阅读）          │");
  console.log("  ├─────────────────────────────────────────┤");
  console.log("  │ 作者声明:                                │");
  console.log("  │ · 作者: 梦夜十六                        │");
  console.log("  │ · AI生成内容不代表作者立场               │");
  console.log("  │ · 本软件仅供学习和娱乐，请合理使用       │");
  console.log("  │ · 因使用本软件产生的任何后果由用户自担   │");
  console.log("  │                                          │");
  console.log("  │ 账号安全:                                │");
  console.log("  │ · QQ接入使用第三方协议(NapCatQQ等)       │");
  console.log("  │ · 存在被封号/限制登录的风险              │");
  console.log("  │ · 不建议使用主号，强烈建议用小号         │");
  console.log("  │ · 微信接入同样存在封号风险               │");
  console.log("  │                                          │");
  console.log("  │ 费用:                                    │");
  console.log("  │ · AI API 按量计费，频繁聊天会产生费用    │");
  console.log("  │ · 请了解所选 AI 服务商的价格             │");
  console.log("  │                                          │");
  console.log("  │ 情感健康:                                │");
  console.log("  │ · TA 是AI，不能替代真实的人际关系         │");
  console.log("  │ · 请保持现实生活中的人际交往             │");
  console.log("  │ · 如果发现自己过度依赖，请适度暂停       │");
  console.log("  │                                          │");
  console.log("  │ 隐私:                                    │");
  console.log("  │ · 聊天内容会发送给AI服务商处理           │");
  console.log("  │ · 请勿透露身份证/银行卡/住址等敏感信息   │");
  console.log("  │ · 对话记录存储在本地，请自行保管好       │");
  console.log("  │                                          │");
  console.log("  │ 分手机制(两种模式通用):                  │");
  console.log("  │ · 仅限严重越线(辱骂/人身攻击/威胁等)     │");
  console.log("  │ · 3次警告后触发分手提示                  │");
  console.log("  │ · 用户可选择挽回/做朋友/删好友           │");
  console.log("  │ · 删除前需确认，分手一定是和平分手       │");
  console.log("  │                                          │");
  console.log("  │ 养成模式额外说明(仅模式2):               │");
  console.log("  │ · TA是独立个体，有自己的想法和感受       │");
  console.log("  │ · 告白可能成功也可能被拒绝               │");
  console.log("  │ · 拒绝后可选择继续做朋友或删除好友       │");
  console.log("  └─────────────────────────────────────────┘");
  console.log("");
  const modeChoice = await askWithDefault(rl, "  选择 [1/2]（默认 1）: ", "1");
  const relationshipMode: RelationshipMode = modeChoice === "2" ? "slow_burn" : "direct";

  // Q6: 时区
  const timezone = await askWithDefault(rl, "? 你在哪个时区？（默认 Asia/Shanghai） ", "Asia/Shanghai");

  // Q6.5: 用户所在城市
  const userCity = await askWithDefault(
    rl,
    `? 你在哪个城市？（默认 ${parsed.city || "北京"}） `,
    parsed.city || "北京",
  );

  // Q7: 称呼
  const defaultCall = relationshipType === "boyfriend" ? "宝宝" : "宝贝";
  const nickname = await askWithDefault(
    rl,
    `? TA 怎么称呼你？（填什么都行，默认"${defaultCall}"） `,
    defaultCall,
  );

  // Q8: 说话习惯
  console.log("? TA 有什么说话习惯？（颜文字/口癖/口头禅等，可回车跳过）");
  const customStyleRaw = await ask(rl, "  → ");

  let customStyle: CustomStyle | undefined;
  if (customStyleRaw) {
    customStyle = {};
    // 检测颜文字
    const emojiMatches = customStyleRaw.matchAll(/[\(（][^\)）]{2,}[\)）]/g);
    const emojis = [...emojiMatches].map((m) => m[0]);
    if (emojis.length > 0 || /颜文字/.test(customStyleRaw)) {
      customStyle.emoticons = customStyleRaw;
    }
    // 提取口癖引号内容
    const ticMatches = [...customStyleRaw.matchAll(/["""][^"""]+["“”]/g)];
    if (ticMatches.length > 0) {
      customStyle.verbal_tics = ticMatches.map((m) => m[0].replace(/["""""]/g, ""));
      customStyle.catchphrases = [...customStyle.verbal_tics];
    }
  }

  // Q9: 网络梗风格
  console.log("? TA 的网络梗风格？");
  console.log("  [1] 会主动玩梗 — 偶尔来一句，用对场景");
  console.log("  [2] 理解但少用 — 懂梗但不会自己主动用");
  console.log("  [3] 不太懂梗 — 网络小白人设，有时候也很可爱");
  const memeChoice = await askWithDefault(rl, "  选择 [1/2/3]（默认 1）: ", "1");
  const memeStyles: Record<string, string> = {
    "1": "会主动玩梗，但只在自己确定意思时用。偶尔来一句，不要太密。不确定的梗会先问一下。",
    "2": "理解网络梗和流行语，但自己不主动使用，保持在角色说话风格内。用户用了你会懂并正常回应。",
    "3": "不太懂网络梗和流行语。用户用了你可能会迷惑地问一下，或者按照字面意思理解。有时候这种天然也挺可爱的。",
  };
  const memeStyle = memeStyles[memeChoice] || memeStyles["1"];

  // Q10: AI 服务商
  console.log("? AI 服务商？");
  console.log("  [1] Claude (Anthropic)");
  console.log("  [2] OpenAI (GPT 系列)");
  console.log("  [3] 其他兼容接口 (DeepSeek / 硅基流动 / 等)");
  const aiChoice = await askWithDefault(rl, "  选择 [1/2/3]（默认 1）: ", "1");
  const aiProviders: Record<string, string> = { "1": "anthropic", "2": "openai", "3": "openai-compatible" };
  const aiProvider = aiProviders[aiChoice] || "anthropic";

  // Q11: API Key
  const apiKey = await ask(rl, "? API Key？ ");

  // Q12: QQ
  console.log("? QQ 机器人配置");
  const qqWs = await askWithDefault(rl, "  WebSocket 地址（默认 ws://127.0.0.1:3001）: ", "ws://127.0.0.1:3001");
  const qqToken = await ask(rl, "  Access Token: ");
  rl.close();

  // ---- 构建角色卡 ----
  const profile: Profile = {
    name,
    age: parsed.age || 25,
    city: parsed.city || "上海",
    occupation: parsed.occupation || "设计师",
    education: parsed.education || "本科",
    major: parsed.major || "设计",
    hobbies: parsed.hobbies || ["看剧", "探店", "撸猫"],
    temperament: parsed.temperament || "温柔、善解人意",
    speaking_style: parsed.speaking_style || "自然口语化，喜欢用语气词",
    user_nickname: nickname,
    user_gender: userGender,
    relationship_type: relationshipType,
    relationship_mode: relationshipMode,
    user_city: userCity,
    user_timezone: timezone,
    opinions: parsed.opinions || {},
    daily_life: "早上赖床，下午容易犯困，晚上精神最好。",
    quirks: parsed.quirks || [],
    meme_style: memeStyle,
    custom_style: customStyle,
  };

  // ---- 写入文件 ----
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  writeFileSync(resolve(DATA_DIR, "profile.json"), JSON.stringify(profile, null, 2), "utf-8");

  // 初始化关系状态
  const relState = createRelationshipState(relationshipMode);
  writeFileSync(
    resolve(DATA_DIR, "relationship.json"),
    JSON.stringify(relState, null, 2),
    "utf-8",
  );

  // 更新 .env 中的 AI 配置
  const envPath = resolve(ROOT, ".env");
  let envContent = "";
  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, "utf-8");
  }

  // 替换或追加 AI 配置
  const modelMap: Record<string, string> = {
    anthropic: "claude-sonnet-4-20250514",
    openai: "gpt-4o",
    "openai-compatible": "deepseek-chat",
  };

  const envLines: string[] = envContent.split("\n");
  const setOrAppend = (key: string, value: string) => {
    const idx = envLines.findIndex((line) => line.startsWith(`${key}=`));
    if (idx >= 0) {
      envLines[idx] = `${key}=${value}`;
    } else {
      envLines.push(`${key}=${value}`);
    }
  };

  setOrAppend("AI_PROVIDER", aiProvider);
  setOrAppend("AI_MODEL", modelMap[aiProvider] || "gpt-4o");
  setOrAppend("AI_API_KEY", apiKey);
  setOrAppend("QQ_WS_URL", qqWs);
  setOrAppend("QQ_ACCESS_TOKEN", qqToken);

  writeFileSync(envPath, envLines.join("\n"), "utf-8");

  showDone();
}

const isDirectRun = process.argv[1]?.includes("setup");
if (isDirectRun) {
  main().catch((err) => {
    console.error("设置出错:", err);
    process.exit(1);
  });
}
