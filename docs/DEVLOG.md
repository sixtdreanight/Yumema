# v0.0.2 开发日志

## 角色模板提取 + 结构化日志 + 去重 + 消息反馈

**日期**: 2026-05-01

### Q11 — 角色模板库
- 新建 `src/core/role-templates.ts`，5 个预设角色（元气女友/温柔男友/傲娇系/阳光系/沉稳系）
- QuickStartStep 从内联 TEMPLATES 改为 import，消除 `as Record<string, unknown>` 强转

### Phase 1.4 — 结构化日志
- `src/core/utils.ts` 新增 `setLogFile()`、`createCorrelationId()`、`cidLogger()`
- 日志文件写入 `{dataRoot}/logs/app.log`，5MB 自动轮转
- `main/index.ts` 启动时调用 `setLogFile()` 启用文件日志
- `ipc-handlers.ts` 2 处裸 `console.error` 替换为 `logger.error`

### Phase 1.7 — 去重
- `src/core/utils.ts` 导出 `sleep`（原为私有函数）
- `onebot.ts` / `wechat.ts` 删除本地 `sleep` 副本，改为从 utils 导入

### Phase 3 — 消息级 AI 反馈
- 新建 `src/core/feedback.ts`：thumbs_up/thumbs_down/correction 数据模型
- `ipc-schemas.ts` 新增 `feedbackSchema`
- `ipc-handlers.ts` 新增 `feedback:submit` handler
- `preload.ts` 新增 `submitFeedback` API
- `MessageBubble.tsx` 新增 hover 反馈按钮（点赞/踩 + 纠错输入）
- `pipeline.ts` 注入反馈上下文到 system prompt

### 涉及文件
- `src/core/role-templates.ts` (新建)
- `src/core/feedback.ts` (新建)
- `src/core/utils.ts` — 文件日志 + sleep 导出
- `src/main/index.ts` — setLogFile 调用
- `src/main/ipc-handlers.ts` — feedback handler + 去 console.error
- `src/main/preload.ts` — submitFeedback API
- `src/shared/ipc-schemas.ts` — feedbackSchema
- `src/core/pipeline.ts` — 反馈上下文注入
- `src/adapters/onebot.ts` — 去重 sleep
- `src/adapters/wechat.ts` — 去重 sleep
- `src/renderer/components/wizard/QuickStartStep.tsx` — 模板提取
- `src/renderer/components/chat/MessageBubble.tsx` — 反馈 UI

---

# v0.0.1 开发日志

## 0. 项目重命名为「梦间 / Yumema」

**日期**: 2026-04-29

### 解决了什么问题
原项目名 "V-Partner" 泛化、无辨识度、缺少个人特色。需要融入作者印记（梦夜十六）、二次元文化、多元文化特征、表意清晰、无歧义。

### 怎么解决的
新名称「梦间 / Yumema」：
- **中文「梦间」**：梦（作者"梦夜"印记） + 间（日语"あいだ"，间隙）。「梦与现实之间的间隙」精准表达 AI 伴侣的定位。
- **英文「Yumema」**：Yume（夢，日语"梦"）+ ma（間，日语"间隙"）。跨中日文化，二次元圈层可辨识，无歧义。
- 全局替换 28 处引用：package.json、electron-builder.yml、README、FAQ、CHANGELOG、CLI、UI 组件、IPC 通道、HTML title、User-Agent、localStorage key

### 技术栈
- Electron `app.getVersion()` 动态读取版本号
- TypeScript 类型推断：`VPapi` 类型自动从 preload 导出推导
- `replace_all` 批量替换确保一致性

### 涉及文件
- `package.json` → `name: "yumema"`, `productName: "梦间"`, license GPL-3.0
- `electron-builder.yml` → `appId: com.yumema.app`, `productName: Yumema`
- `README.md` → 标题、徽章、链接全量更新
- `docs/faq.md` → 数据路径更新
- `docs/CHANGELOG.md` → Keep a Changelog 标准化
- `src/main/ipc-handlers.ts` → 新增 `app:get-version` IPC
- `src/main/preload.ts` → 新增 `getVersion` API
- `src/renderer/components/shared/SettingsDialog.tsx` → About 页面重构
- 13 个 src/ 文件中的 V-Partner 引用

