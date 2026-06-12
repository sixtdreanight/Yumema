/**
 * Setup wizard + Profile import/export + App state + Survey IPC handlers
 */
import { BrowserWindow, app, dialog } from "electron";
import { safeHandle } from "../handler-utils.js";
import { resolve } from "node:path";
import { mkdirSync, existsSync, readFileSync } from "node:fs";
import { loadProfile, loadConfig, getDataRoot, writeFileAtomic, writeEnvFile, type AIConfig } from "@sixtdreamnight/companion-engine";
import { pipelineInvalidate } from "./chat-handlers.js";
import { validateProfile } from "@sixtdreamnight/companion-engine";
import { createRelationshipState } from "@sixtdreamnight/companion-engine";
import { parseDescription } from "../../cli/setup.js";
import { profileSchema, surveySchema } from "../../shared/ipc-schemas.js";

function win() { return BrowserWindow.getAllWindows()[0] ?? null; }

export function registerSetupHandlers() {
  // ---- 应用状态 ----
  safeHandle("app:get-state", async () => {
    const profile = await loadProfile();
    return {
      hasProfile: !!profile,
      profile: profile ?? null,
      config: await loadConfig(),
    };
  });

  // ---- 设置向导 ----
  safeHandle("setup:parse-description", (_, desc: string) => {
    return parseDescription(desc);
  });

  safeHandle("setup:import-card", async () => {
    const { parseSTCard, extractCardFromPNG } = await import("@sixtdreamnight/companion-engine");
    const w = win();
    if (!w) return { success: false, error: "无窗口" };
    const result = await dialog.showOpenDialog(w, {
      title: "导入角色卡",
      filters: [
        { name: "角色卡", extensions: ["json", "png"] },
        { name: "所有文件", extensions: ["*"] },
      ],
      properties: ["openFile"],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: "已取消" };
    }
    const filePath = result.filePaths[0];
    try {
      const { readFileSync } = await import("node:fs");
      if (filePath.endsWith(".png")) {
        const buffer = readFileSync(filePath);
        const json = extractCardFromPNG(buffer);
        if (!json) return { success: false, error: "无法从 PNG 中提取角色卡数据" };
        const profile = parseSTCard(json);
        if (!profile) return { success: false, error: "角色卡格式无效" };
        return { success: true, data: profile };
      }
      const raw = readFileSync(filePath, "utf-8");
      const profile = parseSTCard(raw);
      if (!profile) return { success: false, error: "角色卡格式无效，请检查文件是否为 SillyTavern 格式" };
      return { success: true, data: profile };
    } catch (err) {
      return { success: false, error: `导入失败: ${err instanceof Error ? err.message : String(err)}` };
    }
  });

  safeHandle("setup:save-profile", async (_, raw: unknown) => {
    try {
      const data = raw as Record<string, unknown>;
      const root = getDataRoot();
      const dDir = resolve(root, "data");
      if (!existsSync(dDir)) mkdirSync(dDir, { recursive: true });

      const profile = data.profile;
      if (!profile || typeof profile !== "object") {
        return { success: false, error: "profile 数据无效" };
      }

      const parsed = profileSchema.safeParse(profile);
      if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0].message };
      }

      const validation = validateProfile(profile as Record<string, unknown>);
      if (!validation.ok) {
        return { success: false, error: validation.errors[0] };
      }

      const relationshipMode = parsed.data.relationship_mode || "direct";
      const profilePath = resolve(dDir, "profile.json");
      await writeFileAtomic(profilePath, JSON.stringify(profile, null, 2));

      if (!existsSync(profilePath)) {
        return { success: false, error: "profile.json 写入后验证失败：文件不存在" };
      }

      await writeFileAtomic(
        resolve(dDir, "relationship.json"),
        JSON.stringify(createRelationshipState(relationshipMode), null, 2),
      );

      const ai = data.ai as Record<string, unknown> | undefined;
      const qq = data.qq as Record<string, unknown> | undefined;
      const wechat = data.wechat as Record<string, unknown> | undefined;
      if (ai || qq || wechat) {
        await writeEnvFile({
          ai: ai ? {
            provider: ai.provider as AIConfig["provider"],
            model: ai.model as string | undefined,
            apiKey: ai.apiKey as string | undefined,
            baseUrl: ai.baseUrl as string | undefined,
            maxTokens: ai.maxTokens as number | undefined,
            temperature: ai.temperature as number | undefined,
          } : undefined,
          qq: qq ? {
            wsUrl: qq.wsUrl as string | undefined,
            accessToken: qq.accessToken as string | undefined,
          } : undefined,
          wechat: wechat ? {
            baseUrl: wechat.baseUrl as string | undefined,
            fileUrl: wechat.fileUrl as string | undefined,
            token: wechat.token as string | undefined,
            appid: wechat.appid as string | undefined,
          } : undefined,
        });
      }

      pipelineInvalidate();
      return { success: true };
    } catch (err) {
      return { success: false, error: `保存失败: ${err instanceof Error ? err.message : String(err)}` };
    }
  });

  // ---- 角色卡导入导出 ----
  safeHandle("app:export-profile", async () => {
    try {
      const profilePath = resolve(getDataRoot(), "data", "profile.json");
      if (!existsSync(profilePath)) {
        return { success: false, error: "角色卡不存在" };
      }
      const result = await dialog.showSaveDialog({
        defaultPath: "profile.json",
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (result.canceled) return { success: false, error: "已取消" };
      const data = readFileSync(profilePath, "utf-8");
      const { writeFileSync } = await import("node:fs");
      writeFileSync(result.filePath!, data, "utf-8");
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  safeHandle("app:import-profile", async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: "已取消" };
      }
      const raw = readFileSync(result.filePaths[0], "utf-8");
      const data = JSON.parse(raw);
      const parsed = profileSchema.safeParse(data);
      if (!parsed.success) {
        return { success: false, error: `文件格式不正确: ${parsed.error.issues[0].message}` };
      }
      const validation = validateProfile(data as Record<string, unknown>);
      if (!validation.ok) {
        return { success: false, error: validation.errors[0] };
      }
      const dDir = resolve(getDataRoot(), "data");
      if (!existsSync(dDir)) mkdirSync(dDir, { recursive: true });
      await writeFileAtomic(resolve(dDir, "profile.json"), raw);
      pipelineInvalidate();
      return { success: true };
    } catch (err) {
      return { success: false, error: `导入失败: ${String(err)}` };
    }
  });

  // ---- 问卷反馈 ----
  safeHandle("survey:submit", async (_, raw: unknown) => {
    try {
      const parsed = surveySchema.safeParse(raw);
      if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0].message };
      }
      const data = parsed.data;
      const feedbackDir = resolve(getDataRoot(), "data", "feedback");
      if (!existsSync(feedbackDir)) mkdirSync(feedbackDir, { recursive: true });

      const filename = `feedback-${Date.now()}.json`;
      const content = {
        ...data,
        platform: process.platform,
        version: app.getVersion(),
        time: new Date().toISOString(),
      };
      await writeFileAtomic(resolve(feedbackDir, filename), JSON.stringify(content, null, 2));
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });
}
