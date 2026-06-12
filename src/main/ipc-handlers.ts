/**
 * IPC 处理器注册 — 编排各域 handler
 */
import { BrowserWindow, app, dialog } from "electron";
import { resolve } from "node:path";
import { mkdirSync, existsSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { loadProfile, loadConfig, getDataRoot, writeFileAtomic, writeEnvFile } from "@sixtdreamnight/companion-engine";
import { logger, GUI_USER_ID } from "@sixtdreamnight/companion-engine";
import { loadShortTerm } from "@sixtdreamnight/companion-engine";
import { validateProfile } from "@sixtdreamnight/companion-engine";
import { napCatManager } from "./napcat-manager.js";
import { weChatManager } from "./wechat-manager.js";
import { safeHandle } from "./handler-utils.js";
import { updateConfigSchema, profileSchema } from "../shared/ipc-schemas.js";
import { registerChatHandlers, pipelineInvalidate } from "./handlers/chat-handlers.js";
import { registerSetupHandlers } from "./handlers/setup-handlers.js";

export async function registerIpcHandlers() {
  registerChatHandlers();
  registerSetupHandlers();

  // ---- NapCatQQ ----
  napCatManager.onStateChange((state) => {
    for (const w of BrowserWindow.getAllWindows()) {
      w.webContents.send("napcat:status-changed", state);
    }
  });

  safeHandle("napcat:get-status", () => {
    return napCatManager.getState();
  });

  safeHandle("napcat:start", async () => {
    try {
      if (!napCatManager.isInstalled()) {
        await napCatManager.install();
      }
      await napCatManager.start();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  safeHandle("napcat:stop", () => {
    napCatManager.stop();
    return { success: true };
  });

  // ---- WeChat ----
  weChatManager.onStateChange((state) => {
    for (const w of BrowserWindow.getAllWindows()) {
      w.webContents.send("wechat:status-changed", state);
    }
  });

  safeHandle("wechat:get-status", () => {
    return weChatManager.getState();
  });

  safeHandle("wechat:start", async () => {
    try {
      await weChatManager.start();
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  safeHandle("wechat:stop", async () => {
    try {
      await weChatManager.stop();
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // ---- 设置 ----
  safeHandle("app:get-mbti-types", async () => {
    const { getAllMBTITypes } = await import("@sixtdreamnight/companion-engine");
    return getAllMBTITypes();
  });

  safeHandle("settings:get-config", async () => {
    const config = await loadConfig();
    const hasApiKey = !!config.ai?.apiKey;
    return {
      ...config,
      ai: config.ai ? {
        ...config.ai,
        apiKey: "",
        hasApiKey,
      } : undefined,
    };
  });

  safeHandle("settings:update-config", async (_, raw: unknown) => {
    try {
      const parsed = updateConfigSchema.safeParse(raw);
      if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0].message };
      }
      const partial = parsed.data;
      await writeEnvFile({
        ai: partial.ai ? {
          provider: partial.ai.provider,
          model: partial.ai.model,
          apiKey: partial.ai.apiKey || undefined,
          baseUrl: partial.ai.baseUrl,
        } : undefined,
        qq: partial.qq ? {
          wsUrl: partial.qq.wsUrl,
          accessToken: partial.qq.accessToken,
        } : undefined,
        wechat: partial.wechat ? {
          baseUrl: partial.wechat.baseUrl,
          fileUrl: partial.wechat.fileUrl,
          token: partial.wechat.token,
          appid: partial.wechat.appid,
        } : undefined,
        contentFilter: partial.contentFilter,
      });
      pipelineInvalidate();
      return { success: true };
    } catch (err) {
      return { success: false, error: `保存配置失败: ${err instanceof Error ? err.message : String(err)}` };
    }
  });

  safeHandle("settings:update-profile", async (_, raw: unknown) => {
    try {
      const data = raw as Record<string, unknown> | undefined;
      if (!data || typeof data !== "object") {
        return { success: false, error: "数据无效" };
      }

      const existing = await loadProfile();
      if (!existing) {
        return { success: false, error: "角色卡不存在" };
      }
      const merged = { ...existing, ...data };

      const parsed = profileSchema.safeParse(merged);
      if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0].message };
      }

      const validation = validateProfile(merged as Record<string, unknown>);
      if (!validation.ok) {
        return { success: false, error: validation.errors[0] };
      }

      const dDir = resolve(getDataRoot(), "data");
      const profilePath = resolve(dDir, "profile.json");
      await writeFileAtomic(profilePath, JSON.stringify(merged, null, 2));
      pipelineInvalidate();
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // ---- 应用工具 ----
  safeHandle("app:get-version", () => {
    return app.getVersion();
  });

  safeHandle("app:pick-avatar", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "图片", extensions: ["png", "jpg", "jpeg", "gif", "webp"] }],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    const data = readFileSync(filePath);
    const ext = filePath.split(".").pop()?.toLowerCase() || "png";
    const mime = ext === "jpg" ? "jpeg" : ext;
    const base64 = `data:image/${mime};base64,${data.toString("base64")}`;
    const dataDir = resolve(getDataRoot(), "data");
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
    writeFileSync(resolve(dataDir, "avatar"), base64, "utf-8");
    return base64;
  });

  safeHandle("app:get-avatar", () => {
    const avatarPath = resolve(getDataRoot(), "data", "avatar");
    if (existsSync(avatarPath)) {
      return readFileSync(avatarPath, "utf-8");
    }
    return null;
  });

  safeHandle("app:export-chat", async (_, format: "json" | "txt") => {
    try {
      const history = await loadShortTerm(GUI_USER_ID, 1000);
      const ext = format === "json" ? "json" : "txt";
      const result = await dialog.showSaveDialog({
        defaultPath: `chat-history.${ext}`,
        filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
      });
      if (result.canceled) return { success: false, error: "已取消" };
      if (format === "json") {
        writeFileSync(result.filePath!, JSON.stringify(history, null, 2), "utf-8");
      } else {
        const lines = history.map(
          (t) => `[${t.role === "user" ? "用户" : "伴侣"}] ${new Date(t.timestamp).toLocaleString("zh-CN")}\n${t.content}\n`
        );
        writeFileSync(result.filePath!, lines.join("\n"), "utf-8");
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  safeHandle("app:reset-data", async () => {
    try {
      const dataRoot = getDataRoot();
      const dataDir = resolve(dataRoot, "data");
      const envPath = resolve(dataRoot, ".env");
      if (existsSync(dataDir)) rmSync(dataDir, { recursive: true, force: true });
      if (existsSync(envPath)) rmSync(envPath);
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // ---- 自动启动已配置的服务 ----
  const profile = await loadProfile();
  if (profile) {
    const config = await loadConfig();
    if (config.qq.wsUrl && config.qq.accessToken) {
      try {
        napCatManager.start().catch((err) => {
          logger.error("NapCatQQ auto-start failed:", err);
        });
      } catch (err) {
        logger.error("NapCatQQ auto-start failed:", err);
      }
    }
    if (config.wechat.baseUrl) {
      weChatManager.checkStatus().then(() => {
        if (weChatManager.getState().status === "stopped") {
          weChatManager.start().catch(() => {});
        }
      });
    }
  }
}
