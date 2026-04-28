# Changelog

## v1.0.0-beta.1 (2026-04-28)

### 新功能
- 桌面应用支持 macOS / Windows / Linux 三平台
- 14 步设置向导，引导完成 AI 伴侣配置
- 应用内即时聊天，IM 风格气泡界面
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

### Bug 修复
- **P0** 修复 preload 文件名不匹配导致 release 包 `window.api` 不可用（[#B1]）
- **P0** 修复 `electron-builder.yml` publish.owner 配置错误，自动更新不可用（[#B2]）
- **P0** 修复设置向导完成后应用卡死 — defer pipeline 初始化到首次聊天（[#B4]）
- **P0** 添加 ErrorBoundary 捕获渲染错误，transition 超时 10s 显示重试按钮
- **P2** 移除 scheduler 中无操作的兴趣学习 cron 任务
- **P2** 聊天界面重构：IM 风格气泡、时间分组、日期分割线、设计令牌统一

### 已知问题
- macOS App Store QQ 阻止 LiteLoader 注入，NapCatQQ 在 macOS 上不可用，需用 Windows
- 微信适配需要预装 Docker 环境
- 头像/表情/附件功能尚未实现（UI 占位已就绪）
- 安全过滤规则较简单，需持续完善
