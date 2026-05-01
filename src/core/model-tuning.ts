/**
 * 模型调优 — Author's Note 机制 + 模型差异化参数 + Chat Examples 生成
 *
 * 参考 SillyTavern Author's Note：在对话历史倒数位置插入简短最高优先级指令。
 * 参考 Character.AI：系统提示 = 应用程序状态的函数。
 */

import type { ModelStrategy } from "./model-strategy.js";
import type { AIConfig, Profile } from "./config.js";
import type { SessionState } from "./girlfriend.js";
import type { LearnedInterest } from "./memory.js";
import { pickRandom } from "./utils.js";

// ---- Author's Note ----

/**
 * 根据会话状态生成 Author's Note。
 * 这是系统中优先级最高的指令——直接放在最后一条用户消息之前。
 *
 * Claude: 插入 pre-user（用户消息之前），更强指令权重。
 * GPT/DeepSeek: 插入 system-start（系统提示词末尾），更好上下文整合。
 */
export function buildAuthorsNote(
  session: SessionState,
  userMessage: string,
): string | null {
  const notes: string[] = [];

  // 长对话 → 防复读、保持一致性
  if (session.messageCount > 30) {
    notes.push("已经聊了很久了。保持角色一致性，不要重复之前说过的话，不要复读。");
  }

  // 用户简短回复 → 冷场风险
  if (session.consecutiveShortReplies >= 3) {
    notes.push("对方回复变得简短。主动引导一个轻松的话题，不要太刻意。");
  }

  // 超长对话 → 健康提醒
  const elapsed = (Date.now() - session.sessionStart) / 1000 / 60;
  if (elapsed > 90) {
    notes.push("对方已经连续聊了一个半小时以上。在回复最后温柔地建议休息。");
  }

  // 通用：每次确认回应了用户话题
  notes.push("你的第一句话必须直接回应对方说的内容。");

  if (notes.length === 0) return null;
  return `[Author's Note — 最高优先级]\n${notes.join("\n")}`;
}

// ---- Chat Examples 生成 ----

/**
 * 从角色 Profile 生成 Few-shot 示例对话。
 * 优先使用模板自带的 chatExamples；否则从 profile 字段生成基础示例。
 */
export function generateChatExamples(
  profile: Profile,
  strategy: ModelStrategy,
  templateChatExamples?: string[],
): string[] {
  // 1. 模板自带示例（优先级最高）
  if (templateChatExamples && templateChatExamples.length > 0) {
    return templateChatExamples.slice(0, strategy.chatExampleCount);
  }

  // 2. 从 profile 字段生成基础示例
  const examples: string[] = [];
  const name = profile.name;
  const nickname = profile.user_nickname;

  // 开场示例
  examples.push(
    `${nickname}: 今天好累啊\n${name}: 辛苦啦～今天都忙什么了？`,
  );

  // 基于性格风格
  if (profile.temperament?.includes("活泼") || profile.temperament?.includes("阳光")) {
    examples.push(
      `${nickname}: 周末有什么计划吗\n${name}: 想去公园走走！最近天气好好，待在家里太浪费了～你呢？`,
    );
  } else if (profile.temperament?.includes("沉稳") || profile.temperament?.includes("内敛")) {
    examples.push(
      `${nickname}: 周末有什么计划吗\n${name}: 想在家看本书，最近买的一直没翻开。你呢？`,
    );
  } else if (profile.temperament?.includes("傲娇")) {
    examples.push(
      `${nickname}: 周末想不想出去逛逛\n${name}: 你约我当然去啦...不过不是我想去，是刚好没事做而已`,
    );
  }

  // 基于爱好
  if (profile.hobbies.length > 0) {
    const hobby = profile.hobbies[0];
    examples.push(
      `${nickname}: 最近有什么好玩的推荐吗\n${name}: 我最近在${hobby}上花了不少时间，挺有意思的～你有兴趣的话可以一起`,
    );
  }

  return examples.slice(0, strategy.chatExampleCount);
}

// ---- 模型参数合并 ----

/**
 * 将用户 AI 配置与模型策略合并，产出最终采样参数。
 * 用户显式设置的参数优先，未设置时使用 ModelStrategy 预设。
 */
export function applyModelStrategy(
  aiConfig: AIConfig,
  strategy: ModelStrategy,
): {
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
} {
  return {
    temperature: aiConfig.temperature ?? strategy.temperature,
    maxTokens: aiConfig.maxTokens ?? strategy.maxOutputTokens,
    topP: strategy.topP,
    frequencyPenalty: strategy.frequencyPenalty,
  };
}

// ---- 系统提示词模型格式化 ----

/**
 * 根据模型策略格式化系统提示词。
 * Claude (narrative): XML 标签包裹，叙事风格 — 保持现有格式。
 * GPT (structured): 编号步骤，role-based — 轻微调整。
 * DeepSeek (technical): Jinja 风格块，支持 <think> 标签。
 */
export function formatSystemPromptForModel(
  content: string,
  strategy: ModelStrategy,
): string {
  switch (strategy.systemPromptStyle) {
    case "structured":
      // GPT: 在开头加 role 声明，保持结构化
      return `[Role & Instructions]\n${content}`;

    case "technical":
      // DeepSeek: 支持 <think> 推理块（如需要）
      if (strategy.supportsThinking) {
        return `${content}\n\n<output_instruction>请直接输出回复内容，不要包含思考过程。</output_instruction>`;
      }
      return content;

    case "narrative":
    default:
      // Claude: XML 叙事风格，保持现有格式
      return content;
  }
}

// ---- 示例对话格式化 ----

/**
 * 将 chat examples 格式化为系统提示词中的示例对话块。
 * 按模型策略的 systemPromptStyle 调整格式。
 */
export function formatChatExamples(
  examples: string[],
  strategy: ModelStrategy,
): string {
  if (examples.length === 0) return "";

  switch (strategy.systemPromptStyle) {
    case "narrative":
      // Claude: XML 示例块
      return `<example_dialogues>\n${examples.map((ex, i) => `<example index="${i + 1}">\n${ex}\n</example>`).join("\n")}\n</example_dialogues>`;

    case "structured":
      // GPT: 编号示例
      return `Example Conversations:\n${examples.map((ex, i) => `Example ${i + 1}:\n${ex}`).join("\n\n")}`;

    case "technical":
      // DeepSeek: Jinja 风格示例块
      return `{% for example in examples %}\n## Example\n${examples.join("\n\n")}\n{% endfor %}`;

    default:
      return examples.join("\n\n---\n\n");
  }
}
