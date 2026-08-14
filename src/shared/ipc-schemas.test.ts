import { describe, it, expect } from "vitest";
import {
  aiConfigSchema,
  qqConfigSchema,
  wechatConfigSchema,
  profileSchema,
  sendMessageSchema,
  updateConfigSchema,
  updateProfileSchema,
  memoryFactSchema,
  surveySchema,
  feedbackSchema,
  searchSchema,
  wizardSetupSchema,
  parseDescriptionSchema,
} from "./ipc-schemas";

describe("ipc-schemas", () => {
  describe("sendMessageSchema", () => {
    it("accepts a non-empty message", () => {
      const result = sendMessageSchema.safeParse({ message: "你好" });
      expect(result.success).toBe(true);
    });

    it("rejects an empty message", () => {
      const result = sendMessageSchema.safeParse({ message: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("aiConfigSchema", () => {
    it("accepts a valid provider", () => {
      const result = aiConfigSchema.safeParse({ provider: "anthropic" });
      expect(result.success).toBe(true);
    });

    it("rejects an unknown provider", () => {
      const result = aiConfigSchema.safeParse({ provider: "not-a-provider" });
      expect(result.success).toBe(false);
    });

    it("accepts temperature within bounds", () => {
      const result = aiConfigSchema.safeParse({ provider: "openai", temperature: 1.5 });
      expect(result.success).toBe(true);
    });

    it("rejects temperature above 2", () => {
      const result = aiConfigSchema.safeParse({ provider: "openai", temperature: 2.1 });
      expect(result.success).toBe(false);
    });
  });

  describe("qqConfigSchema", () => {
    it("accepts an empty config (all fields optional)", () => {
      expect(qqConfigSchema.safeParse({}).success).toBe(true);
    });

    it("accepts wsUrl and accessToken", () => {
      const result = qqConfigSchema.safeParse({
        wsUrl: "ws://localhost:3001",
        accessToken: "secret",
      });
      expect(result.success).toBe(true);
    });

    it("rejects a non-string wsUrl", () => {
      expect(qqConfigSchema.safeParse({ wsUrl: 123 }).success).toBe(false);
    });

    it("rejects a non-string accessToken", () => {
      expect(qqConfigSchema.safeParse({ accessToken: 42 }).success).toBe(false);
    });
  });

  describe("wechatConfigSchema", () => {
    it("accepts an empty config (all fields optional)", () => {
      expect(wechatConfigSchema.safeParse({}).success).toBe(true);
    });

    it("accepts all fields", () => {
      const result = wechatConfigSchema.safeParse({
        baseUrl: "http://localhost:8080",
        fileUrl: "http://localhost:8080/file",
        token: "token",
        appid: "appid",
      });
      expect(result.success).toBe(true);
    });

    it("rejects a non-string baseUrl", () => {
      expect(wechatConfigSchema.safeParse({ baseUrl: 123 }).success).toBe(false);
    });
  });

  describe("profileSchema", () => {
    it("accepts a valid full profile", () => {
      const result = profileSchema.safeParse({
        name: "梦夜",
        user_gender: "female",
        partner_gender: "male",
        relationship_type: "boyfriend",
        relationship_mode: "slow_burn",
      });
      expect(result.success).toBe(true);
    });

    it("rejects an invalid gender value", () => {
      const result = profileSchema.safeParse({
        name: "梦夜",
        user_gender: "unknown",
        partner_gender: "female",
        relationship_type: "girlfriend",
        relationship_mode: "slow_burn",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateConfigSchema", () => {
    it("rejects an empty update (nothing to update)", () => {
      const result = updateConfigSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("accepts a partial config update", () => {
      const result = updateConfigSchema.safeParse({ ai: { provider: "openai" } });
      expect(result.success).toBe(true);
    });

    it("accepts a partial qq update", () => {
      const result = updateConfigSchema.safeParse({ qq: { wsUrl: "ws://x" } });
      expect(result.success).toBe(true);
    });

    it("accepts a partial wechat update", () => {
      const result = updateConfigSchema.safeParse({ wechat: { token: "t" } });
      expect(result.success).toBe(true);
    });

    it("accepts a valid contentFilter", () => {
      const result = updateConfigSchema.safeParse({ contentFilter: "strict" });
      expect(result.success).toBe(true);
    });

    it("rejects an unknown contentFilter", () => {
      const result = updateConfigSchema.safeParse({ contentFilter: "nope" });
      expect(result.success).toBe(false);
    });
  });

  describe("updateProfileSchema", () => {
    it("accepts an empty partial (all fields optional)", () => {
      expect(updateProfileSchema.safeParse({}).success).toBe(true);
    });

    it("accepts a single field update", () => {
      expect(updateProfileSchema.safeParse({ name: "新名字" }).success).toBe(true);
    });

    it("rejects an invalid gender", () => {
      expect(updateProfileSchema.safeParse({ user_gender: "unknown" }).success).toBe(false);
    });

    it("rejects a non-numeric age", () => {
      expect(updateProfileSchema.safeParse({ age: "not-a-number" }).success).toBe(false);
    });
  });

  describe("memoryFactSchema", () => {
    it("accepts a valid fact", () => {
      const result = memoryFactSchema.safeParse({ topic: "爱好", content: "喜欢画画" });
      expect(result.success).toBe(true);
    });

    it("rejects an empty topic", () => {
      const result = memoryFactSchema.safeParse({ topic: "", content: "内容" });
      expect(result.success).toBe(false);
    });

    it("rejects an empty content", () => {
      const result = memoryFactSchema.safeParse({ topic: "主题", content: "" });
      expect(result.success).toBe(false);
    });

    it("rejects a missing content", () => {
      const result = memoryFactSchema.safeParse({ topic: "主题" });
      expect(result.success).toBe(false);
    });
  });

  describe("surveySchema", () => {
    it("accepts a valid survey", () => {
      const result = surveySchema.safeParse({
        satisfaction: 5,
        features: ["记忆"],
        problems: [],
        missing: "",
        notes: "",
      });
      expect(result.success).toBe(true);
    });

    it("rejects satisfaction below 1", () => {
      const result = surveySchema.safeParse({
        satisfaction: 0,
        features: [],
        problems: [],
        missing: "",
        notes: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects satisfaction above 5", () => {
      const result = surveySchema.safeParse({
        satisfaction: 6,
        features: [],
        problems: [],
        missing: "",
        notes: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects a non-integer satisfaction", () => {
      const result = surveySchema.safeParse({
        satisfaction: 3.5,
        features: [],
        problems: [],
        missing: "",
        notes: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects a non-array features", () => {
      const result = surveySchema.safeParse({
        satisfaction: 3,
        features: "memory",
        problems: [],
        missing: "",
        notes: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("feedbackSchema", () => {
    it("accepts a thumbs_up feedback", () => {
      const result = feedbackSchema.safeParse({
        type: "thumbs_up",
        userMessage: "你好",
        aiReply: "嗨",
      });
      expect(result.success).toBe(true);
    });

    it("accepts a correction with text", () => {
      const result = feedbackSchema.safeParse({
        type: "correction",
        userMessage: "你好",
        aiReply: "嗨",
        correctionText: "应该说您好",
      });
      expect(result.success).toBe(true);
    });

    it("rejects an unknown type", () => {
      const result = feedbackSchema.safeParse({
        type: "nope",
        userMessage: "你好",
        aiReply: "嗨",
      });
      expect(result.success).toBe(false);
    });

    it("rejects an empty userMessage", () => {
      const result = feedbackSchema.safeParse({
        type: "thumbs_down",
        userMessage: "",
        aiReply: "嗨",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("searchSchema", () => {
    it("accepts a query of length 2", () => {
      expect(searchSchema.safeParse({ query: "你好" }).success).toBe(true);
    });

    it("rejects a single-character query", () => {
      expect(searchSchema.safeParse({ query: "a" }).success).toBe(false);
    });

    it("rejects an empty query", () => {
      expect(searchSchema.safeParse({ query: "" }).success).toBe(false);
    });
  });

  describe("wizardSetupSchema", () => {
    const validProfile = {
      name: "梦夜",
      user_gender: "female",
      partner_gender: "male",
      relationship_type: "boyfriend",
      relationship_mode: "slow_burn",
    };

    it("accepts a valid profile with no extra fields", () => {
      expect(wizardSetupSchema.safeParse(validProfile).success).toBe(true);
    });

    it("accepts a valid profile with wizard fields", () => {
      const result = wizardSetupSchema.safeParse({
        ...validProfile,
        qq_ws_url: "ws://localhost:3001",
        qq_access_token: "token",
        wechat_base_url: "http://x",
        wechat_file_url: "http://y",
      });
      expect(result.success).toBe(true);
    });

    it("rejects a missing required profile field", () => {
      const result = wizardSetupSchema.safeParse({
        user_gender: "female",
        partner_gender: "male",
        relationship_type: "boyfriend",
        relationship_mode: "slow_burn",
      });
      expect(result.success).toBe(false);
    });

    it("rejects an invalid relationship_mode", () => {
      const result = wizardSetupSchema.safeParse({
        ...validProfile,
        relationship_mode: "fast",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("parseDescriptionSchema", () => {
    it("accepts a non-empty description", () => {
      expect(parseDescriptionSchema.safeParse({ description: "你好" }).success).toBe(true);
    });

    it("rejects an empty description", () => {
      expect(parseDescriptionSchema.safeParse({ description: "" }).success).toBe(false);
    });
  });
});
