# 开发指南

## 环境要求

- **Node.js** 18+
- **npm** 9+
- **Git**

## 快速开始

```bash
git clone https://github.com/sixtdreanight/V-Partner.git
cd V-Partner
npm install
npm run dev
```

`npm run dev` 会同时启动：
1. electron-vite 编译主进程 (main)
2. 编译 preload 脚本
3. Vite dev server 为 renderer 提供 HMR 热更新
4. 启动 Electron 窗口

如果检测到已有 profile 文件，自动打开聊天窗口；否则打开设置向导。

## 项目结构

```
src/
├── core/           # 纯逻辑，无 I/O 依赖，CLI 和 GUI 共享
├── adapters/       # I/O 适配器（QQ WebSocket / 微信 HTTP）
│   ├── onebot.ts       # QQ OneBot v11 适配器
│   └── wechat.ts       # 微信 Gewechat API 适配器
├── cli/            # CLI 入口（终端聊天、终端设置向导）
├── main/           # Electron 主进程
│   ├── index.ts        # 窗口创建、应用生命周期、自动更新
│   ├── preload.ts      # contextBridge 暴露安全 API 给渲染进程
│   ├── ipc-handlers.ts # 所有 IPC 通道实现
│   ├── napcat-manager.ts # NapCatQQ 下载/配置/进程管理
│   └── wechat-manager.ts # Gewechat Docker 容器管理
└── renderer/       # React 渲染进程
    ├── App.tsx         # HashRouter (/setup, /chat)
    ├── pages/          # 页面级组件
    ├── components/     # 可复用组件 (wizard/, chat/, shared/)
    │   └── shared/
    │       ├── SettingsDialog.tsx
    │       ├── UpdateToast.tsx      # 自动更新提示
    │       └── SurveyDialog.tsx     # 测试版问卷
    ├── hooks/          # 自定义 hooks (useSetupWizard, useChat)
    ├── styles/         # globals.css (设计令牌 + 基础样式)
    └── types.ts        # Window.api 类型声明
```

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发模式（Vite HMR + Electron） |
| `npm run build` | 生产构建 (main + preload + renderer) |
| `npm start --terminal` | CLI 终端聊天 |
| `npm run setup` | CLI 设置向导 |
| `npm run preview` | 预览生产构建 |
| `npm run package:mac` | 打包 macOS .dmg |
| `npm run package:win` | 打包 Windows .exe |
| `npm run package:linux` | 打包 Linux .AppImage |

## 开发规范

### 命名
- **组件**: PascalCase (`MessageBubble.tsx`)
- **函数/变量**: camelCase (`handleSendMessage`)
- **文件**: 组件文件与组件同名 PascalCase，工具模块 kebab-case
- **CSS 变量**: `--vp-` 前缀 (`--vp-primary`)

### 代码风格
- TypeScript strict mode
- React 函数组件 + hooks
- 零冗余：不写注释解释代码做什么（好的命名已经解释），只写注释解释为什么
- 不超过 100 行的组件考虑保留，超过则拆分
- GUI 只负责渲染和交互，业务逻辑在 core/ 或 main/ 中

### 样式
- Tailwind CSS 4 的原子类为主
- 动态样式使用 inline style + CSS 变量（`var(--vp-*)`）
- 颜色必须使用设计令牌，不要硬编码色值
- 支持暗色模式（`prefers-color-scheme: dark`）

## 添加新的 IPC 通道

1. 在 `src/main/preload.ts` 中添加 API 方法
2. 在 `src/main/ipc-handlers.ts` 或 `src/main/index.ts` 中实现 handler
3. 在 `src/renderer/types.ts` 中更新类型声明

```typescript
// preload.ts
api.myFunction: (arg: string) => ipcRenderer.invoke("my-channel", arg),

// ipc-handlers.ts
ipcMain.handle("my-channel", async (_event, arg: string) => {
  // 实现逻辑
  return { result: "ok" };
});

// types.ts (自动从 VPapi 类型推断，无需手动更新)
```

## 微信开发配置

微信适配器基于 Gewechat HTTP API。生产环境中，应用会在向导或设置页面提供「一键启动」按钮自动管理 Docker 容器。开发测试时如需手动部署：

```bash
docker run -itd -p 2531:2531 -p 2532:2532 --name=gewe gewe
```

然后在 `.env` 中添加：
```bash
WECHAT_BASE_URL=http://127.0.0.1:2531/v2/api
WECHAT_FILE_URL=http://127.0.0.1:2532/download
```

## 自动更新开发

自动更新使用 `electron-updater` + GitHub Releases。开发模式（`ELECTRON_RENDERER_URL` 存在时）不会触发检查，避免开发干扰。

发布新版本流程：
1. 更新 `package.json` 版本号
2. 打 tag 并推送：`git tag v1.0.0-beta.2 && git push origin v1.0.0-beta.2`
3. GitHub Actions 自动构建并发布到 Releases
4. 客户端启动 30 秒后自动检查更新

## 添加新的向导步骤

1. 在 `src/renderer/components/wizard/` 创建新组件
2. 在 `src/renderer/hooks/useSetupWizard.ts` 的 `WizardData` 中添加字段
3. 在 `canNext` 中添加验证逻辑
4. 在 `src/renderer/pages/SetupWizard.tsx` 的 `STEPS` 数组中注册

## 设计令牌

所有 UI 颜色通过 CSS 自定义属性控制，支持暗色模式自动切换：

```css
/* 使用示例 */
<div style={{
  background: "var(--vp-surface)",
  border: "1px solid var(--vp-border)",
  color: "var(--vp-text)"
}} />

/* 暗色模式自动生效，无需额外代码 */
```

## 打包发布

### 本地打包

```bash
# macOS
npm run package:mac

# Windows
npm run package:win

# Linux
npm run package:linux
```

输出在 `dist/` 目录。

### CI 自动发布

GitHub Actions 配置（`.github/workflows/release.yml`）：
- 推送 tag `v*` 触发
- 自动构建 macOS / Windows / Linux 三个平台
- 上传到 GitHub Releases
- 支持 electron-updater 自动更新

## TypeScript 配置

项目使用三个 tsconfig 文件：

| 文件 | 作用 | 包含 |
|------|------|------|
| `tsconfig.json` | 主配置 (core/adapters/cli) | ESNext + bundler |
| `tsconfig.node.json` | Electron 主进程 | src/main/ |
| `tsconfig.web.json` | React 渲染进程 | src/renderer/ |

主进程和渲染进程分离编译，避免 DOM 类型污染 Node.js 上下文。
