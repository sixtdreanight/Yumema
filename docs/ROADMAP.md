# 梦间 (Yumema) 更新路线图

## v0.0.2 — 架构重构 + 竞品补齐 (2026-05)

### Bug 修复
- Critical: JSON.parse 崩溃保护、角色卡导入修复、类型安全强化
- High: IPC 返回格式统一、WebSocket 指数退避重连、内存泄露修复
- Medium: 中等过滤修复、Ollama 免 Key、竞态风险消除

### 竞品功能
- 角色模板库（5 个预设，2 分钟上手）
- MBTI 人格测试 → 角色卡映射
- 内容过滤三档开关
- 桌面通知（早安/晚安/午后）
- 聊天导出 TXT/Markdown
- 记忆查看/编辑 UI
- 全文搜索

### UI 统一
- 8px 软网格间距系统
- GlassCard variant 系统（glass/solid）
- 排版 16px 基线、动效规范化、prefers-reduced-motion

### 架构
- 安全基线：CSP header、API key 隔离
- 类型化 IPC 合约（zod schema 校验所有 IPC 数据）
- 管线分解（processMessage 379→277 行）
- 结构化日志（关联 ID + 文件输出 + 轮转）
- 连接鲁棒性（指数退避、心跳检测）
- 存储抽象层 + IPC 抽象层（移动端准备）
- 消息级 AI 反馈（thumbs up/down + 纠错）

---

## v0.1.0 — 公测版 (2026-06 TBD)

扩大测试范围，打磨体验细节。

- 多语言支持（英文 UI）
- 语音消息（ASR + TTS）
- 角色市场（用户分享角色卡）
- **移动端适配** — 基于 v0.0.2 存储/IPC 抽象层，目标 React Native + Capacitor
  - `StorageAdapter` 实现：AsyncStorage / FileSystem
  - `IpcBridge` 实现：React Native bridge / postMessage
  - 核心管线零改动复用
- 单元测试 + E2E 测试基础设施

---

## v0.2.0 — 正式版前置 (2026-07 TBD)

- 群聊 AI 主动参与（非被动回复）
- 深度记忆图谱（MoFox-Bot 方案参考）
- 多伴侣支持
- Live2D / 动画头像
- 自定义插件系统

---

## v1.0.0 — 正式版 (2026-Q3 TBD)

- 代码签名（macOS / Windows）
- 各平台应用商店上架
- 完整测试覆盖（单元 + E2E ≥ 80%）
- 性能优化（启动时间、内存占用）
- 无障碍访问（WCAG 2.1 AA）

---

## 排期说明

- **v0.0.2**: 当前版本。架构重构 + 竞品功能补齐 + UI 统一。
- **v0.1.0**: 收集 v0.0.2 用户反馈后迭代，聚焦多语言、语音和移动端。
- **v0.2.0**: 深入差异化功能（记忆图谱、Live2D）。
- **v1.0.0**: 正式发布，应用商店上架。

版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范。发布日期为预估，按实际进度调整。
