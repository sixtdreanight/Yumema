# 常见问题

## QQ 相关

### Q: NapCatQQ 启动失败怎么办？

1. 确认网络连接正常（NapCatQQ 需要从 GitHub 下载）
2. 检查是否被防火墙/杀毒软件拦截
3. 尝试手动下载 NapCatQQ 放到应用数据目录
4. 如果一直失败，可以先跳过 QQ 配置，先使用直接聊天

### Q: 扫码后一直显示"等待确认"？

这是 QQ 的安全机制。尝试：
- 在手机 QQ 上确认登录
- 如果长时间无响应，重新打开 QQ 登录页重试
- 确保手机 QQ 是最新版本

### Q: QQ 会封号吗？

**有可能。** NapCatQQ 使用的是第三方协议，不是腾讯官方 API。存在被封号或限制登录的风险。

**强烈建议使用小号。** 不要用主号或有重要数据的 QQ 号。

### Q: QQ 连接成功后收不到消息？

检查以下几点：
1. NapCatQQ 状态是否为"已连接"
2. WebSocket 地址和 Access Token 是否正确
3. QQ 号是否在目标群中，或是否允许接收私聊
4. 查看应用日志排查具体错误

### Q: 可以在多个设备上同时登录同一个 QQ 吗？

不建议。NapCatQQ 模拟的是 QQ 客户端登录，多端登录可能触发安全验证。

---

## AI 服务商

### Q: 选哪个 AI 服务商？

| 服务商 | 优点 | 缺点 |
|--------|------|------|
| **Claude (推荐)** | 中文最好、对话自然、安全 | 需要海外手机号注册 |
| **OpenAI** | 响应快、功能全面 | 需要海外手机号注册 |
| **DeepSeek** | 国内可注册、便宜 | 风格偏正经 |

### Q: API Key 在哪里获取？

- **Claude**: [console.anthropic.com](https://console.anthropic.com) → API Keys
- **OpenAI**: [platform.openai.com](https://platform.openai.com) → API Keys
- **DeepSeek**: [platform.deepseek.com](https://platform.deepseek.com) → API Keys

### Q: 贵不贵？

- **DeepSeek**: 聊一整天大概几分钱
- **Claude Haiku**: 聊一小时几毛钱
- **Claude Sonnet/Opus**: 聊一小时 1-2 元
- **GPT-4o**: 聊一小时 1-2 元

### Q: API Key 报错"401 Unauthorized"？

- 确认 Key 没有过期
- 确认 Key 没有多打或少打字符
- 确认账户余额充足
- 对于"其他兼容接口"，确认 Base URL 配置正确

### Q: API 返回"Rate Limit"？

你超过了 API 服务商的速率限制。等几分钟再试，或者在服务商后台提升限额。

---

## 使用相关

### Q: TA 会记得所有事情吗？

不会。像真人一样——常聊的事情会记住（比如你的工作、爱好），偶尔提到的事情慢慢就忘了。这是设计如此，让 TA 更像真人。

### Q: 可以换人设吗？

重新运行设置向导或点击设置中的选项即可。会覆盖之前的角色卡，但聊天记录会保留。

### Q: 怎么让 TA 更像真人？

在设置向导的"说话习惯"步骤中，给 TA 加一些细节：
- 喜欢用颜文字 `(〃▽〃)`
- 有口头禅 "你品你细品"
- 激动时打很多感叹号
- 结尾加波浪线

### Q: 可以同时有多个伴侣吗？

目前不支持。每个应用实例只能有一个 V-Partner。

### Q: 数据存在哪里？

- **桌面应用**: `~/Library/Application Support/v-partner/` (macOS)
- **CLI 模式**: 项目的 `data/` 目录
- 配置文件: `profile.json`, `.env`
- 聊天记录: `data/conversations/`

### Q: 怎么备份数据？

复制对应平台的数据目录即可。恢复时将备份文件放回原位。

---

## 安装 & 运行

### Q: macOS 打开时提示"无法验证开发者"？

在系统设置 → 隐私与安全性中，点击"仍要打开"。后续版本会进行代码签名。

### Q: Windows 安装时被 SmartScreen 拦截？

点击"更多信息" → "仍要运行"。这是因为没有购买代码签名证书。

### Q: 应用打不开，闪退？

1. 确认系统版本符合要求（macOS 11+ / Windows 10+ / Linux x64）
2. 从终端运行查看错误日志
3. 删除数据目录重新初始化

### Q: CLI 模式还可用吗？

可以。`npm start --terminal` 在终端中聊天，`npm run setup` 终端设置向导。CLI 和 GUI 共享同一份 core/ 逻辑代码。

---

## 安全 & 隐私

### Q: 聊天内容会被泄露吗？

聊天内容会发送给你选择的 AI 服务商（Anthropic/OpenAI/DeepSeek）处理。**不要透露身份证号、银行卡、密码、家庭住址等敏感信息。**

### Q: 作者能看到我的聊天记录吗？

不能。聊天内容只存储在你的本地设备上，不会上传到任何第三方服务器（除了你选择的 AI 服务商）。

### Q: 如何删除所有数据？

删除数据目录即可：
- macOS: `~/Library/Application Support/v-partner/`
- Windows: `%APPDATA%/v-partner/`
- Linux: `~/.config/v-partner/`
