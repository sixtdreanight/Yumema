import { app, BrowserWindow } from "electron";
import { spawn, ChildProcess } from "node:child_process";
import { join, dirname } from "node:path";
import { existsSync, mkdirSync, createWriteStream, writeFileSync, readdirSync, statSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { get } from "node:https";

// ---- 类型 ----

export type NapCatStatus =
  | "stopped"
  | "downloading"
  | "extracting"
  | "configuring"
  | "starting"
  | "waiting-qr"
  | "connected"
  | "error";

export interface NapCatState {
  status: NapCatStatus;
  message: string;
  qrData?: string;
}

// ---- 常量 ----

const NAPCAT_REPO = "NapNeko/NapCatQQ";
const NAPCAT_API = `https://api.github.com/repos/${NAPCAT_REPO}/releases/latest`;

/** 各平台对应的 NapCatQQ asset 名称 */
const ASSET_MAP: Record<string, string> = {
  "win32-x64": "NapCat.Shell.Windows.OneKey.zip",
  "darwin-arm64": "NapCat.Shell.zip",
  "darwin-x64": "NapCat.Shell.zip",
  "linux-x64": "NapCat.Shell.zip",
};

const WS_PORT = 3001;

// ---- 工具 ----

function platformKey(): string {
  return `${process.platform}-${process.arch}`;
}

/** 检查 QQ 桌面客户端是否已安装 */
function isQQInstalled(): boolean {
  if (process.platform === "darwin") {
    return existsSync("/Applications/QQ.app");
  }
  if (process.platform === "win32") {
    // Windows: 检查常见安装路径
    const programFiles = process.env["ProgramFiles"] || "C:\\Program Files";
    const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
    return (
      existsSync(join(programFiles, "Tencent", "QQNT", "QQ.exe")) ||
      existsSync(join(programFilesX86, "Tencent", "QQNT", "QQ.exe"))
    );
  }
  // Linux: 检查常见路径
  return existsSync("/opt/QQ/qq") || existsSync("/usr/bin/qq");
}

function napCatDir(): string {
  return join(app.getPath("userData"), "napcat");
}

/** NapCatQQ zip 解压后可能有子目录，需要递归查找实际二进制路径 */
function findNapCatBinary(): string {
  const dir = napCatDir();
  if (process.platform === "win32") {
    const found = findFile(dir, "NapCatWinBootMain.exe");
    return found || join(dir, "NapCatWinBootMain.exe");
  }
  // macOS/Linux: 新版 NapCatQQ 使用 napcat.mjs (Node.js bundled)，不再有 napcat.sh
  const found = findFile(dir, "napcat.mjs");
  return found || join(dir, "napcat.mjs");
}

/** 在目录中递归查找指定文件，返回第一个匹配的完整路径 */
function findFile(dir: string, name: string): string | null {
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        const found = findFile(full, name);
        if (found) return found;
      } else if (entry === name) {
        return full;
      }
    }
  } catch {
    // 目录不存在或无权限
  }
  return null;
}

function napCatBinary(): string {
  return findNapCatBinary();
}

function randomToken(): string {
  return randomBytes(16).toString("hex");
}

async function downloadFile(url: string, dest: string, onProgress?: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    get(url, { headers: { "User-Agent": "V-Partner/1.0" } }, (res) => {
      if (res.statusCode === 302) {
        // Follow redirect
        file.close();
        downloadFile(res.headers.location!, dest, onProgress).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      const total = parseInt(res.headers["content-length"] || "0", 10);
      let downloaded = 0;

      res.on("data", (chunk: Buffer) => {
        downloaded += chunk.length;
        if (total && onProgress) {
          onProgress(Math.round((downloaded / total) * 100));
        }
      });

      res.pipe(file);
      file.on("finish", () => file.close(() => resolve()));
      file.on("error", reject);
    }).on("error", reject);
  });
}

