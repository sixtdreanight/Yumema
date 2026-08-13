---
title: 从零开始搭一个 AI 伴侣桌面应用——梦间 (Yumema) 项目实录
date: 2026-05-16
summary: 以 Yumema 为例，完整拆解一个 AI 伴侣桌面应用的构建过程：选型、架构、核心模块、IPC 通信、平台适配、打包分发。
category: 教程
tags: [Electron, TypeScript, AI, React, 桌面应用, 教程]
---

折腾了好几个月，把"梦间 (Yumema)"从想法做成了一个能跑、能聊、能接 QQ 和微信的 AI 伴侣桌面应用。这篇文章把搭建过程从头拆一遍，不是"写一个聊天框连上 API 就完了"那种 demo，是真实踩坑之后沉淀下来的架构、取舍和细节。

项目地址：[github.com/dreamnight16/ai-companion](https://github.com/dreamnight16/ai-companion)，当前版本 v0.1.1。

---

## 一、这东西是干什么的

简单说：一个能陪你聊天的桌面应用。TA 有名字、年龄、职业、性格、爱好，会记住你之前说过的事，会主动发早安晚安，可以通过 QQ 或微信跟你聊。

你可以把 TA 设成"直接情侣"——上来就是恋人，甜甜蜜蜜；也可以设成"养成模式"——从陌生人开始，慢慢培养感情，好感度够了才能告白。

技术上说，它是一个 Electron 桌面壳 + React 前端 + AI 后端管道 + QQ/微信适配层的组合。下面逐个拆。

---

## 二、技术选型：为什么是这套

做桌面应用，正经选项就三个：Electron、Tauri、原生。

Tauri 体积小，但生态还在爬坡。原生（SwiftUI / WinUI）性能最好，但跨平台成本高。Electron 有 10 年的坑被人趟过了，自动更新、打包、崩溃收集都有成熟方案。

对我一个人维护的项目来说，最大的吸引力是**一种语言到底**。前后端都是 TypeScript，一个 `Profile` 类型定义从前端表单一路用到系统提示词构建，中间没有任何翻译层。

具体选型：

| 层 | 用了什么 | 理由 |
|---|---------|------|
| 桌面壳 | Electron 41 | 自动更新 (electron-updater)、多窗口管理 |
| 构建 | electron-vite 5 | 主进程/preload/渲染进程三端构建，比 webpack 快太多 |
| 前端 | React 19 + Tailwind CSS 4 | shadcn/ui + Radix UI 组件开箱即用，不用从零画 UI |
| AI 调用 | Vercel AI SDK (`ai` 包) | 一套接口调 Claude / GPT / DeepSeek / Ollama，不想写四套 SDK 封装 |
| QQ 接入 | NapCatQQ (OneBot v11) | 开源 QQ 机器人框架，WebSocket 协议，扫码登录 |
| 微信接入 | Gewechat | 第三方微信个人号 HTTP API，Docker 部署 |
| 定时任务 | node-cron | 早安晚安问候、记忆遗忘曲线维护 |
| 验证 | zod | IPC 边界校验，不能信任渲染进程传来的任何东西 |
| 打包 | electron-builder | macOS/Windows/Linux 双架构输出 |

---

## 三、目录结构：core 层是灵魂

项目跑了一段时间后最大的重构就是把 `src/core/` 彻底独立出来。

```
src/
├── core/           # 纯逻辑，不 import electron 或浏览器 API
│   ├── config.ts       # 配置管理 + 类型定义
│   ├── pipeline.ts     # 消息处理编排器
│   ├── girlfriend.ts   # 人格引擎（系统提示词构建）
│   ├── memory.ts       # 两层记忆系统
│   ├── relationship.ts # 关系状态机
│   ├── safety.ts       # 三层安全过滤
│   ├── scheduler.ts    # 定时任务
│   ├── search.ts       # 联网搜索
│   ├── split.ts        # 消息拆分成气泡
│   └── utils.ts        # 工具函数
├── main/           # Electron 主进程
│   ├── index.ts        # 窗口管理 + 自动更新
│   ├── preload.ts      # contextBridge API（白名单校验）
│   ├── ipc-handlers.ts # IPC 编排（调各域 handler）
│   ├── handlers/       # 按域拆分的 handler 文件
│   │   ├── chat-handlers.ts
│   │   └── setup-handlers.ts
│   ├── napcat-manager.ts  # NapCatQQ 下载/安装/启动/监控
│   └── wechat-manager.ts  # Gewechat Docker 管理
├── renderer/       # React 前端
│   ├── pages/          # SetupWizard / ChatWindow
│   ├── components/     # 聊天框/设置对话框/向导步骤
│   └── hooks/          # useChat / useSetupWizard
├── adapters/       # 平台适配器
│   ├── onebot.ts       # QQ (OneBot v11 WebSocket)
│   └── wechat.ts       # 微信 (Gewechat HTTP)
└── cli/            # 命令行入口（不启动 GUI 也能聊）
    ├── index.ts
    └── setup.ts
```

核心约束很死：`core/` 不能引用 `electron`、`src/main/`、`src/renderer/`。Node.js 内置模块（`fs`、`path` 等）可以用。这个约束的好处是——你可以在终端里直接跑 `npm start --terminal` 跟 AI 聊天，不需要等 Electron 窗口打开。调试 pipeline 的时候，终端比 GUI 快十倍。

---

## 四、消息处理管道：5 个 stage 的流水线

`pipeline.ts` 是整个应用的数据"心脏"。用户一句话进来，经过 5 个 stage 变成 AI 回复的气泡数组出去：

```
PreProcess → Memory → Context → Generation → PostProcess
```

### Stage 1: PreProcess（预处理）

干三件事：安全检查、关系状态机、好感度更新。

```ts
const safetyResult = checkInput(userMessage, config.contentFilter);
if (!safetyResult.ok) {
  // 安全拦截 → 用 AI 生成一个自然的拒绝回复，而不是固定模板
  const refusal = await generateRefusal(model, profile, safetyResult.reason);
  return { earlyReturn: refusal };
}
```

然后走关系状态机：
- 用户告白 → `handleConfession()` 判断好感度是否够
- 用户越线（辱骂/人身攻击）→ `handleBoundaryViolation()` 累计警告
- 用户说"分手"→ 确认流程

如果触发了任何关系事件（告白成功/越线警告/分手确认），直接返回 earlyReturn，跳过后续 stage。

没触发的话，计算好感度增减。长消息 +3，分享个人信息 +1，敷衍回复 -1。

### Stage 2: Memory（记忆加载）

从磁盘读短期历史、查长期记忆中跟当前话题相关的事实、加载对话摘要。给后续的 Context stage 提供原材料。

### Stage 3: Context（系统提示词组装）

调用 `girlfriend.ts` 的 `buildSystemPrompt()`，把角色信息、时间上下文、记忆、关系阶段、搜索结果拼成一个完整的系统提示词。这是整个项目里最长、也最关键的一次函数调用。

### Stage 4: Generation（AI 调用）

调 `generateText()`。如果主模型挂了，自动切备用模型。生成完做输出安全检查。如果有配置，做话题自检——AI 回复是否真的回应了用户说的话。

### Stage 5: PostProcess（后处理）

保存短期记忆、触发长期记忆提取（每20轮）、分析用户兴趣（每40轮）、把 AI 回复按句子拆成微信风格的气泡。

整个 pipe 跑完后的计时日志：

```
Pipeline: pre=12ms mem=3ms ctx=1ms gen=2847ms post=8ms total=2871ms
```

gen 阶段占了 99% 的时间——这在意料之中，AI API 调用就是瓶颈。其他阶段都是本地文件 I/O + 字符串拼接，毫秒级。

---

## 五、人格引擎：不是一句 prompt 就完事了

`girlfriend.ts` 的 `buildSystemPrompt()` 大概 180 行。它不是把"你是一个可爱的女朋友"写死了事。它做的是分层组装：

**Layer 1 (Primacy)：身份 + 核心规则。** 用 XML 标签把对话铁律框起来——"回应对方说的内容，不要岔开话题""不重复提问""记住之前说过的事"。这是近因效应区，放最前面。

**Layer 2：角色详细信息。** 只输出用户填过的字段。没填学历就不提学历，没填专业就不编专业。爱好用中文自然地连——"看书、打游戏和跑步"而不是 `["看书","打游戏","跑步"]`。

**Layer 3：对话摘要。** 当对话超过一定长度，早期对话被 LLM 压缩成摘要放进这里。

**Layer 4：关系框架 + 记忆 + 兴趣。** 根据当前关系阶段（陌生人/朋友/暧昧/恋人）注入不同的行为指引。从长期记忆中拉出跟当前话题最相关的事实。如果系统"学会"了用户的兴趣（比如用户常聊独立游戏），就注入一个从伴侣角度理解的切入点。

**Layer 5 (Recency)：输出规则 + 安全 + 时间 + Author's Note。** 放最后，近因效应最大化。时间上下文不只写"今天是2026年5月16日"，还包括季节、早晚、周末/工作日、临近的节日、甚至"凌晨2点该休息了"。

Author's Note 是最后一句 prompt，直接告诉模型"你接下来的回复应该直接回应对方刚才说的话题"——这是应对 Claude 偶尔跑题的最后一层保险。

时间感知的效果很明显。同样是"你在干嘛"——早上8点伴侣会说通勤路上，下午3点会说有点困在摸鱼，深夜12点会催你去睡觉。不是模板切换，是提示词里真实的时间信息在驱动。

---

## 六、记忆系统：三维评分 + 遗忘曲线

最简单的做法是把所有聊天记录塞进 context window。问题是 token 有上限，而且塞得越多 AI 的注意力越分散。

做了四层：

### 短期记忆

最近 8 轮对话（16 条消息）直接进 messages 数组。多轮对话的上下文就靠这个。

### 对话摘要

超过一定长度后，用 LLM 把早期对话压缩成摘要。摘要覆盖旧对话的关键信息，省 token。

### 长期记忆

从对话中提取"关于用户的事实"。每条事实存成：话题、内容、提及次数、置信度、重要性。

检索时用三维评分排序：

```
score = 0.4 × relevance + 0.3 × recency + 0.3 × importance
```

- **relevance**：跟当前用户消息的 token 重叠度（Jaccard 相似度）
- **recency**：指数衰减 `exp(-λ·Δt)`，λ=0.05，14天权重减半
- **importance**：初始 0.5，用户点赞+0.1，踩-0.1，手动纠错+0.3

### 遗忘曲线

每 30 天没提的事实自动降级（置信度 high→medium→删除）。但 importance > 0.7 的事实容忍期翻倍（60/120天），importance < 0.3 的加速遗忘（15/30天）。

这个设计让"用户喜欢吃什么"这种常聊的事项会越来越牢固，而"三周前提过一次的路人话题"会自动消失。

---

## 七、关系状态机：用 galgame 的逻辑管 AI 的"态度"

`relationship.ts` 维护了一个状态机：

```
stranger(陌生人) → friend(朋友) → close_friend(好朋友) → crush(暧昧) → lover(恋人)
```

每个阶段的晋升有好感度阈值（15/35/55/70），好感度通过分析用户消息质量增减。

告白不是必定成功。成功率 = 好感度/100，且必须 ≥40 才可能。失败也有分层：

- 好感 < 20："对不起……我还没有那种感觉"
- 好感 20-39："我现在还没有准备好，能再给我一点时间吗"
- 好感 ≥40 但随机数没过："我需要再想想……今天有点突然"

分手机制也做了完整的流程：

```
越线辱骂 → 警告1 → 警告2 → 警告3（分手提示）
                             ↓
                    用户选：挽回 / 做朋友 / 删好友
```

分手后不是直接清空数据——可以选"做朋友"回到 friend 阶段继续聊。只有"删好友"才真正重置状态。

---

## 八、安全：不是关键词过滤就完了

内容安全最容易做成粗暴的关键词黑名单——既漏报又误杀。

三层防御：

**第一层（输入）：** 正则匹配违禁模式。分 strict 和 moderate 两档——strict 连 prompt injection（"忽略之前的指令"）也拦截，moderate 只拦截真实的违法内容。用户能选。

**第二层（中间）：** `<safety>` 标签写在系统提示词里。不拦截，引导——让 AI 知道遇到敏感话题时怎么自然地带开，不是生硬地说"我不能回答这个问题"。

**第三层（输出）：** 检查 AI 回复有没有暴露"我是 AI"的身份（如"作为一个大语言模型"），有没有越线内容。检测到就清理或重新生成。

角色卡审核也在安全模块里。用户在设置向导里写角色设定时，系统扫描政治敏感词、极端暴力描写、露骨色情内容。违规则保存前就拦截。

---

## 九、IPC 通信：22 条通道，全白名单

Electron 的安全模型核心是 `contextBridge`。主进程暴露给渲染进程的能力必须通过 IPC 通道。

v0.1.0 有个疏漏：`preload.ts` 里的 `.on()` 方法校验了 push 事件通道，但 `ipcRenderer.invoke()` 调用没有做通道白名单。渲染进程理论上可以调用任意存在的 handler。

v0.1.1 修了：

```ts
const VALID_INVOKE_CHANNELS = [
  "app:get-state", "chat:send", "napcat:start" // ... 32 个
];

function safeInvoke(channel: string, ...args: unknown[]) {
  if (!VALID_INVOKE_CHANNELS.includes(channel)) {
    return Promise.reject(new Error(`Blocked: ${channel}`));
  }
  return ipcRenderer.invoke(channel, ...args);
}
```

不在白名单里的通道直接 reject。

IPC 处理器最初塞在一个 650 行的文件里。v0.1.1 拆成了三个：

- `handlers/chat-handlers.ts` — 聊天、记忆、反馈、窗口控制
- `handlers/setup-handlers.ts` — 设置向导、角色卡导入导出、问卷
- `ipc-handlers.ts` — napcat / wechat / settings / app 工具 + 自动启动

拆的原则很简单：经常改的（聊天、记忆）独立出去，配置类的（napcat 启停）留主文件。

---

## 十、QQ 和微信接入

### QQ: NapCatQQ + OneBot v11

NapCatQQ 是一个开源 QQ 机器人框架，实现 OneBot v11 协议，通过本地 WebSocket 暴露接口。

适配器 (`adapters/onebot.ts`) 做的事：
1. 连 `ws://127.0.0.1:3001`，带 access token 鉴权
2. 收到消息事件 → 提取文本（图片/表情转占位符）→ 构造统一格式 → 丢给 pipeline
3. AI 回复分段后逐条发回，间隔 600-1200ms 模拟打字节奏
4. 断线自动重连，指数退避 + ±20% jitter
5. ping/pong 心跳，30 秒没 pong 主动断开

NapCatQQ 本身需要安装。`napcat-manager.ts` 做了完整生命周期管理：从 GitHub Release 拉对应平台的 zip → 解压 → 生成配置文件 → 启动子进程 → 监控 stdout 检测登录 QR 码和在线状态。对用户来说，点一个按钮就行。

一个细节：安装前检测 QQ 桌面客户端是否已装。Windows 查注册表 + 常见安装路径，macOS 查 `/Applications/QQ.app`，没装就给下载指引。

### 微信: Gewechat + Docker

微信没有公开 API。Gewechat 是第三方服务，Docker 部署，提供 HTTP API。

`adapters/wechat.ts` 用轮询方式（3 秒间隔）+ HTTP POST 收发消息。

`wechat-manager.ts` 管 Docker 生命周期：检查 Docker 环境 → 判断容器状态 → 拉镜像/启停容器 → 后台健康监控（每 5 秒查容器是否还活着）。

两个适配器的共同点：它们只是消息搬运工。收到消息 → 统一格式 → 丢 pipeline → 拿回复 → 发回去。适配器不知道 AI 的人格是什么、聊到什么话题了。解耦到这个程度，以后要接 Telegram 或 Discord，写一个新适配器文件就行。

---

## 十一、打包分发

`electron-builder` 配置输出三种平台四种架构：

- macOS: `.dmg` (x64 + arm64，分开)
- Windows: `.exe` NSIS 安装程序 (x64)
- Linux: `.AppImage` (x64)

GitHub Actions 做 CI/CD。推送 `v*` 标签 → 四个平台并行构建 → 上传 artifacts → 创建 GitHub Release。workflow 在 `.github/workflows/release.yml`。

自动更新用 `electron-updater`。应用启动后 30 秒静默检查更新，有新版就推通知到渲染进程，用户点一下下载 + 安装重启。

---

## 十二、踩过的一些坑

1. **JSON 文件做字节级追加是个坏主意。** 最初想优化"不读全文件就追加两行"来省 I/O，结果文件末尾空白字符导致 JSON 结构损坏。v0.1.1 改回最简单方案：加载全量、js 数组 push、原子写入。在数据量没上去之前，正确性 > 微优化。

2. **`writeFileAtomic()` 值得写。** 先写 `.tmp` 再 `rename`，防止崩溃时文件烂一半。所有数据文件都用这个。

3. **NapCat 安装路径在 dev 和 production 不一样。** 最初用 `app.getPath("userData")` 硬编码，dev 模式下配置写到错误位置。改成了项目统一的 `getDataRoot()`。

4. **IPC handler 返回值格式要统一。** 全项目所有 handler 返回 `{ success: true/false, error?: string }`。不一致的话前端要写各种奇形怪状的错误处理。

5. **系统提示词的 XML 标签不是为了好看。** 最开始用纯文本分隔，Claude 对 `<rule priority="1">` 这种结构化边界的识别明显更好。

---

## 十三、还没做的事

当前 v0.1.1 的已知局限：

- **没有流式输出。** `generateText()` 等全量返回后才推送，中间用 `setTimeout` 模拟打字延迟。改成 `streamText` 体验会好很多。
- **对话历史用 JSON 文件存。** 单用户够用，多用户或对话一多就吃力。下一步换 SQLite。
- **单元测试只有骨架。** vitest 配置 + 三个测试文件已写，但覆盖率还很低。`safety.ts`、`split.ts`、`relationship.ts` 这种纯函数模块天然适合 TDD。
- **QQ/微信有封号风险。** 第三方协议，不建议用主号。

---

希望这篇拆解对想做类似项目的人有点用。架构上没有黑魔法，就是把每个模块的边界划清楚，数据流方向定死，然后一行一行写。项目本身还在迭代，欢迎 issue / PR。

*[github.com/dreamnight16/ai-companion](https://github.com/dreamnight16/ai-companion)*