### 验证方式
- `grep -rn "V-Partner\|v-partner\|vpartner" src/` 返回空
- `window.api.getVersion()` 返回 `package.json` 中的版本号

---

## 1. Windows 跳转 Bug 修复

**日期**: 2026-04-29

### 解决了什么问题
设置向导完成后，在 Windows/Mac/Linux **生产构建**下无法跳转到聊天窗口。开发模式（`http://localhost`）正常。

### 怎么解决的
**根因**：`window.location.replace("/#/chat")` 在 `file://` 协议下解析错误。
- `/` 被解析为 `file:///` 根路径
- 实际跳转到 `file:///#/chat` 而非 `file:///path/to/index.html#/chat`

**修复**：`window.location.replace("/#/chat")` → `window.location.hash = "#/chat"`

Hash 路由不依赖 base URL 解析，在 `file://` 和 `http://` 下行为一致。项目中 `SettingsDialog.tsx` 已在使用 `location.hash`，验证该模式正确。

### 技术栈
- Electron `file://` 协议 URL 解析机制
- HashRouter 路由导航

### 涉及文件
- `src/renderer/hooks/useSetupWizard.ts` 第 177 行

### 验证方式
- 生产构建 `npm run build && npm run package:mac` 后安装，走完整 setup 流程，确认跳转到 `/chat`

---

## 2. QQ 安装检测 Bug 修复

**日期**: 2026-04-29

### 问题
`isQQInstalled()` 检测路径不完整：
- macOS: 只检查 `/Applications/QQ.app`，遗漏 `~/Applications/QQ.app`
- Windows: 只检查 `ProgramFiles/Tencent/QQNT/QQ.exe`，遗漏旧版 QQ 路径、自定义盘符、注册表
- `start()` 是同步函数，`napcat:start` IPC 调用时未 `await`，错误无法正确传递
- `PlatformSetupStep.tsx` 调用 `startNapCat()` 后未检查返回值，错误静默丢失
- 自动启动 `napCatManager.start()` 无 try-catch，启动失败会导致进程崩溃

### 修复
- **Mac**: 新增 `~/Applications/QQ.app` 检测路径
- **Windows**: 新增旧版 QQ 路径 (`QQ/Bin/QQ.exe`)、自定义 D 盘路径、注册表查询 fallback (`HKLM\SOFTWARE\...\Tencent\QQNT`)
- `isQQInstalled()` 改为 async，支持 `await import("node:child_process")` 动态导入
- `NapCatManager.start()` 改为 async，使用 `await isQQInstalled()`
- `napcat:start` IPC handler 使用 `await napCatManager.start()`
- 自动启动段增加 try-catch + `.catch()` 双重保护
- `PlatformSetupStep.tsx` 检查 `result.success`，失败时 alert + 关闭开关

### 技术栈
- `node:os` `homedir()` — 跨平台用户目录
- `node:child_process` `execSync` — Windows 注册表查询
- TypeScript async/await — 异步检测链

---

## 3. 对话连贯性修复

**日期**: 2026-04-29

### 问题
AI 回复"前言不搭后语"——逻辑断裂、话题跳跃，不是简单答错问题。

**根因**：System prompt 约 170 行规则（身份、性格、爱好、行为准则、安全边界等），指令密度过高导致模型注意力分散。大量规则（"一句话20-40字""不要说这些""健康关系准则"）与"自然回应"目标冲突，模型在规则间迷失。

附加问题：
- `splitForChat()` 正则 `/[（(][^）)]*[）)]/g` 删除所有括号内容，包括颜文字 `(〃▽〃)` `(｡•́︿•̀｡)`
- `extractFactsFromConversation()` 使用固定性别代词 `[他]/[她]`，不适配男友/女友切换

