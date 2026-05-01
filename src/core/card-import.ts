/**
 * SillyTavern / Character.AI 角色卡导入
 * 支持 v2/v3 JSON 格式，以及嵌入 PNG 元数据的角色卡
 */

import type { Profile, CustomStyle } from "./config.js";

interface STCardData {
  name?: string;
  description?: string;
  personality?: string;
  scenario?: string;
  first_mes?: string;
  mes_example?: string;
  creator_notes?: string;
  character_version?: string;
  system_prompt?: string;
  post_history_instructions?: string;
  alternate_greetings?: string[];
  tags?: string[];
  creator?: string;
  character_visibility?: string;
}

interface STCard {
  spec?: string;
  spec_version?: string;
  data?: STCardData;
  // v1 格式：data 直接是顶层
  name?: string;
  description?: string;
  personality?: string;
  first_mes?: string;
  mes_example?: string;
}

/** 从 SillyTavern 描述中提取年龄 */
function extractAge(text: string): number {
  const patterns = [
    /(\d{1,3})\s*岁/,
    /(\d{1,3})\s*y[eo]ars?\s*old/i,
    /age[:.\s]*(\d{1,3})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const age = parseInt(m[1], 10);
      if (age >= 10 && age <= 100) return age;
    }
  }
  return 0;
}

/** 从文字描述推断性格标签 */
function guessTemperament(text: string): string {
  const map: Record<string, string[]> = {
    "温柔": ["温柔", "体贴", "善良", "暖心", "治愈"],
    "活泼": ["活泼", "开朗", "元气", "活力", "阳光"],
    "沉稳": ["沉稳", "冷静", "成熟", "理性", "稳重"],
    "傲娇": ["傲娇", "傲", "娇", "口是心非", "毒舌"],
    "内敛": ["内敛", "内向", "安静", "话少", "沉默"],
    "毒舌": ["毒舌", "嘴毒", "吐槽", "呛人", "犀利"],
    "天然呆": ["天然呆", "冒失", "迷糊", "脱线", "呆萌"],
    "阳光": ["阳光", "温暖", "开朗", "积极", "乐天"],
  };
  const tags: string[] = [];
  const lower = text.toLowerCase();
  for (const [tag, keywords] of Object.entries(map)) {
    if (keywords.some((k) => lower.includes(k))) {
      tags.push(tag);
    }
  }
  return tags.join("、");
}

/** 从描述中提取爱好 */
function guessHobbies(text: string): string[] {
  const map: Record<string, string[]> = {
    "看剧": ["看剧", "追剧", "电视剧", "电影"],
    "游戏": ["游戏", "打游戏", "电竞", "手游"],
    "运动": ["运动", "跑步", "健身", "打球"],
    "读书": ["读书", "看书", "阅读", "小说"],
    "音乐": ["音乐", "唱歌", "听歌", "弹琴"],
    "旅行": ["旅行", "旅游", "出游", "远足"],
    "美食": ["美食", "吃", "料理", "甜品", "火锅"],
    "摄影": ["摄影", "拍照", "相机", "自拍"],
    "绘画": ["绘画", "画画", "涂鸦", "素描"],
    "宅": ["宅", "家里蹲", "不出门", "窝"],
  };
  const hobbies: string[] = [];
  const lower = text.toLowerCase();
  for (const [hobby, keywords] of Object.entries(map)) {
    if (keywords.some((k) => lower.includes(k))) {
      hobbies.push(hobby);
    }
  }
  return hobbies;
}

/** SillyTavern 角色卡 → Yumema Profile */
export function parseSTCard(raw: string): Partial<Profile> | null {
  let card: STCard;
  try {
    card = JSON.parse(raw);
  } catch {
    return null;
  }

  // 兼容 v1/v2/v3：v2+ data 在 data 字段
  const data: STCardData = card.data ?? card;
  const name = data.name || card.name || "";
  if (!name) return null;

  const fullText = [
    data.description,
    data.personality,
    data.scenario,
    data.mes_example,
    data.creator_notes,
  ].filter(Boolean).join("\n");

  const temperament = guessTemperament(data.personality || data.description || "");
  const hobbies = guessHobbies(fullText);

  const customStyle: CustomStyle = {};
  if (data.mes_example) {
    customStyle.emoticons = data.mes_example.slice(0, 500);
  }

  const profile: Partial<Profile> = {
    name,
    age: extractAge(fullText),
    city: "",
    occupation: "",
    education: "",
    major: "",
    hobbies: hobbies.length > 0 ? hobbies : ["聊天"],
    temperament: temperament || "温柔",
    speaking_style: data.personality?.slice(0, 200) || data.description?.slice(0, 200) || "",
    user_nickname: "",
    user_gender: "other",
    partner_gender: "female",
    relationship_type: "girlfriend",
    relationship_mode: "slow_burn",
    user_city: "",
    user_timezone: "Asia/Shanghai",
    opinions: {},
    daily_life: "",
    quirks: [],
    meme_style: "适中使用表情包",
    custom_style: customStyle.emoticons ? customStyle : undefined,
  };

  return profile;
}

/** 从 PNG buffer 中提取嵌入的角色卡 JSON (chara tEXt chunk) */
export function extractCardFromPNG(buffer: Buffer): string | null {
  // PNG signature: 8 bytes
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!buffer.slice(0, 8).equals(PNG_SIG)) return null;

  let offset = 8;
  while (offset < buffer.length - 12) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);

    if (type === "tEXt") {
      const data = buffer.slice(offset + 8, offset + 8 + length);
      const nullIdx = data.indexOf(0);
      if (nullIdx !== -1) {
        const keyword = data.toString("ascii", 0, nullIdx);
        if (keyword === "chara") {
          return data.toString("utf-8", nullIdx + 1);
        }
      }
    }

    // IEND chunk ends the image
    if (type === "IEND") break;

    offset += 12 + length; // length(4) + type(4) + data(N) + crc(4)
  }

  return null;
}
