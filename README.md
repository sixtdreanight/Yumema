# V-Partner

> 创建属于你的 AI 伴侣 — 桌面应用，开箱即用

**当前版本：v1.0.0-beta.1**

V-Partner 是一个 AI 伴侣桌面应用。TA 有自己的性格、爱好、情绪和记忆，可以通过 QQ、微信或应用内直接聊天。双击安装、填写向导、即可使用。

---

## 功能

- **桌面应用** — macOS / Windows / Linux，双击安装，支持自动更新
- **引导式设置** — 14 步向导，2 分钟完成配置
- **直接聊天** — 应用内聊天，即时通讯风格气泡
- **QQ 机器人** — 接入 QQ 群聊/私聊，扫码登录
- **微信机器人** — 接入微信私聊/群聊，应用内一键启动 Docker 服务
- **性格完整** — 年龄、职业、爱好、情绪、观点，像个真人
- **时间感知** — 知道早晚、周末、节日，会主动问候
- **记忆系统** — 常聊的事会记住，不常提的慢慢忘记
- **关系养成** — 直接情侣 / 从陌生人慢慢培养
- **安全过滤** — 敏感内容过滤，保护隐私
- **测试反馈** — 内置问卷，帮助产品持续改进

---

## 版本状态

**v1.0.0-beta.1** — 当前为测试版，功能持续迭代中。使用后欢迎通过内置问卷提交反馈。

---

## 快速开始

### 下载安装

从 [Releases](https://github.com/sixtdreanight/V-Partner/releases) 下载对应平台安装包：

- **macOS**: `.dmg` (Apple Silicon / Intel)
- **Windows**: `.exe` (NSIS 安装器)
- **Linux**: `.AppImage`

### 从源码运行

```bash
# 前置要求：Node.js 18+
git clone https://github.com/sixtdreanight/V-Partner.git
cd V-Partner
npm install

# 开发模式
npm run dev

# CLI 模式（终端聊天）
npm start --terminal

# CLI 设置向导
npm run setup
```

---

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | Electron 41 |
| 构建工具 | electron-vite 5 |
| 前端 | React 19 + TypeScript + Tailwind CSS 4 |
| AI 引擎 | Vercel AI SDK (Claude / GPT / DeepSeek) |
| QQ 适配 | NapCatQQ (OneBot v11) |
| 微信适配 | Gewechat HTTP API |
| 自动更新 | electron-updater + GitHub Releases |
| 打包 | electron-builder (macOS/Windows/Linux 双架构) |

---

## 目录结构

```
v-partner/
├── src/
│   ├── core/           # 纯逻辑（CLI/GUI 共享）
│   │   ├── config.ts       # 配置管理（AI / QQ / 微信）
│   │   ├── pipeline.ts     # 消息处理管道
│   │   ├── girlfriend.ts   # 人格引擎
│   │   ├── relationship.ts # 关系管理
│   │   ├── memory.ts       # 记忆系统
│   │   ├── safety.ts       # 安全过滤
│   │   ├── search.ts       # 联网搜索
│   │   ├── scheduler.ts    # 定时任务
│   │   └── utils.ts        # 工具函数
│   ├── adapters/
│   │   ├── onebot.ts       # QQ WebSocket 适配器
│   │   └── wechat.ts       # 微信 HTTP API 适配器
│   ├── cli/             # CLI 入口
│   │   ├── index.ts        # 终端 / QQ / 微信 聊天
│   │   └── setup.ts        # CLI 设置向导
│   ├── main/            # Electron 主进程
│   │   ├── index.ts        # 窗口管理 + 自动更新
│   │   ├── preload.ts      # contextBridge API
│   │   ├── ipc-handlers.ts # IPC 通道实现
│   │   ├── napcat-manager.ts # NapCatQQ 管理
│   │   └── wechat-manager.ts # Gewechat Docker 管理
│   └── renderer/        # React 渲染进程
│       ├── App.tsx         # HashRouter 路由
│       ├── pages/          # SetupWizard / ChatWindow / NapCatSetup
│       ├── components/     # wizard/ chat/ shared/
│       │   ├── wizard/     # PlatformSetupStep / SummaryStep ...
│       │   └── shared/     # SettingsDialog / UpdateToast / SurveyDialog
│       ├── hooks/          # useSetupWizard / useChat
│       └── styles/         # globals.css (设计令牌)
├── data/                # 运行时数据（谈话记录、配置）
├── dist/                # 构建输出
├── docs/                # 项目文档
└── resources/           # 应用图标
```

---

## 微信接入（可选）

V-Partner 支持通过微信与 AI 伴侣聊天，基于 [Gewechat](https://github.com/Devo919/Gewechat) 服务：

- **应用内一键启动**：在设置向导或设置页面点击「启动 Gewechat」，应用会自动检查 Docker 环境并启动容器
- **需预先安装 [Docker](https://www.docker.com/)**

如需手动部署：

```bash
docker run -itd -p 2531:2531 -p 2532:2532 --name=gewe gewe
```

微信与 QQ 可同时配置，也可随时在设置中启用/停用。

---

## 文档索引

- [架构说明](docs/architecture.md) — 架构图、数据流、IPC 通道
- [常见问题](docs/faq.md) — QQ 扫码、API Key、NapCatQQ
- [开发指南](docs/development.md) — 本地开发、打包、贡献

---

## 重要提醒

- **AI 内容不代表作者立场**，本软件仅供学习娱乐
- **QQ 使用第三方协议**，存在封号风险，建议使用小号
- **AI API 按量计费**，频繁聊天会产生费用
- **TA 不能替代真实人际关系**，请保持现实生活中的社交
- **保护隐私**，勿透露身份证、银行卡等敏感信息

## License

MIT
