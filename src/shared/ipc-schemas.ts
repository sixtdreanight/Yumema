import { z } from "zod";

// ===== Shared IPC schemas — single source of truth for all IPC data validation =====

// ---- AI Config ----
const VALID_PROVIDERS = ["anthropic", "openai", "openai-compatible", "ollama"] as const;
const VALID_FILTERS = ["strict", "moderate", "off"] as const;
const VALID_GENDERS = ["male", "female", "other"] as const;
const VALID_RELATIONSHIP_TYPES = ["boyfriend", "girlfriend"] as const;
const VALID_RELATIONSHIP_MODES = ["slow_burn", "direct"] as const;

export const aiConfigSchema = z.object({
  provider: z.enum(VALID_PROVIDERS),
  model: z.string().optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  maxTokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  backupProvider: z.enum(VALID_PROVIDERS).optional(),
  backupModel: z.string().optional(),
  backupApiKey: z.string().optional(),
});

export const qqConfigSchema = z.object({
  wsUrl: z.string().optional(),
  accessToken: z.string().optional(),
});

export const wechatConfigSchema = z.object({
  baseUrl: z.string().optional(),
  fileUrl: z.string().optional(),
  token: z.string().optional(),
  appid: z.string().optional(),
});

// ---- Profile ----
export const profileSchema = z.object({
  name: z.string().min(1),
  user_gender: z.enum(VALID_GENDERS),
  partner_gender: z.enum(VALID_GENDERS),
  relationship_type: z.enum(VALID_RELATIONSHIP_TYPES),
  relationship_mode: z.enum(VALID_RELATIONSHIP_MODES),
  age: z.number().int().optional(),
  city: z.string().optional(),
  occupation: z.string().optional(),
  education: z.string().optional(),
  major: z.string().optional(),
  temperament: z.string().optional(),
  hobbies: z.array(z.string()).optional(),
  daily_life: z.string().optional(),
  quirks: z.array(z.string()).optional(),
  speaking_style: z.string().optional(),
  meme_style: z.string().optional(),
  custom_style: z.string().optional(),
  timezone: z.string().optional(),
  user_city: z.string().optional(),
  nickname: z.string().optional(),
  ai_provider: z.string().optional(),
  qq_enabled: z.boolean().optional(),
  wechat_enabled: z.boolean().optional(),
});

// ---- Message ----
export const sendMessageSchema = z.object({
  message: z.string().min(1),
});

// ---- Config Update ----
export const updateConfigSchema = z.object({
  ai: aiConfigSchema.partial().optional(),
  qq: qqConfigSchema.partial().optional(),
  wechat: wechatConfigSchema.partial().optional(),
  contentFilter: z.enum(VALID_FILTERS).optional(),
});

// ---- Profile Update ----
export const updateProfileSchema = profileSchema.partial();

// ---- Memory ----
export const memoryFactSchema = z.object({
  topic: z.string().min(1),
  content: z.string().min(1),
});

// ---- Survey ----
export const surveySchema = z.object({
  satisfaction: z.number().int().min(1).max(5),
  features: z.array(z.string()),
  problems: z.array(z.string()),
  missing: z.string(),
  notes: z.string(),
});

// ---- Feedback ----
export const feedbackSchema = z.object({
  type: z.enum(["thumbs_up", "thumbs_down", "correction"]),
  userMessage: z.string().min(1),
  aiReply: z.string().min(1),
  correctionText: z.string().optional(),
});

// ---- Search ----
export const searchSchema = z.object({
  query: z.string().min(2),
});

// ---- Wizard Setup ----
export const wizardSetupSchema = profileSchema.extend({
  qq_ws_url: z.string().optional(),
  qq_access_token: z.string().optional(),
  wechat_base_url: z.string().optional(),
  wechat_file_url: z.string().optional(),
});

export const parseDescriptionSchema = z.object({
  description: z.string().min(1),
});

// ---- Type exports for consumers ----
export type AIConfigInput = z.infer<typeof aiConfigSchema>;
export type QQConfigInput = z.infer<typeof qqConfigSchema>;
export type WeChatConfigInput = z.infer<typeof wechatConfigSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type UpdateConfigInput = z.infer<typeof updateConfigSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type MemoryFactInput = z.infer<typeof memoryFactSchema>;
export type SurveyInput = z.infer<typeof surveySchema>;
export type FeedbackInput = z.infer<typeof feedbackSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type WizardSetupInput = z.infer<typeof wizardSetupSchema>;
export type ParseDescriptionInput = z.infer<typeof parseDescriptionSchema>;

// ---- Unified IPC return type ----
export type IpcResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };
