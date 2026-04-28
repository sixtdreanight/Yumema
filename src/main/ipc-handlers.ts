import { ipcMain, BrowserWindow, app } from "electron";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadProfile, loadConfig, initDataRoot, getDataRoot,
  writeEnvFile, writeFileAtomic,
  type AppConfig, type AIConfig, type QQConfig, type WeChatConfig,
} from "../core/config.js";
import { processMessage, createAIProvider } from "../core/pipeline.js";
import { loadShortTerm } from "../core/memory.js";
import { parseDescription } from "../cli/setup.js";
import { mkdirSync, existsSync } from "node:fs";
import { createRelationshipState } from "../core/relationship.js";
import { napCatManager } from "./napcat-manager.js";
import { weChatManager } from "./wechat-manager.js";

let pipelineCtx: ReturnType<typeof createPipelineContext> | null = null;

function createPipelineContext() {
  const config = loadConfig();
  const profile = loadProfile();
  if (!profile) throw new Error("Profile not found");
  const model = createAIProvider(config.ai);
  return { model, config, profile };
}

function pipelineInvalidate() {
  pipelineCtx = null;
}

export function registerIpcHandlers() {
  // 初始化数据根目录 — 开发模式用项目目录，生产模式用 userData
  const isDev = !!process.env.ELECTRON_RENDERER_URL;
  const __dirname = fileURLToPath(new URL(".", import.meta.url));
  const dataRoot = isDev ? resolve(__dirname, "..", "..") : app.getPath("userData");
  initDataRoot(dataRoot);

  // 确保 data 目录存在
  const dataDir = resolve(getDataRoot(), "data");
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  const win = () => BrowserWindow.getAllWindows()[0] ?? null;

  // ---- 应用状态 ----
  ipcMain.handle("app:get-state", () => {
    const profile = loadProfile();
    return {
      hasProfile: !!profile,
      profile: profile ?? null,
      config: loadConfig(),
    };
  });

  // ---- 设置向导 ----
  ipcMain.handle("setup:parse-description", (_, desc: string) => {
    return parseDescription(desc);
  });

  ipcMain.handle("setup:save-profile", (_, data: Record<string, unknown>) => {
    try {
      const root = getDataRoot();
      const dDir = resolve(root, "data");
      if (!existsSync(dDir)) mkdirSync(dDir, { recursive: true });

      const profile = data.profile;
      if (!profile || typeof profile !== "object") {
        return { success: false, error: "profile 数据无效" };
      }
      const relationshipMode = (profile as Record<string, string>).relationship_mode || "direct";

      const profilePath = resolve(dDir, "profile.json");
      writeFileAtomic(profilePath, JSON.stringify(profile, null, 2));

      // 验证写入：立即读回确认文件存在且内容非空
      if (!existsSync(profilePath)) {
        return { success: false, error: "profile.json 写入后验证失败：文件不存在" };
      }

      writeFileAtomic(
        resolve(dDir, "relationship.json"),
        JSON.stringify(createRelationshipState(relationshipMode as "direct" | "slow_burn"), null, 2),
      );

      // 持久化 AI / QQ / WeChat 配置到 .env
      const ai = data.ai as Record<string, string> | undefined;
      const qq = data.qq as Record<string, string> | undefined;
      const wechat = data.wechat as Record<string, string> | undefined;
      if (ai || qq || wechat) {
        writeEnvFile({
          ai: ai ? {
            provider: ai.provider as AIConfig["provider"],
            model: ai.model,
            apiKey: ai.apiKey,
            baseUrl: ai.baseUrl,
          } : undefined,
          qq: qq ? {
            wsUrl: qq.wsUrl,
            accessToken: qq.accessToken,
          } : undefined,
          wechat: wechat ? {
            baseUrl: wechat.baseUrl,
            fileUrl: wechat.fileUrl,
            token: wechat.token,
            appid: wechat.appid,
          } : undefined,
        });
      }

      // 延迟到首次聊天时初始化 pipeline，避免 setup 阶段因配置异常导致 IPC 卡死
      pipelineCtx = null;

      return { success: true };
    } catch (err) {
      return { success: false, error: `保存失败: ${err instanceof Error ? err.message : String(err)}` };
    }
  });

  // ---- 聊天 ----
  ipcMain.handle("chat:send", async (_, message: string) => {
    try {
      if (!pipelineCtx) pipelineCtx = createPipelineContext();
      const userId = "gui-user";
      const replies = await processMessage(userId, message, pipelineCtx);

      const w = win();
      if (w) {
        for (let i = 0; i < replies.length; i++) {
          w.webContents.send("chat:reply-chunk", {
            index: i,
            total: replies.length,
            text: replies[i],
          });
        }
      }

      return replies;
    } catch (err) {
      return [`抱歉，出了点问题: ${err instanceof Error ? err.message : "未知错误"}`];
    }
  });

  ipcMain.handle("chat:load-history", (_, limit?: number) => {
    return loadShortTerm("gui-user", limit ?? 24);
  });

  // ---- 窗口控制 ----
  ipcMain.handle("window:transition-to-chat", () => {
    const w = win();
    if (w) {
      w.setMinimumSize(700, 500);
      w.setResizable(true);
      w.setSize(900, 680, true);
    }
    return { success: true };
  });

  // ---- NapCatQQ ----
  // 将 manager 的状态变化推送到所有窗口
  napCatManager.onStateChange((state) => {
    for (const w of BrowserWindow.getAllWindows()) {
      w.webContents.send("napcat:status-changed", state);
    }
  });

  ipcMain.handle("napcat:get-status", () => {
    return napCatManager.getState();
  });

  ipcMain.handle("napcat:start", async () => {
    try {
      // 首次使用：自动下载安装
      if (!napCatManager.isInstalled()) {
        await napCatManager.install();
      }
      napCatManager.start();
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle("napcat:stop", () => {
    napCatManager.stop();
    return { success: true };
  });

  // ---- WeChat ----
  weChatManager.onStateChange((state) => {
    for (const w of BrowserWindow.getAllWindows()) {
      w.webContents.send("wechat:status-changed", state);
    }
  });

  ipcMain.handle("wechat:get-status", () => {
    return weChatManager.getState();
  });

  ipcMain.handle("wechat:start", async () => {
    try {
      await weChatManager.start();
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle("wechat:stop", async () => {
    try {
      await weChatManager.stop();
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // ---- 设置 ----
  ipcMain.handle("settings:get-config", () => {
    return loadConfig();
  });

  ipcMain.handle("settings:update-config", (_, partial: Record<string, unknown>) => {
    const ai = partial.ai as Record<string, string> | undefined;
    const qq = partial.qq as Record<string, string> | undefined;
    const wechat = partial.wechat as Record<string, string> | undefined;
    writeEnvFile({
      ai: ai ? {
        provider: ai.provider as AIConfig["provider"],
        model: ai.model,
        apiKey: ai.apiKey,
        baseUrl: ai.baseUrl,
      } : undefined,
      qq: qq ? {
        wsUrl: qq.wsUrl,
        accessToken: qq.accessToken,
      } : undefined,
      wechat: wechat ? {
        baseUrl: wechat.baseUrl,
        fileUrl: wechat.fileUrl,
        token: wechat.token,
        appid: wechat.appid,
      } : undefined,
    });
    pipelineInvalidate();
    return { success: true };
  });

  // ---- 自动启动已配置的服务 ----
  const profile = loadProfile();
  if (profile) {
    const config = loadConfig();
    if (config.qq.wsUrl && config.qq.accessToken) {
      napCatManager.start();
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
