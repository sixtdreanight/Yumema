# Changelog

## v1.0.0-beta.6 (2026-04-29)

### 聊天风格重构
- 重写 AI 伴侣行为准则：去掉心理描写和动作描写，只做自然口语化交流
- 消息拆分改为每句一个气泡（≤50 字），模拟真人一句一句发消息
- 推送节奏优化：第一条立即显示，后续间隔 800-2000ms 随机延迟
- 精简时间上下文，去掉所有行为指导语句

### UI 全面升级
- 设计风格：简约大气 + 极客风 + 微二次元可爱元素 + 磨砂玻璃 + 非线性动画
- 全局扁平化：聊天气泡去尾翼，无阴影，不对称圆角
- 输入框 Telegram 风格：磨砂玻璃 `rounded-3xl`，发送按钮内置
- Header 精简为 `h-12`，ONLINE 终端风格状态指示
- 内联 SVG 全部替换为 lucide-react 图标
- 硬编码色值全部替换为 CSS 变量
- z-index 全局层级管理，避免组件互相遮挡
- 设置面板改为 Sheet 侧边抽屉（spring 动画）
- CardSelect 选用 `ring-2` 选中态
- 进度条/步骤指示器使用 spring 缓动
- 消息入场动画 `floatUp`

### 功能入口扁平化
- ChatWindow header 新增 QQ/微信快捷入口按钮
- 设置面板精简为 AI 配置 + 关于两个标签页

### 初始化向导优化
- WelcomeStep 重设计：应用说明、流程概览、重要提醒卡片前置

### 应用图标
- 纯色淡粉色 (`#f8c8d8`) + 白色双人剪影，简约风格

### 设计系统
- 字体：`Varela Round` → 系统圆体
- 新增 `bounceIn` / `floatUp` 动画 + spring easing
- 磨砂玻璃升级：`blur(20px) saturate(180%)`

---

## v1.0.0-beta.5 (2026-04-28)

### UI 重构
- 引入 shadcn/ui + Radix UI 组件库，替换全部手写 UI 原语（Button/Badge/Avatar/Input/Card/Dialog/Select/Slider/Sheet/Tabs）
- 引入 lucide-react 图标库，替换所有 emoji（Heart/Sparkles/AlertTriangle/Star/MessageCircle/MessageSquare/Cat/Smile/Users）
- 设置向导 14 步全部使用 shadcn 组件，TimezoneStep 使用 Select 替换原生 select
- 聊天界面 IM 风格更新：Avatar 使用 lucide Heart/Smile 图标代替 emoji
- ErrorBoundary/SurveyDialog/UpdateToast 使用 shadcn 设计令牌替换硬编码色值

### AI 配置全 GUI 化
- AIProviderStep 新增模型下拉选择（按 provider 动态切换 Claude/OpenAI 模型列表）
- 新增 maxTokens 滑块（256–8192）、temperature 滑块（0–2）
- `AI_MAX_TOKENS` / `AI_TEMPERATURE` 可用 .env 持久化
- SettingsDialog AI 标签页改为完整可编辑表单，支持实时保存

### 应用图标
- 全新几何图标：紫→靛蓝渐变圆角方形 + 白色心形
- 同时更新 .icns (macOS) / .ico (Windows) / .png (Linux)

### CI/CD
- 修复 `.github/workflows/release.yml` 缺少 `permissions: contents: write`，Release 可正常发布资产

### 文档
- 更新 README 版本号、技术栈、目录结构
- 更新 CHANGELOG beta.5 条目

---

## v1.0.0-beta.4 (2026-04-28)

### Bug 修复
- 修复 `electron-updater` named import 导致的运行时崩溃 — CJS 模块在 ESM 上下文加载失败
- 修复 `hardenedRuntime: true` 导致 ad-hoc 签名校验失败，arm64 启动即 SIGABRT 崩溃
- 全量 ESM/CJS 兼容性审计通过，无同类隐患

---

## v1.0.0-beta.3 (2026-04-28)

### Bug 修复
- 移除未使用的 `lchwxbot` 依赖，修复 `better-sqlite3` 原生模块与 Electron 41 V8 API 不兼容导致打包失败的问题
- 修复 `scripts/notarize.js` ESM/CJS 冲突，重命名为 `.cjs`

### 打包验证
- 本地 `package:mac` 通过，产出 x64 + arm64 双架构 `.dmg` 和 `.zip`

---

## v1.0.0-beta.2 (2026-04-28)

### Bug 修复
- **P0** 修复 preload 文件名不匹配导致 release 包 `window.api` 不可用
- **P0** 修复 `electron-builder.yml` publish 配置错误，自动更新不可用
- **P0** 修复设置向导完成后应用卡死 — defer pipeline 初始化到首次聊天，添加文件写入验证
- **P0** 添加 ErrorBoundary 捕获渲染错误，transition 超时 10s 显示重试按钮

### UI 重构
- 聊天界面 IM 风格重新设计：不对称圆角、气泡尾翼、渐变用户气泡
- 消息列表时间分组：今天/昨天/日期分割线
- 输入区域仿 Telegram 风格，添加表情/附件占位按钮
- 新增 IM 专用 CSS 设计令牌（`--vp-bubble-*`、`--vp-bg-chat`）
- 更新 UpdateToast 使用设计令牌替换硬编码色值

### CI/CD
- 新增 GitHub Actions 自动发布工作流（`.github/workflows/release.yml`）
- 推送 `v*` 标签自动构建 macOS / Windows / Linux 三平台并发布到 Releases

### 其他
- 移除 scheduler 中无操作的兴趣学习 cron 任务
- WeChat 适配器添加 `onQRCode` 回调支持
- 新增 `docs/CHANGELOG.md`，更新 README / 架构 / 开发文档

---

## v1.0.0-beta.1 (2026-04-26)

### 新功能
- 桌面应用支持 macOS / Windows / Linux 三平台
- 14 步设置向导，引导完成 AI 伴侣配置
- 应用内即时聊天
- QQ 机器人接入（NapCatQQ OneBot v11），应用内一键下载启动
- 微信机器人接入（Gewechat Docker），应用内一键启动容器
- 多 AI 后端支持（Anthropic Claude / OpenAI / OpenAI 兼容）
- AI 伴侣人格系统：年龄、职业、爱好、性格、说话风格
- 时间感知：早晚问候、周末/节日主动话题
- 记忆系统：常聊话题加强，不常提的逐渐衰减
- 关系养成：直接情侣 / 慢热培养两种模式
- 安全过滤：敏感内容过滤、隐私保护
- 自动更新：基于 GitHub Releases 的 electron-updater
- 内置测试问卷：帮助产品持续改进
- 暗色模式：跟随系统自动切换

### 已知问题
- macOS App Store QQ 阻止 LiteLoader 注入，NapCatQQ 在 macOS 上不可用，需用 Windows
- 微信适配需要预装 Docker 环境
- 头像/表情/附件功能尚未实现（UI 占位已就绪）
- 安全过滤规则较简单，需持续完善