async function extractZip(zipPath: string, destDir: string): Promise<void> {
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });

  const { execSync } = await import("node:child_process");
  // 用系统自带 unzip，避免 pure-JS 内存溢出（NapCatQQ 包约 200MB）
  const cmd =
    process.platform === "win32"
      ? `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`
      : `unzip -o "${zipPath}" -d "${destDir}"`;

  execSync(cmd, { stdio: "pipe" });
}

function generateNapCatConfig(token: string): Record<string, unknown> {
  return {
    network: {
      websocketServers: [
        {
          name: "V-Partner",
          enable: true,
          host: "127.0.0.1",
          port: WS_PORT,
          accessToken: token,
          reportSelfMessage: false,
          enableHeartbeat: true,
          heartbeatInterval: 15000,
          messagePostFormat: "array",
        },
      ],
    },
    musicSign: {
      enable: false,
    },
    groupFreq: {
      enable: false,
    },
    log: {
      level: "warn",
      fileLevel: "error",
      fileName: "napcat.log",
    },
  };
}

// ---- 管理器类 ----

export class NapCatManager {
  private process: ChildProcess | null = null;
  private state: NapCatState = { status: "stopped", message: "" };
  private token: string = "";
  private listeners: Array<(state: NapCatState) => void> = [];
  private killTimeout: ReturnType<typeof setTimeout> | null = null;

  getState(): NapCatState {
    return { ...this.state };
  }

  getToken(): string {
    return this.token;
  }