### 修复
- **Prompt 重组（首因+近因效应）**：
  1. 身份（1-2句）→ 2. 核心对话规则（精简为4条）→ 3. 详细信息（放后面降低权重）→ 4. 输出规则（放宽）→ 5. 安全规则 → 最后再次强调"直接回应用户这条消息"
- **核心规则精简**：17条分散规则 → 4条核心规则（看上下文、回应对方、做个真人、保持一致）
- **输出限制放宽**："每条20-40字只写一句" → "1-2句话为主，不超过3句，保持微信节奏"
- **移除冷场处理的独立章节**：合并到 session state 动态注入，非冷场时不占 token
- **splitForChat 正则修复**：只删除全角括号 `（...）`，保留半角 `(...)`（颜文字用）
- **记忆提取去性别化**：`[他]/[她]` → `[用户]/[伴侣]`

### 技术栈
- System prompt engineering：首因效应 + 近因效应
- Regex：Unicode 全角/半角括号区分

---

## 4. 性别适配与人格差异化

**日期**: 2026-04-29

### 问题
- System prompt 用 `${pLabel}` 动态替换"女朋友/男朋友"，但行为指导完全相同
- `getTodayMood()` 心情描述偏女性视角（"在被窝里了，暖暖的""想点杯奶茶""刚洗完澡心情不错"）
- 默认 profile 模板硬编码女性化默认值（temperament="温柔", occupation="设计师", hobbies=["看剧","探店"]）
- 记忆提取使用固定性别代词 `[他]/[她]`

### 修复
- **关系框架差异化**：男友→"主动但不强势，有担当但不爹味"；女友→"有自己的生活，温柔但有自己的主见，会撒娇但不迎合"
- **心情去性别化**：移除"在被窝里了暖暖的""想点杯奶茶""刚洗完澡""窝着刷手机"→通用描述"还没完全醒""在刷手机""刚忙完在休息"
- **说话风格差异化**：男友→"可以幽默、可靠、偶尔幼稚，但不要油腻"；女友→"可以撒娇、可爱、温柔，但要有自己的态度"
- **默认值去性别化**：occupation、major、hobbies、temperament 不再硬编码女性化默认值，改为空值让用户填写
- **记忆提取标签**：`[他]/[她]` → `[用户]/[伴侣]`

### 技术栈
- Template-based prompt branching by `profile.relationship_type`
- TypeScript conditional string composition

---

## 5. 暗色模式全面适配

**日期**: 2026-04-29

### 问题
- vp-* CSS 变量在 `:root` 中使用硬编码 hex 值（如 `#52525b`、`#f8f8fa`、`#f0f0f3`），不通过 `var(--shadcn-var)` 引用基础变量
- 暗色 media query 覆盖不完整：缺 `--vp-primary-light`、`--vp-primary-dim`、`--vp-accent`、`--vp-accent-light`、`--vp-rose`、`--vp-amber`、`--vp-text-secondary`、气泡变量等
- 综合表现：shadcn 覆盖的区域变暗色，vp 变量覆盖的区域保持亮色 → 白底白字/黑底黑字

### 修复
- **亮色变量改为引用 shadcn**：`--vp-text-secondary: var(--muted-foreground)`、`--vp-surface-hover: var(--secondary)`、`--vp-border-light: var(--border)` 等
- **使用 `color-mix`** 替代硬编码半透明色：`--vp-primary-light: color-mix(in srgb, var(--primary) 20%, transparent)`
- **暗色 media query 补全所有缺失变量**：primary-light、primary-dim、accent、accent-light、rose、amber、text-inverse、气泡 token
- **Badge.tsx dotColors 修复**：`bg-white/60` → `bg-foreground/40`，暗色下自动变浅色

### 技术栈
- CSS `color-mix()` — 基于主色动态生成半透明衍生色
- CSS custom properties cascading — 统一引用链确保暗色切换全覆盖
- Tailwind CSS v4 `@theme inline` 变量映射

