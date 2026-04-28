# 架构说明

## 架构图

```
┌─────────────────────────────────────────────────────────┐
│                    Electron Desktop App                  │
│                                                         │
│  ┌──────────────────────┐  ┌──────────────────────────┐ │
│  │    Main Process       │  │   Renderer Process (React)│ │
│  │    (Node.js)          │  │                          │ │
│  │                      │  │  ┌─────────────────────┐ │ │
│  │  ┌────────────────┐  │  │  │  SetupWizard        │ │ │
│  │  │ Window Manager  │  │  │  │  (14 wizard steps)  │ │ │
│  │  └────────┬───────┘  │  │  └─────────────────────┘ │ │
│  │           │          │  │                          │ │
│  │  ┌────────┴───────┐  │  │  ┌─────────────────────┐ │ │
│  │  │ IPC Handlers    │◄─┼──┼──┤  ChatWindow          │ │ │
│  │  │ (10+ channels)  │  │  │  │  - MessageList       │ │ │
│  │  └────────┬───────┘  │  │  │  - MessageBubble      │ │ │
│  │           │          │  │  │  - MessageInput       │ │ │
│  │  ┌────────┴───────┐  │  │  │  - TypingIndicator   │ │ │
│  │  │ NapCat Manager  │  │  │  └─────────────────────┘ │ │
│  │  │ - download      │  │  │                          │ │
│  │  │ - configure     │  │  │  ┌─────────────────────┐ │ │
│  │  │ - spawn/monitor │  │  │  │  NapCatSetup         │ │ │
│  │  │ - QR detection  │  │  │  │  (QR code / status)  │ │ │
│  │  └────────┬───────┘  │  │  └─────────────────────┘ │ │
│  │           │          │  │                          │ │
│  │  ┌────────┴───────┐  │  │  ┌─────────────────────┐ │ │
│  │  │ Core Modules     │  │  │  │  SettingsDialog      │ │ │
│  │  │ (shared logic)  │  │  │  │  (tabs: AI/QQ/About) │ │ │
│  │  │ - pipeline      │  │  │  └─────────────────────┘ │ │
│  │  │ - girlfriend    │  │  └──────────────────────────┘ │
│  │  │ - memory        │  │                               │
│  │  │ - relationship  │  │   preload.ts (contextBridge)  │
│  │  │ - safety        │  │   ┌──────────────────────┐   │
│  │  │ - scheduler     │  │   │ window.api.*          │   │
│  │  │ - config        │  │   │ - getState()          │   │
│  │  │ - utils         │  │   │ - parseDescription()  │   │
│  │  └────────────────┘  │   │ - saveProfile()       │   │
│  └──────────────────────┘   │ - sendMessage()       │   │
│                              │ - getNapCatStatus()   │   │
│  ┌──────────────────────┐   │ - startNapCat()       │   │
│  │  External             │   │ - on(event, cb)       │   │
│  │  ┌────────────────┐  │   └──────────────────────┘   │
│  │  │ NapCatQQ (child) │  │                              │
│  │  │ OneBot WebSocket│  │                              │
│  │  └────────────────┘  │                              │
│  └──────────────────────┘                              │
└─────────────────────────────────────────────────────────┘
```

## 数据流

### 聊天消息流

```
User Input (Renderer)
  → window.api.sendMessage(text)
    → IPC: 'chat:send'
      → Main: pipeline.processMessage()
        → girlfriend.buildPrompt()  → 人格 + 上下文
        → memory.load()             → 相关记忆
        → relationship.getState()   → 关系状态
        → AI SDK generateText()     → AI 回复
        → safety.filter()           → 安全过滤
        → splitForChat()            → 分段
        → memory.save()             → 保存记忆
        → relationship.update()     → 更新关系
      ← IPC: 'chat:reply-chunk' (逐条推送)
  ← Renderer: 逐条渲染气泡

QQ 消息流 (OneBot WebSocket):
  QQ → NapCatQQ → ws://localhost:3001
    → onebot.ts (adapter)
      → pipeline.processMessage()
      → 逐条发送回 QQ (600-1200ms 间隔)

微信消息流 (Gewechat HTTP API):
  微信 → Gewechat Service → http://localhost:2531
    → wechat.ts (adapter)
      → pipeline.processMessage()
      → 逐条发送回微信 (600-1200ms 间隔)
```

### Profile 初始化流

```
App Launch
  → Main: loadProfile()
    ├─ 有 profile → 打开 ChatWindow
    └─ 无 profile → 打开 SetupWizard

SetupWizard Flow:
  Step 1-14 (14 个向导步骤)
    → Step 14: window.api.saveProfile(profile)
      → Main: 保存 profile.json + .env
      → Renderer: 跳转 #/chat
```

## IPC 通道表

