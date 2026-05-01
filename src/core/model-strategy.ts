/**
 * 模型策略 — 每个 provider 的差异化采样参数 + 提示词策略
 *
 * 参考 SillyTavern 模型预设体系：参数在提供商之间不可移植。
 */

export interface ModelStrategy {
  provider: string;
  // Sampling
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  repetitionPenalty: number;
  maxOutputTokens: number;
  // Prompt strategy
  systemPromptStyle: "narrative" | "structured" | "technical";
  chatExampleCount: number;
  authorNotePosition: "system-start" | "pre-user";
  // Capabilities
  supportsThinking: boolean;
  supportsPromptCaching: boolean;
  maxContextTokens: number;
}

// ---- Provider Presets ----

/** Claude 3.5/4 — XML narrative style, strong instruction following */
export const CLAUDE_STRATEGY: ModelStrategy = {
  provider: "anthropic",
  temperature: 0.8,
  topP: 0.95,
  frequencyPenalty: 0,
  repetitionPenalty: 1.08,
  maxOutputTokens: 1024,
  systemPromptStyle: "narrative",
  chatExampleCount: 2,
  authorNotePosition: "pre-user",
  supportsThinking: false,
  supportsPromptCaching: true,
  maxContextTokens: 200000,
};

/** GPT-4o — structured numbered instructions, role-based */
export const OPENAI_STRATEGY: ModelStrategy = {
  provider: "openai",
  temperature: 0.9,
  topP: 1.0,
  frequencyPenalty: 0,
  repetitionPenalty: 1.05,
  maxOutputTokens: 1024,
  systemPromptStyle: "structured",
  chatExampleCount: 3,
  authorNotePosition: "system-start",
  supportsThinking: false,
  supportsPromptCaching: false,
  maxContextTokens: 128000,
};

/** DeepSeek V3/R1 — Jinja templates, <think> tags, higher temperature for creativity */
export const DEEPSEEK_STRATEGY: ModelStrategy = {
  provider: "deepseek",
  temperature: 1.0,
  topP: 0.95,
  frequencyPenalty: 0,
  repetitionPenalty: 1.05,
  maxOutputTokens: 1024,
  systemPromptStyle: "technical",
  chatExampleCount: 3,
  authorNotePosition: "pre-user",
  supportsThinking: true,
  supportsPromptCaching: false,
  maxContextTokens: 128000,
};

/** Ollama / local models — conservative params, more few-shot examples */
export const OLLAMA_STRATEGY: ModelStrategy = {
  provider: "ollama",
  temperature: 0.8,
  topP: 0.9,
  frequencyPenalty: 0,
  repetitionPenalty: 1.12,
  maxOutputTokens: 512,
  systemPromptStyle: "structured",
  chatExampleCount: 4,
  authorNotePosition: "system-start",
  supportsThinking: false,
  supportsPromptCaching: false,
  maxContextTokens: 32000,
};

/** Resolve strategy by provider string */
export function getModelStrategy(provider: string): ModelStrategy {
  if (provider === "anthropic" || provider === "claude") return CLAUDE_STRATEGY;
  if (provider === "openai" || provider === "gpt") return OPENAI_STRATEGY;
  if (provider === "deepseek") return DEEPSEEK_STRATEGY;
  if (provider === "ollama") return OLLAMA_STRATEGY;
  // Default to OpenAI-compatible
  return { ...OPENAI_STRATEGY, provider };
}

/**
 * Get model-specific Author's Note placement.
 * Claude: insert before user message (pre-user) — stronger instruction weight.
 * GPT/DeepSeek: insert at system prompt end (system-start) — better context integration.
 */
export function getAuthorNotePosition(strategy: ModelStrategy): "system-start" | "pre-user" {
  return strategy.authorNotePosition;
}
