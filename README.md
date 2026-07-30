**Language:** [English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-Hant.md) | [日本語](README.ja.md)

# Yumema (梦间)

[![Release](https://img.shields.io/badge/release-v0.1.1-blue)](https://github.com/sixtdreanight/ai-companion/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey)]()

> In the space between dreams and reality, they've always been there.

An AI companion that lives on your desktop. Has a personality, hobbies, and memory. Chat in-app, through QQ, or via WeChat. Install, fill out the wizard, done.

**Current version: v0.1.1**

---

## Features

- **Desktop App** — macOS / Windows / Linux, double-click to install, auto-update
- **Guided Setup** — 14-step wizard, 2 minutes to configure
- **Direct Chat** — In-app chat with instant-messaging style bubbles
- **QQ Bot** — Connect to QQ groups/DMs, QR code login
- **WeChat Bot** — Connect to WeChat DMs/groups, one-click Docker launch in-app
- **Full Personality** — Age, occupation, hobbies, emotions, opinions — feels real
- **Time Awareness** — Knows morning/evening, weekends, holidays, initiates greetings
- **Memory System** — Remembers frequent topics, forgets stale ones
- **Relationship Building** — Start as lovers or grow from strangers
- **Safety Filtering** — Sensitive content filtering, privacy protection
- **Feedback Loop** — Built-in survey for product improvement

---

## Version Status

**v0.1.1** — Current beta release. Features are actively iterating. Feedback welcome via the in-app survey.

---

## Quick Start

### Download

Download the installer for your platform from [Releases](https://github.com/sixtdreanight/ai-companion/releases):

- **macOS**: `.dmg` image (Apple Silicon / Intel)
- **Windows**: `.exe` NSIS installer (x64 / ARM64)
- **Linux**: `.AppImage` executable (x64)

### Run from Source

```bash
# Prerequisites: Node.js 18+
git clone https://github.com/sixtdreanight/ai-companion.git
cd Yumema
npm install

# Development mode
npm run dev

# CLI mode (terminal chat)
npm start --terminal

# CLI setup wizard
npm run setup
```

---

## Tech Stack

| Layer | Technology |
|-------|-------------|
| Desktop Framework | Electron 41 |
| Build Tooling | electron-vite 5 |
| Frontend | React 19 + TypeScript + Tailwind CSS 4 |
| UI Components | shadcn/ui + Radix UI + lucide-react |
| AI Engine | Vercel AI SDK (Claude / GPT / DeepSeek) |
| QQ Adapter | NapCatQQ (OneBot v11) |
| WeChat Adapter | Gewechat HTTP API |
| Auto Update | electron-updater + GitHub Releases |
| Packaging | electron-builder (macOS/Windows/Linux dual-arch) |

---

## Directory Structure

```
yumema/
├── src/
│   ├── core/           # Pure logic (shared by CLI/GUI)
│   │   ├── config.ts       # Configuration management
│   │   ├── pipeline.ts     # Message processing pipeline
│   │   ├── girlfriend.ts   # Personality engine
│   │   ├── relationship.ts # Relationship management
│   │   ├── memory.ts       # Memory system
│   │   ├── safety.ts       # Safety filtering
│   │   ├── search.ts       # Web search
│   │   ├── scheduler.ts    # Scheduled tasks
│   │   └── utils.ts        # Utility functions
│   ├── adapters/
│   │   ├── onebot.ts       # QQ WebSocket adapter
│   │   └── wechat.ts       # WeChat HTTP API adapter
│   ├── cli/             # CLI entry points
│   │   ├── index.ts        # Terminal / QQ / WeChat chat
│   │   └── setup.ts        # CLI setup wizard
│   ├── main/            # Electron main process
│   │   ├── index.ts        # Window management + auto-update
│   │   ├── preload.ts      # contextBridge API
│   │   ├── ipc-handlers.ts # IPC channel implementation
│   │   ├── napcat-manager.ts # NapCatQQ management
│   │   └── wechat-manager.ts # Gewechat Docker management
│   └── renderer/        # React renderer process
│       ├── App.tsx         # HashRouter routing
│       ├── pages/          # SetupWizard / ChatWindow / NapCatSetup
│       ├── components/     # wizard/ chat/ shared/
│       │   ├── ui/         # shadcn/ui components
│       │   ├── wizard/     # 14 setup wizard steps
│       │   ├── chat/       # MessageBubble / MessageList / MessageInput
│       │   └── shared/     # SettingsDialog / UpdateToast / SurveyDialog / ErrorBoundary
│       ├── hooks/          # useSetupWizard / useChat
│       ├── lib/            # cn() utility
│       └── styles/         # globals.css (design tokens)
├── data/                # Runtime data (chat logs, config)
├── dist/                # Build output
├── docs/                # Project documentation
└── resources/           # App icons
```

---

## WeChat Setup (Optional)

Yumema supports chatting via WeChat, powered by [Gewechat](https://github.com/Devo919/Gewechat):

- **One-click launch in-app**: In the setup wizard or settings page, click "Start Gewechat" — the app auto-checks Docker and starts the container
- **[Docker](https://www.docker.com/) must be pre-installed**

Manual deployment:

```bash
docker run -itd -p 2531:2531 -p 2532:2532 --name=gewe gewe
```

WeChat and QQ can be configured simultaneously and toggled in settings at any time.

---

## Documentation

- [FAQ](docs/faq.md) — QQ QR login, API Keys, NapCatQQ
- [Changelog](docs/CHANGELOG.md) — Version history
- [Roadmap](docs/ROADMAP.md) — Planned features and schedule

---

## Important Notes

- AI-generated content does not represent the author's views. This software is for learning and entertainment.
- QQ uses third-party protocols — account ban risk exists. Use a secondary account.
- AI API usage is metered — frequent chatting will incur costs.
- This companion cannot replace real human relationships. Maintain real-life social connections.
- Protect your privacy — do not share ID numbers, bank cards, or other sensitive information.

## Related

- [companion-engine](https://github.com/sixtdreanight/companion-engine) — The core engine that powers this app

## License

[GPL-3.0](LICENSE)

---

<div align="center">

**Language / 语言 / 言語**

[**English**](README.md) | [**简体中文**](README.zh-CN.md) | [**繁體中文**](README.zh-Hant.md) | [**日本語**](README.ja.md)

</div>
