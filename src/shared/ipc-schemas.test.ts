import { describe, it, expect } from "vitest";
import {
  aiConfigSchema,
  profileSchema,
  sendMessageSchema,
  updateConfigSchema,
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
  });

  describe("profileSchema", () => {
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
  });
});