---

## 6. 问卷调查重新设计

**日期**: 2026-04-29

### 问题
原问卷全部是主观题：整体满意度 1-5、推荐意愿 NPS 0-10、最满意/最不满意功能。无法有效收集用户实际遇到的问题。

### 修复
重新设计为问题导向：
1. 使用哪些功能？（多选：应用内聊天/QQ/微信）
2. 遇到哪些问题？（多选：QQ无法连接/答非所问/回复太慢/闪退/安装失败/设置复杂/界面/自定义）
3. 缺少什么功能？（选填）
4. 其他建议？（选填）

自动附加：平台 + 时间。提交方式保持 mailto。

### 技术栈
- React useState 多选 toggle 模式
- localStorage 触发计数（每 20 条消息触发一次）

---

## 7. 角色卡导入导出 + 聊天记录导出

**日期**: 2026-04-29

### 问题
Talk、Character.AI 等同类项目标配角色卡导入导出功能，Yumema 缺失。

### 修复
- **IPC**: 新增 `app:export-profile`（保存到用户选择路径）、`app:import-profile`（从文件读取+验证字段+写入 profile.json+invalidate pipeline）
- **IPC**: 新增 `app:export-chat`（支持 JSON 完整数据/TXT 纯文本两种格式）
- **Preload**: 新增 `exportProfile()`、`importProfile()`、`exportChat(format)` API
- **SettingsDialog**: About 标签页新增「导出角色卡」「导入角色卡」「导出聊天 JSON」「导出聊天 TXT」四个按钮
- **验证**: 导入时检查 `name`、`relationship_type` 必填字段

### 技术栈
- Electron `dialog.showSaveDialog` / `dialog.showOpenDialog` — 原生文件选择器
- `writeFileAtomic()` — 原子写入防崩溃
- `pipelineInvalidate()` — 导入后强制重建 AI pipeline 上下文

---

## 8. NapCatQQ 下载镜像超时回退

**日期**: 2026-04-29

### 问题
NapCatQQ 从 GitHub 下载，国内用户常超时或极慢，无回退方案。

### 修复
- 新增 `fetchWithTimeout()` — `AbortController` 10s 超时取消请求
- 超时/失败后自动切换 `ghproxy.com` 镜像，API 和下载 URL 均跟随

### 技术栈
- `AbortController` / `AbortSignal` — 请求取消
- `ghproxy.com` — GitHub 镜像代理

### 涉及文件
- `src/main/napcat-manager.ts` — `fetchWithTimeout()` + `install()` 镜像回退

---

## 9. Docker 安装引导

**日期**: 2026-04-29

### 问题
微信 Gewechat 需 Docker，未安装时仅提示"请安装 Docker"，无平台指引。

### 修复
- `dockerInstallGuide()` 按平台返回安装指引：macOS `brew`、Windows `docker.com`、Linux `get.docker.com`
- `checkStatus()` 和 `start()` 的 no-docker 消息改为调用此函数

### 技术栈
- `process.platform` — 平台检测

### 涉及文件
- `src/main/wechat-manager.ts` — `dockerInstallGuide()` + 消息更新

---

## 10. 角色描述拆分为多字段表单

**日期**: 2026-04-29

### 问题
角色创建只有一个 textarea 解析描述，不可控、无法手动修正。

### 修复
- 拆为 7 个结构化表单：年龄/城市、职业/专业、学历、性格标签(8选多选)、爱好(10选多选)、日常节奏(3选1)、小特点(7选多选)
- 顶部保留 2 行 textarea，通过 `parseDescription()` 自动填充各字段
- 新增 `updateParseField()` 逐字段更新 `parsePreview`

### 技术栈
- Tailwind `data-[on=true]:` — 选中态样式
- TypeScript Record — 作息映射

### 涉及文件
- `src/renderer/components/wizard/PartnerDescriptionStep.tsx` — 完整重写
- `src/renderer/hooks/useSetupWizard.ts` — `updateParseField()` + `dailyLife` 映射

