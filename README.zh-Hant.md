**語言 / Language:** [English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-Hant.md) | [日本語](README.ja.md)

# 夢間 / Yumema

[![Release](https://img.shields.io/badge/release-v0.1.1-blue)](https://github.com/dreamnight16/ai-companion/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey)]()

> 夢與現實之間的間隙裡，TA 一直都在 — AI 伴侶桌面應用

**目前版本：v0.1.1**

夢間 (Yumema) 是一個 AI 伴侶桌面應用。TA 有自己的性格、愛好、情緒和記憶，可以透過 QQ、微信或應用程式內直接聊天。雙擊安裝、填寫精靈、即可使用。

---

## 功能

- **桌面應用** — macOS / Windows / Linux，雙擊安裝，支援自動更新
- **引導式設定** — 14 步驟精靈，2 分鐘完成設定
- **直接聊天** — 應用程式內聊天，即時通訊風格氣泡
- **QQ 機器人** — 接入 QQ 群聊/私聊，掃碼登入
- **微信機器人** — 接入微信私聊/群聊，應用程式內一鍵啟動 Docker 服務
- **性格完整** — 年齡、職業、愛好、情緒、觀點，像個真人
- **時間感知** — 知道早晚、週末、節日，會主動問候
- **記憶系統** — 常聊的事會記住，不常提的慢慢忘記
- **關係養成** — 直接情侶 / 從陌生人慢慢培養
- **安全過濾** — 敏感內容過濾，保護隱私
- **測試回饋** — 內建問卷，幫助產品持續改進

---

## 版本狀態

**v0.1.1** — 目前為測試版，功能持續迭代中。使用後歡迎透過內建問卷提交回饋。

---

## 快速開始

### 下載安裝

從 [Releases](https://github.com/dreamnight16/ai-companion/releases) 下載對應平台安裝套件：

- **macOS**: `.dmg` 安裝映像檔 (Apple Silicon / Intel)
- **Windows**: `.exe` NSIS 安裝程式 (x64 / ARM64)
- **Linux**: `.AppImage` 可執行檔 (x64)

### 從原始碼執行

```bash
# 前置需求：Node.js 18+
git clone https://github.com/dreamnight16/ai-companion.git
cd Yumema
npm install

# 開發模式
npm run dev

# CLI 模式（終端聊天）
npm start --terminal

# CLI 設定精靈
npm run setup
```

---

## 技術棧

| 層 | 技術 |
|---|---|
| 桌面框架 | Electron 41 |
| 建置工具 | electron-vite 5 |
| 前端 | React 19 + TypeScript + Tailwind CSS 4 |
| UI 元件 | shadcn/ui + Radix UI + lucide-react |
| AI 引擎 | Vercel AI SDK (Claude / GPT / DeepSeek) |
| QQ 適配器 | NapCatQQ (OneBot v11) |
| 微信適配器 | Gewechat HTTP API |
| 自動更新 | electron-updater + GitHub Releases |
| 打包 | electron-builder (macOS/Windows/Linux 雙架構) |

---

## 目錄結構

```
yumema/
├── src/
│   ├── core/           # 純邏輯（CLI/GUI 共用）
│   │   ├── config.ts       # 設定管理（AI / QQ / 微信）
│   │   ├── pipeline.ts     # 訊息處理管線
│   │   ├── girlfriend.ts   # 人格引擎
│   │   ├── relationship.ts # 關係管理
│   │   ├── memory.ts       # 記憶系統
│   │   ├── safety.ts       # 安全過濾
│   │   ├── search.ts       # 網路搜尋
│   │   ├── scheduler.ts    # 排程任務
│   │   └── utils.ts        # 工具函式
│   ├── adapters/
│   │   ├── onebot.ts       # QQ WebSocket 適配器
│   │   └── wechat.ts       # 微信 HTTP API 適配器
│   ├── cli/             # CLI 入口
│   │   ├── index.ts        # 終端 / QQ / 微信 聊天
│   │   └── setup.ts        # CLI 設定精靈
│   ├── main/            # Electron 主程序
│   │   ├── index.ts        # 視窗管理 + 自動更新
│   │   ├── preload.ts      # contextBridge API
│   │   ├── ipc-handlers.ts # IPC 頻道實作
│   │   ├── napcat-manager.ts # NapCatQQ 管理
│   │   └── wechat-manager.ts # Gewechat Docker 管理
│   └── renderer/        # React 渲染程序
│       ├── App.tsx         # HashRouter 路由
│       ├── pages/          # SetupWizard / ChatWindow / NapCatSetup
│       ├── components/     # wizard/ chat/ shared/
│       │   ├── ui/         # shadcn/ui 元件 (Button/Badge/Card/Dialog/Select/Slider/Sheet/Tabs)
│       │   ├── wizard/     # 14 個設定精靈步驟
│       │   ├── chat/       # MessageBubble / MessageList / MessageInput
│       │   └── shared/     # SettingsDialog / UpdateToast / SurveyDialog / ErrorBoundary / CardSelect
│       ├── hooks/          # useSetupWizard / useChat
│       ├── lib/            # cn() 工具函式
│       └── styles/         # globals.css (設計令牌)
├── data/                # 執行時期資料（對話記錄、設定）
├── dist/                # 建置輸出
├── docs/                # 專案文件
└── resources/           # 應用圖示
```

---

## 微信整合（可選）

夢間支援透過微信與 AI 伴侶聊天，基於 [Gewechat](https://github.com/Devo919/Gewechat) 服務：

- **應用程式內一鍵啟動**：在設定精靈或設定頁面點擊「啟動 Gewechat」，應用程式會自動檢查 Docker 環境並啟動容器
- **需預先安裝 [Docker](https://www.docker.com/)**

如需手動部署：

```bash
docker run -itd -p 2531:2531 -p 2532:2532 --name=gewe gewe
```

微信與 QQ 可同時設定，也可隨時在設定中啟用/停用。

---

## 文件

- [常見問題](docs/faq.md) — QQ 掃碼、API Key、NapCatQQ
- [更新日誌](docs/CHANGELOG.md) — 版本變更記錄
- [路線圖](docs/ROADMAP.md) — 版本規劃與排程

---

## 重要提醒

- **AI 內容不代表作者立場**，本軟體僅供學習娛樂
- **QQ 使用第三方協定**，存在封號風險，建議使用小帳號
- **AI API 按量計費**，頻繁聊天會產生費用
- **TA 不能替代真實人際關係**，請保持現實生活中的社交
- **保護隱私**，勿透露身分證、銀行卡等敏感資訊

## 相關專案

- [companion-engine](https://github.com/dreamnight16/companion-engine) — 驅動本應用的核心引擎

## License

[GPL-3.0](LICENSE)

---

<div align="center">

**Language / 語言**

[**English**](README.md) | [**简体中文**](README.zh-CN.md) | [**繁體中文**](README.zh-Hant.md) | [**日本語**](README.ja.md)

</div>