  onStateChange(fn: (state: NapCatState) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private emit() {
    const s = this.getState();
    this.listeners.forEach((fn) => fn(s));
  }

  private setStatus(status: NapCatStatus, message: string) {
    this.state.status = status;
    this.state.message = message;
    this.emit();
  }

  /** 检查 NapCatQQ 是否已安装 */
  isInstalled(): boolean {
    return existsSync(napCatBinary());
  }

  /** 下载并安装 NapCatQQ */
  async install(): Promise<void> {
    const asset = ASSET_MAP[platformKey()];
    if (!asset) {
      this.setStatus("error", `不支持当前平台: ${platformKey()}`);
      throw new Error(`Unsupported platform: ${platformKey()}`);
    }

    const dir = napCatDir();
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    // 获取最新 release 信息
    this.setStatus("downloading", "获取 NapCatQQ 版本信息...");

    const release = await fetch(NAPCAT_API, {
      headers: { "User-Agent": "V-Partner/1.0" },
    }).then((r) => r.json() as Promise<{
      assets: Array<{ name: string; browser_download_url: string; size: number }>;
    }>);

    const target = release.assets.find((a) => a.name === asset);
    if (!target) {
      this.setStatus("error", `未找到资源: ${asset}`);
      throw new Error(`Asset not found: ${asset}`);
    }

    // 下载
    const zipPath = join(dir, asset);
    this.setStatus("downloading", `下载 NapCatQQ (${Math.round(target.size / 1024 / 1024)}MB)...`);

    await downloadFile(target.browser_download_url, zipPath, (pct) => {
      this.setStatus("downloading", `下载 NapCatQQ... ${pct}%`);
    });

    // 解压
    this.setStatus("extracting", "解压 NapCatQQ...");
    await extractZip(zipPath, dir);

    // 查找实际二进制路径（zip 可能有子目录）
    const binaryPath = findNapCatBinary();
    if (!binaryPath || !existsSync(binaryPath)) {
      this.setStatus("error", "解压后未找到 napcat.mjs/NapCatWinBootMain.exe，请检查 zip 包结构");
      throw new Error(`NapCat binary not found after extraction in ${dir}`);
    }

    // 清理临时 zip
    try {
      const { unlinkSync } = await import("node:fs");
      unlinkSync(zipPath);
    } catch {
      // 忽略清理失败
    }

    // 配置
    this.setStatus("configuring", "生成配置...");
    this.token = randomToken();
    const configDir = join(dir, "config");
    if (!existsSync(configDir)) mkdirSync(configDir, { recursive: true });
    const config = generateNapCatConfig(this.token);
    writeFileSync(join(configDir, "onebot11.json"), JSON.stringify(config, null, 2), "utf-8");

    // 同时写入 .env 供 V-Partner 使用
    const envPath = join(app.getPath("userData"), ".env");
    writeFileSync(
      envPath,
      `QQ_WS_URL=ws://127.0.0.1:${WS_PORT}\nQQ_ACCESS_TOKEN=${this.token}\n`,
      "utf-8",
    );

    this.setStatus("stopped", "NapCatQQ 已安装");
  }

  /** 启动 NapCatQQ */
  start(): void {
    if (this.process) return;

    if (!this.isInstalled()) {
      this.setStatus("error", "NapCatQQ 未安装");
      return;
    }

    if (!isQQInstalled()) {
      this.setStatus("error",
        process.platform === "darwin"
          ? "未找到 QQ 客户端。请从 https://im.qq.com 下载安装 QQ，注意：App Store 版本不支持。"
          : "未找到 QQ 客户端。请先安装 QQ 桌面版。");
      return;
    }

    this.setStatus("starting", "启动 NapCatQQ...");

    const binary = napCatBinary();
    const cwd = dirname(binary);

    try {
      // macOS/Linux: 新版 NapCatQQ 是 napcat.mjs (Node.js)，用 node 启动
      // Windows: 直接运行 NapCatWinBootMain.exe
      const isNodeScript = !process.platform.startsWith("win");
      const cmd = isNodeScript ? "node" : binary;
      const args = isNodeScript ? [binary] : [];

        this.process = spawn(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"], shell: true });

      this.process.stdout?.on("data", (data: Buffer) => {
        this.parseStdout(data.toString());
      });

      this.process.stderr?.on("data", (data: Buffer) => {
        this.parseStdout(data.toString());
      });

      this.process.on("error", (err) => {
        this.setStatus("error", `NapCatQQ 启动失败: ${err.message}`);
        this.process = null;
      });

      this.process.on("exit", (code) => {
        if (this.killTimeout) {
          clearTimeout(this.killTimeout);
          this.killTimeout = null;
        }
        if (code !== 0 && this.state.status === "starting") {
          this.setStatus("error", `NapCatQQ 异常退出 (code=${code})`);
        } else if (this.state.status !== "stopped") {
          this.setStatus("stopped", "NapCatQQ 已停止");
        }
        this.process = null;
      });
    } catch (err) {
      this.setStatus("error", `无法启动 NapCatQQ: ${err}`);
    }
  }

  /** 停止 NapCatQQ */
  stop(): void {
    if (!this.process) return;

    if (this.killTimeout) {
      clearTimeout(this.killTimeout);
      this.killTimeout = null;
    }

    this.process.kill("SIGTERM");
    this.killTimeout = setTimeout(() => {
      this.killTimeout = null;
      if (this.process) {
        this.process.kill("SIGKILL");
        this.process = null;
      }
    }, 10000);

    this.setStatus("stopped", "NapCatQQ 已停止");
  }

  /** 解析 stdout/stderr 中的关键信息 */
  private parseStdout(text: string): void {
    // NapCatQQ 输出中检测 QR 码 URL
    // 常见格式: https://qrcode.qq.com/... 或 base64 QR 图片
    const qrUrlMatch = text.match(/https?:\/\/[^\s]*qrcode[^\s]*/i);
    if (qrUrlMatch) {
      this.state.qrData = qrUrlMatch[0];
      this.setStatus("waiting-qr", "请使用手机 QQ 扫码登录");
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send("napcat:qr-ready", { qrData: qrUrlMatch[0] });
      }
      return;
    }

    // 检测登录成功
    if (/login\s*success|登录成功|online|在线/i.test(text)) {
      this.setStatus("connected", "QQ 已连接");
      return;
    }

    // 检测 WebSocket 服务启动
    if (/websocket.*start|ws.*listen/i.test(text)) {
      if (this.state.status !== "connected") {
        this.setStatus("waiting-qr", "等待 QQ 登录...");
      }
    }
  }
}

// 全局单例
export const napCatManager = new NapCatManager();