---

## 11. 移除 Radix Themes UI 库

**日期**: 2026-04-29

### 问题
项目混用 `@radix-ui/themes`（Flex/Text/Button/Dialog/Tabs/Select 等组件）、shadcn/ui（`@radix-ui/react-*` 原语）、Tailwind 原子类三套体系。

### 修复
- 11 个文件用原生 HTML + Tailwind 替换 Radix Themes 组件（Flex→div+flex、Text→span+text-*、IconButton→button+rounded、Dialog→ui/dialog 等）
- `Button.tsx` 改为独立 Tailwind button（8 variant × 6 size）
- CSS 变量全量替换：`var(--accent-*)`→`var(--primary)`、`var(--gray-*)`→`var(--border)`/`var(--muted-foreground)`、`var(--red-*)`→`var(--destructive)`
- `App.tsx` 移除 `<Theme>` wrapper

### 技术栈
- shadcn/ui（`@radix-ui/react-dialog/tabs/select/slider` 原语）
- Tailwind CSS 原子类替代布局组件，不创建自研 wrapper

### 涉及文件
- `App.tsx`、`Button.tsx`、`SetupWizard.tsx`、`ChatWindow.tsx`、`NapCatSetup.tsx`、`WeChatSetup.tsx`、`SettingsDialog.tsx`、`WelcomeStep.tsx`、`TitleBar.tsx`、`CardSelect.tsx`、`MessageInput.tsx`

---

## 12. Ollama 本地模型 + 多模型故障切换

**日期**: 2026-04-29

### 问题
仅支持云端 API，缺少离线隐私模式和主模型失败时的自动回退。

### 修复
- `AIConfig.provider` 新增 `ollama`，`createAIProvider()` 用 OpenAI-compatible 连接 localhost:11434/v1
- 新增备用模型配置（backupProvider/backupModel/backupApiKey/backupBaseUrl），`processMessage` 主模型失败时自动切换
- SettingsDialog 新增 Ollama 选项，本地模式 API Key 可选

### 技术栈
- Ollama OpenAI-compatible API + `createAIProvider()` 兼容层

### 涉及文件
- `src/core/config.ts` — provider 类型 + backup 字段
- `src/core/pipeline.ts` — Ollama case + `callAI()` + fallback
- `src/renderer/components/shared/SettingsDialog.tsx` — Ollama 选项

---

## 13. 消息重新生成

**日期**: 2026-04-29

### 问题
AI 回复不佳时只能重发消息，无法直接重新生成。

### 修复
- `removeLastTurn()` 从会话历史删除最后一轮，`chat:regenerate` IPC 用原用户消息重走 pipeline
- MessageBubble 右键菜单支持最后一条 AI 消息「重新生成」

### 技术栈
- React `onContextMenu` + popover 菜单、IPC request-response

### 涉及文件
- `src/core/memory.ts` — `removeLastTurn()`
- `src/main/ipc-handlers.ts` / `preload.ts` — `chat:regenerate`
- `src/renderer/hooks/useChat.ts` — `regenerate()`
- `src/renderer/components/chat/MessageBubble.tsx` / `MessageList.tsx`

---

## 14. 角色模板库

**日期**: 2026-04-29

### 问题
角色创建从零开始，新用户上手门槛高，无预设参考。

### 修复
- 内置 5 个预设模板（元气女友/温柔男友/傲娇系/阳光系/沉稳系），各含完整 Profile 数据
- 新增 `QuickStartStep` 作为 wizard 第 2 步，选模板一键填充或「从空白创建」跳过
- 模板填充后跳转到角色描述步骤，可进一步自定义修改

### 技术栈
- React component composition — 模板数据驱动表单填充

### 涉及文件
- `src/renderer/components/wizard/QuickStartStep.tsx` — 新建
- `src/renderer/pages/SetupWizard.tsx` — 插入步骤
- `src/renderer/hooks/useSetupWizard.ts` — TOTAL_STEPS 15、canNext 偏移
