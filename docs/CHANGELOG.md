# Changelog

本文件所有 notable changes 遵循 [Keep a Changelog](https://keepachangelog.com/) 规范。

## [0.0.2] - 2026-05-01

### Added
- Pipeline 分解：processMessage 从 278 行 god function 拆分为 5 个独立 stage（preprocess / memory / context / generation / postprocess）
- 模型差异化提示词架构：Claude（XML 叙事）/ GPT（结构化）/ DeepSeek（Jinja + think）/ Ollama（多示例），每个模型独立参数预设
- Author's Note 机制：根据会话状态动态注入最高优先级指令（防复读、引导话题、保持角色一致性）
- 5 层提示词分层组装：核心行为 → 角色定义 → 动态上下文 → 对话示例 → Author's Note
- 角色模板 chatExamples：5 种角色模板新增 2-3 轮示例对话
- 三维记忆评分检索：relevance + recency + importance，替代简单取最新 N 条
- 艾宾浩斯遗忘曲线：高重要性事实 2× 容忍期，低重要性 0.5×
- 记忆反馈闭环：点赞/踩/纠错自动调整相关事实 importance
- 动态摘要触发：基于 token 用量阈值（>60% 窗口）替代固定轮次触发
- 8px 软网格间距系统：CSS spacing token + 语义聊天 token，修复 82+ 处间距违规
- WCAG 2.1 AA 无障碍基线：role/log、aria-live、aria-hidden、键盘导航、focus-visible
- prefers-reduced-motion 补全：暂停 shine/gradientFlow/bounce/shimmer/pulse-ring 及 Radix 动画
- GlassCard Liquid Glass 升级：交互态 focus-visible ring + keyboard 支持

### Changed
- MessageList + MessageBubble 包裹 React.memo，1000+ 消息不卡顿
- ChatWindow doSearch 包裹 useCallback，异步 IPC 加 mounted guard
- SettingsDialog 异步操作加 AbortController cleanup，setTimeout 统一管理
- electron-builder 26.x 适配：depends 从 linux 移至 deb 节点

### Fixed
- 新开窗口聊天记录丢失：useChat mount 时未调用 loadHistory()
- UpdateToast JSX 结构错误：flex row div 未闭合导致打包失败

## [0.0.1] - 2026-04-30

### Added
- 上下文连贯性增强：混合历史模型（最近消息 + 对话摘要），解决话题跳跃后无法关联前文的问题
- 对话摘要自动生成：超过 12 轮对话后自动压缩历史为摘要，后续每 6 轮更新
- 上下文跳跃规则：AI 能识别"刚才说的那个""之前提到的"等指代，主动查找历史话题
- 角色卡后续编辑：设置页新增「角色卡」tab，支持随时修改伴侣性格、爱好、说话风格等
- 角色设定内容审核：保存时自动检测涉政、血腥暴力、色情内容，年龄下限 14 岁
- LLM 事实提取：每 20 轮对话自动提取用户事实到长期记忆
- LLM 兴趣分析：每 40 轮对话自动分析用户兴趣变化
- 问卷常驻入口：标题栏新增「反馈」按钮，可随时打开问卷
- 问卷 emoji 评分：5 级满意度评分（😞😕😐😊😍）
- 问卷本地存储：反馈数据写入本地 `data/feedback/`，不再依赖外部邮件客户端
- GUI 模式定时任务：早晚安问候、午后闲聊、记忆维护在桌面版正常运行
- Windows NSIS 安装程序 (x64 + arm64)，支持自定义安装路径
- macOS 打包增加 zip 格式

### Changed
- `maxHistoryTurns` 从 24 降为 8，减少"lost in the middle"效应
- 问卷触发时机：从聊天中弹出改为应用启动时检测
- 问卷 UI 重写：卡片式布局、480px 宽度、标签按钮增大、交互动效
- 置信度分级增加 `low` 级别（1-2 次提及），修复置信度计算 bug
- NapCatQQ v4.18.1 适配：入口改为 `napcat.mjs`，使用 Node.js bundled 方式启动

### Fixed
- QQ 未安装时显示友好错误提示，不再显示"异常退出"
- NapCatQQ 二进制文件递归查找，兼容 zip 解压后的子目录结构

## [1.0.0-beta.7] - 2026-04-29

### Added
- NapCatQQ v4.18.1 适配：入口改为 `napcat.mjs`，使用 Node.js bundled 方式启动
- 递归查找二进制文件，兼容 zip 解压后的子目录结构
- Windows NSIS 安装程序 (x64 + arm64)，支持自定义安装路径

### Fixed
- `napcat:start` IPC 错误传递：throw Error 后正确被 catch 并返回 `{success: false, error: msg}`
- QQ 未安装时显示友好错误提示，不再显示"异常退出"

### Changed
- macOS 打包增加 zip 格式

## [1.0.0-beta.6] - 2026-04-29

### Added
- 消息推送节奏优化：第一条立即显示，后续 800-2000ms 随机延迟
- 应用图标：纯色淡粉色 + 白色双人剪影
- 设计系统：bounceIn/floatUp 动画 + spring easing

### Changed
- 聊天风格重构：去掉心理描写和动作描写，只做自然口语化交流
- 消息拆分改为每句一个气泡，模拟真人消息节奏
- UI 全面升级：简约大气 + 微二次元可爱元素 + 磨砂玻璃
- 全局扁平化：聊天气泡去尾翼，无阴影，不对称圆角
- 输入框 Telegram 风格
- Header 精简为 h-12 + 终端风格状态指示
- 内联 SVG 全部替换为 lucide-react 图标
- 硬编码色值全部替换为 CSS 变量
- z-index 全局层级管理
- 设置面板改为 Sheet 侧边抽屉
- CardSelect 选用 ring-2 选中态
- 设置面板精简为 AI 配置 + 关于两个标签页
- 字体从 Varela Round 改为系统圆体
- 磨砂玻璃升级：blur(20px) saturate(180%)

## [1.0.0-beta.5] - 2026-04-28

### Added
- shadcn/ui + Radix UI 组件库，替换全部手写 UI 原语
- lucide-react 图标库，替换所有 emoji 图标
- AIProviderStep 新增模型下拉选择
- 新增 maxTokens 滑块 (256–8192) 和 temperature 滑块 (0–2)
- AI_MAX_TOKENS / AI_TEMPERATURE 支持 .env 持久化
- SettingsDialog AI 标签页改为完整可编辑表单

### Changed
- 设置向导 14 步全部使用 shadcn 组件
- 聊天界面 IM 风格更新
- ErrorBoundary/SurveyDialog/UpdateToast 使用设计令牌
- 应用图标：紫→靛蓝渐变圆角方形 + 白色心形

### Fixed
- GitHub Actions release workflow 缺少 `permissions: contents: write`

## [1.0.0-beta.4] - 2026-04-28

### Fixed
- `electron-updater` named import 导致运行时崩溃 — CJS 模块在 ESM 上下文加载失败
- `hardenedRuntime: true` 导致 ad-hoc 签名校验失败，arm64 启动即 SIGABRT 崩溃

## [1.0.0-beta.3] - 2026-04-28

### Fixed
- 移除未使用的 `lchwxbot` 依赖，修复 `better-sqlite3` 原生模块与 Electron 41 V8 API 不兼容
- 修复 `scripts/notarize.js` ESM/CJS 冲突，重命名为 `.cjs`

## [1.0.0-beta.2] - 2026-04-28

### Added
- GitHub Actions 自动发布工作流
- chat 界面 IM 风格重设计：不对称圆角、气泡尾翼、渐变用户气泡
- 消息列表时间分组：今天/昨天/日期分割线
- 输入区域仿 Telegram 风格
- 新增 IM 专用 CSS 设计令牌
- WeChat 适配器新增 `onQRCode` 回调支持
- ErrorBoundary 捕获渲染错误

### Fixed
- **P0** preload 文件名不匹配导致 release 包 `window.api` 不可用
- **P0** `electron-builder.yml` publish 配置错误
- **P0** 设置向导完成后应用卡死

### Changed
- 移除 scheduler 中无操作的兴趣学习 cron 任务

## [1.0.0-beta.1] - 2026-04-26

### Added
- 桌面应用支持 macOS / Windows / Linux 三平台
- 14 步设置向导
- 应用内即时聊天（IM 风格）
- QQ 机器人接入（NapCatQQ OneBot v11）
- 微信机器人接入（Gewechat Docker）
- 多 AI 后端支持（Anthropic / OpenAI / OpenAI 兼容）
- AI 伴侣人格系统：年龄、职业、爱好、性格、说话风格
- 时间感知：早晚问候、周末/节日主动话题
- 记忆系统：常聊话题加强，不常提的逐渐衰减
- 关系养成：直接情侣 / 慢热培养两种模式
- 安全过滤：敏感内容过滤、隐私保护
- 自动更新：基于 GitHub Releases 的 electron-updater
- 内置测试问卷
- 暗色模式：跟随系统自动切换

[0.0.1]: https://github.com/sixtdreanight/Yumema/releases/tag/v0.0.1
[1.0.0-beta.7]: https://github.com/sixtdreanight/Yumema/compare/v1.0.0-beta.6...v1.0.0-beta.7
[1.0.0-beta.6]: https://github.com/sixtdreanight/Yumema/compare/v1.0.0-beta.5...v1.0.0-beta.6
[1.0.0-beta.5]: https://github.com/sixtdreanight/Yumema/compare/v1.0.0-beta.4...v1.0.0-beta.5
[1.0.0-beta.4]: https://github.com/sixtdreanight/Yumema/compare/v1.0.0-beta.3...v1.0.0-beta.4
[1.0.0-beta.3]: https://github.com/sixtdreanight/Yumema/compare/v1.0.0-beta.2...v1.0.0-beta.3
[1.0.0-beta.2]: https://github.com/sixtdreanight/Yumema/compare/v1.0.0-beta.1...v1.0.0-beta.2
[1.0.0-beta.1]: https://github.com/sixtdreanight/Yumema/releases/tag/v1.0.0-beta.1
