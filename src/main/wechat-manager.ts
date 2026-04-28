import { BrowserWindow } from "electron";
import { exec, spawn } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

// ---- 类型 ----

export type WeChatStatus =
  | "stopped"
  | "checking"
  | "pulling"
  | "starting"
  | "waiting-qr"
  | "connected"
  | "error"
  | "no-docker";

export interface WeChatState {
  status: WeChatStatus;
  message: string;
  qrData?: string;
}

// ---- 常量 ----

const CONTAINER_NAME = "gewe";
const IMAGE_NAME = "gewe";
const HOST_PORTS = "2531-2532";

// ---- 工具 ----

async function hasDocker(): Promise<boolean> {
  try {
    await execAsync("docker --version");
    return true;
  } catch {
    return false;
  }
}

async function isContainerRunning(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `docker ps --filter "name=${CONTAINER_NAME}" --format "{{.Names}}"`,
    );
    return stdout.trim() === CONTAINER_NAME;
  } catch {
    return false;
  }
}

async function containerExists(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `docker ps -a --filter "name=${CONTAINER_NAME}" --format "{{.Names}}"`,
    );
    return stdout.trim() === CONTAINER_NAME;
  } catch {
    return false;
  }
}

// ---- 管理器类 ----

export class WeChatManager {
  private state: WeChatState = { status: "stopped", message: "" };
  private listeners: Array<(state: WeChatState) => void> = [];
  private monitorTimer: ReturnType<typeof setTimeout> | null = null;

  getState(): WeChatState {
    return { ...this.state };
  }

  onStateChange(fn: (state: WeChatState) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private emit() {
    const s = this.getState();
    this.listeners.forEach((fn) => fn(s));
  }

  private setStatus(status: WeChatStatus, message: string, qrData?: string) {
    this.state.status = status;
    this.state.message = message;
    if (qrData !== undefined) this.state.qrData = qrData;
    this.emit();
  }

  /** 检查 Docker 和容器状态 */
  async checkStatus(): Promise<void> {
    this.setStatus("checking", "检查 Docker 环境...");

    if (!(await hasDocker())) {
      this.setStatus("no-docker", "未检测到 Docker，请先安装 Docker");
      return;
    }

    if (await isContainerRunning()) {
      this.setStatus("connected", "Gewechat 运行中");
      this.beginHealthMonitor();
      return;
    }

    this.setStatus("stopped", "Gewechat 未启动");
  }

  /** 启动 Gewechat 容器 */
  async start(): Promise<void> {
    if (this.state.status === "starting" || this.state.status === "pulling") return;

    if (!(await hasDocker())) {
      this.setStatus("no-docker", "未检测到 Docker，请先安装 Docker");
      return;
    }

    // 如果已经在运行，直接返回
    if (await isContainerRunning()) {
      this.setStatus("connected", "Gewechat 运行中");
      this.beginHealthMonitor();
      return;
    }

    // 如果容器存在但已停止，先移除旧容器重新创建
    if (await containerExists()) {
      try {
        await execAsync(`docker rm -f ${CONTAINER_NAME}`);
      } catch {
        // ignore
      }
    }

    this.setStatus("starting", "启动 Gewechat 容器...");

    try {
      // 尝试启动容器
      await execAsync(
        `docker run -itd -p 2531:2531 -p 2532:2532 --name=${CONTAINER_NAME} ${IMAGE_NAME}`,
      );
    } catch (err) {
      const msg = String(err);
      // 常见错误：镜像不存在
      if (msg.includes("Unable to find image") || msg.includes("pull access")) {
        this.setStatus(
          "error",
          `未找到 Docker 镜像 "${IMAGE_NAME}"。请参考文档手动部署 Gewechat 服务。`,
        );
        return;
      }
      this.setStatus("error", `启动失败: ${msg}`);
      return;
    }

    // 等待服务就绪
    this.setStatus("waiting-qr", "等待 Gewechat 服务就绪...");
    await this.waitForHealthy();
  }

  /** 停止 Gewechat 容器 */
  async stop(): Promise<void> {
    this.clearHealthMonitor();
    try {
      await execAsync(`docker stop ${CONTAINER_NAME}`);
      this.setStatus("stopped", "Gewechat 已停止");
    } catch (err) {
      this.setStatus("error", `停止失败: ${err}`);
    }
  }

  /** 等待服务健康 */
  private async waitForHealthy(): Promise<void> {
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      if (await isContainerRunning()) {
        this.setStatus("connected", "Gewechat 已就绪");
        this.beginHealthMonitor();
        return;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    this.setStatus("error", "Gewechat 启动超时，请检查 Docker 日志");
  }

  /** 后台健康检查 */
  private beginHealthMonitor() {
    this.clearHealthMonitor();
    this.monitorTimer = setInterval(async () => {
      const running = await isContainerRunning();
      if (!running && this.state.status === "connected") {
        this.setStatus("stopped", "Gewechat 已停止");
        this.clearHealthMonitor();
      }
    }, 5000);
  }

  private clearHealthMonitor() {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
  }
}

// 全局单例
export const weChatManager = new WeChatManager();