| 通道 | 方向 | 用途 |
|------|------|------|
| `app:get-state` | Renderer→Main | 获取应用初始状态（profile 是否存在、QQ 连接状态） |
| `setup:parse-description` | Renderer→Main | 解析自由文本描述 → 结构化字段（年龄/城市/职业等） |
| `setup:save-profile` | Renderer→Main | 保存 profile.json + .env，完成设置 |
| `chat:send` | Renderer→Main | 发送消息 → pipeline → 返回 reply[] |
| `chat:load-history` | Renderer→Main | 加载历史聊天记录 |
| `chat:reply-chunk` | Main→Renderer | 逐条推送 AI 回复片段 |
| `napcat:get-status` | Renderer→Main | 获取 NapCatQQ 运行状态 |
| `napcat:start` | Renderer→Main | 启动 NapCatQQ (下载→配置→启动) |
| `napcat:stop` | Renderer→Main | 停止 NapCatQQ 进程 |
| `napcat:status-changed` | Main→Renderer | 推送 NapCatQQ 状态变化 |
| `napcat:qr-ready` | Main→Renderer | 推送 QQ 登录二维码数据 |
| `wechat:get-status` | Renderer→Main | 获取 Gewechat 运行状态 |
| `wechat:start` | Renderer→Main | 启动 Gewechat Docker 容器 |
| `wechat:stop` | Renderer→Main | 停止 Gewechat Docker 容器 |
| `wechat:status-changed` | Main→Renderer | 推送 Gewechat 状态变化 |
| `settings:get-config` | Renderer→Main | 获取当前 AI 配置 |
| `settings:update-config` | Renderer→Main | 更新 AI 配置 |
| `window:transition-to-chat` | Renderer→Main | 设置完成后切换窗口尺寸到聊天模式 |
| `app:check-update` | Renderer→Main | 手动检查更新 |
| `app:download-update` | Renderer→Main | 下载更新包 |
| `app:install-update` | Renderer→Main | 安装已下载的更新并重启 |
| `app:update-status` | Main→Renderer | 推送更新状态（检查中/有更新/下载进度/已下载） |

## 核心模块

### pipeline.ts
消息处理主流程：构建 prompt → AI 调用 → 安全过滤 → 分段 → 保存记忆。`splitForChat()` 将长回复按句子边界切分，每段 20-60 字。

### girlfriend.ts
人格引擎：根据 profile 构建系统 prompt，包含年龄、职业、性格、爱好、说话风格、关系状态、时间背景。

### memory.ts
记忆系统：按主题存储记忆条目，每个条目有访问计数和最后访问时间。常聊的话题被加强，不常聊的逐渐衰减。

### relationship.ts
关系管理：好感度、关系阶段（陌生人→朋友→暧昧→恋人）、亲密度成长、告白/分手处理。

### safety.ts
安全过滤：过滤政治敏感词、暴力色情内容，保护用户隐私。

### scheduler.ts
定时任务：早晚问候、节日提醒、主动发起话题。

### onebot.ts
QQ 适配器：OneBot v11 WebSocket 协议，连接 NapCatQQ/Lagrange，收发私聊和群聊消息。

### wechat.ts
微信适配器：基于 Gewechat HTTP API，轮询接收消息并回复。

### wechat-manager.ts
微信 Docker 管理器：检查 Docker 环境、启动/停止/监控 Gewechat 容器、向渲染进程推送状态变化。向导和设置中均可一键操作，无需手动运行 Docker 命令。

### config.ts
配置管理：加载 .env + profile.json，支持 `setDataRoot()` 切换数据目录（CLI→项目目录，GUI→userData）。

### utils.ts
工具函数：时间格式化、季节/节日检测、随机延迟、日志输出。

## 设计令牌系统

所有 UI 组件使用 CSS 自定义属性（`--vp-*` 前缀），定义在 `src/renderer/styles/globals.css`：

| 类别 | 令牌 |
|------|------|
| 主色 | `--vp-primary` `--vp-primary-light` `--vp-primary-dim` `--vp-primary-soft` |
| 辅色 | `--vp-accent` `--vp-accent-light` |
| 背景 | `--vp-bg` `--vp-surface` `--vp-surface-hover` |
| 边框 | `--vp-border` `--vp-border-light` |
| 文字 | `--vp-text` `--vp-text-secondary` `--vp-text-muted` |
| 状态 | `--vp-success` `--vp-warning` `--vp-error` |
| 圆角 | `--vp-radius-sm: 8px` `--vp-radius-md: 12px` `--vp-radius-lg: 16px` `--vp-radius-xl: 20px` `--vp-radius-2xl: 24px` |
| 阴影 | `--vp-shadow-sm` `--vp-shadow-md` `--vp-shadow-lg` |
| 字体 | `--vp-font` (系统) `--vp-font-mono` (等宽) |

支持 `prefers-color-scheme: dark` 自动切换暗色模式。
