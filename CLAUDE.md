# 梦间 (Yumema) -- AI Companion Desktop App

## Overview

Electron 41 + React 19 + TypeScript + Tailwind CSS 4 desktop application.
AI companion that connects to QQ (NapCatQQ OneBot v11) and WeChat (Gewechat HTTP API).

**Stack:**
- Electron + electron-vite (main / preload / renderer)
- React 19 + shadcn/ui + Radix UI + lucide-react

## CRITICAL RULE: Never modify framework UI code

When the user explicitly says they do NOT want to modify the original framework's UI design:
- DO NOT add any visible HTML elements (headers, buttons, containers, wrappers)
- DO NOT change CSS, className, style props, or layout structure
- DO NOT modify the template's component tree in any way
- Only change: API connection URLs, backend logic, data adapters
- Features must be added through non-visual means: keyboard shortcuts, IPC events, or server-side logic
- If you need to add a UI feature, ask the user first whether the approach is acceptable
- Vercel AI SDK (`ai` package) -- Anthropic / OpenAI / OpenAI-compatible providers
- NapCatQQ OneBot v11 (WebSocket), Gewechat HTTP API
- electron-updater, electron-builder
- TypeScript strict mode, zod for validation

## Directory Structure

```
src/
  core/        -- Pure logic, no Electron or browser APIs
                  config / pipeline / girlfriend / relationship / memory / safety / scheduler / search / utils
  main/        -- Electron main process
                  index / preload / ipc-handlers / napcat-manager / wechat-manager
  renderer/    -- React frontend
                  App.tsx / main.tsx / types.ts
                  pages/       (SetupWizard, ChatWindow, NapCatSetup, WeChatSetup)
                  components/  (chat/ shared/ ui/ wizard/)
                  hooks/       (useChat, usePlatform, useSetupWizard)
                  lib/         (utils)
  adapters/    -- Platform adapters
                  onebot.ts (QQ via OneBot v11 WebSocket)
                  wechat.ts  (WeChat via Gewechat HTTP API)
  cli/         -- CLI tools (setup, start)
data/          -- Runtime data (profile.json, relationship.json, conversations/)
resources/     -- App icons per platform
scripts/       -- Build/CI scripts
```

## Architecture Constraints

### Layer Isolation

- `src/core/` **must not** import from `electron`, `src/main/`, `src/renderer/`, or browser APIs. Node.js built-ins (`fs`, `path`, etc.) are allowed.
- `src/adapters/` depends on `src/core/` for types and pipeline; must not depend on `src/main/` or `src/renderer/`.
- Frontend never calls AI APIs directly. Path: `renderer → IPC → ipc-handlers → pipeline (core)`.
- Configuration flows through `loadConfig()` in `src/core/config.ts`. All .env writes go through `writeEnvFile()`.

### Data Writes

- Always use `writeFileAtomic()` (write to .tmp then rename) for crash-safe file writes.
- Runtime data lives in `getDataRoot()/data/` -- dev mode resolves to project root, production to `app.getPath("userData")`.

### Process Management

- Two-level timeout for child process termination: SIGTERM first, then SIGKILL after 10s.
- IPC handlers always return `{ success: true/false, error?: string }` -- never throw across IPC boundary.

## Code Style

### File-Level Rules

- **No emoji** in code, comments, or strings (except in AI-generated reply text for end users).
- No fancy syntax -- keep it plain and readable.
- Names should be self-explanatory. Avoid comments that describe what the code does; only comment when the reason is non-obvious.

### Function Rules

- Functions should be short and single-purpose. Aim for <= 50 lines.
- Reuse existing functions. Do not reimplement utilities that already exist in `src/core/utils.ts`.
- Three lines that solve the problem are better than ten lines with abstractions. Do not write code for hypothetical future use.

### Type Rules

- Type definitions belong in `src/core/config.ts` (shared) or at the top of the file (module-local).
- Avoid `any`. Use `unknown` when the type is genuinely unknown, cast only after validation.
- Interfaces are preferred over `type` for object shapes (consistency with existing code).

### Import Order

```ts
// 1. Node built-ins
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// 2. Third-party packages
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";

// 3. Internal modules (relative imports)
import { logger } from "./utils.js";
import type { AppConfig } from "./config.js";
```

Use `.js` extensions in import paths (NodeNext module resolution).

### Logging

Use the `logger` from `src/core/utils.ts` -- never `console.log` directly except in main process startup code that runs before core is initialized.

## Change Protocol (MUST FOLLOW)

- **Trace before editing**: Before changing a visual element, trace the ENTIRE render chain: page → component → sub-component → CSS/styling. Verify the change affects all intended targets and no unintended ones. Do NOT edit one file and assume it propagates — check every usage site first.
- **Verify after editing**: After making a change, check the built output in `dist/` to confirm the change actually landed in the generated CSS/JS. Grep for the changed value.
- **Release sync**: When bumping version, update ALL of: `package.json`, sidebar version string, SettingsDialog fallback version, README.md, docs/CHANGELOG.md, and any hardcoded version references. Run `grep -rn "old-version" src/ docs/ README.md` to find stragglers. Commit, tag, and push.

## Frontend Design Rules

### UI Framework

- Use **Radix Themes** (`@radix-ui/themes`) for styled components (Button, Dialog, Tabs, Select, Slider, TextField, Flex, Text, Heading, IconButton).
- Use **shadcn/ui** (`src/renderer/components/ui/`) only for headless wrappers around `@radix-ui/react-*` primitives (Dialog, Tabs, Select, Slider, Sheet) when Radix Themes equivalent is not sufficient.
- **Never rewrite framework components from scratch**. Adapt existing open-source components with minimal changes. Do not replace them with raw HTML + Tailwind unless there is no alternative.

### Spacing & Layout

- **Text must never touch container borders**. All tab triggers, buttons, inputs, and text content must have visible breathing room:
  - Tab triggers: minimum `px-4 py-2` (16px horizontal, 8px vertical)
  - Buttons: Radix Themes defaults (`size="2"` = 36px height, `size="3"` = 40px height)
  - Dialog content: minimum `p-5` (20px) padding inside scrollable areas
  - Form fields: minimum `gap-2` (8px) between label and input
- **Visual hierarchy**: Every interactive element needs a visible boundary — border, background color, or sufficient whitespace to distinguish it from surroundings.
- **Dark mode verification**: After any UI change, verify the component looks correct in both light and dark modes. Text must maintain WCAG AA contrast (≥ 4.5:1 for body text).

### Colors

- Always use CSS variables, never hardcoded hex values in components:
  - `var(--color-background)` / `var(--background)` for page/surface backgrounds
  - `var(--color-foreground)` / `var(--foreground)` for primary text
  - `var(--muted-foreground)` for secondary text
  - `var(--primary)` for accent/primary actions
  - `var(--border)` for borders and separators
- Radix Themes color variables (`--accent-*`, `--gray-*`) are managed by the `<Theme>` component and should be used for Radix Themes component styling.
- shadcn CSS variables (`--primary`, `--background`, etc.) are defined in `globals.css` and auto-adapt via the `.dark` class.

### Design Validation Checklist

Before committing any frontend change, verify:
1. All text has ≥ 8px padding from its container edge
2. Tab/button/input text does not touch borders
3. Switch system to dark mode — all text readable, all borders visible
4. Component spacing matches adjacent components (consistent gaps)
5. Font sizes follow the Radix Themes scale (1-9), no custom font-size hacks

## Robustness Rules

### External Input Validation

- User messages, API responses, file contents, and WebSocket payloads must be validated before use.
- Parse with type guards or narrow after structural checks. Do not trust `as` casts on external data.
- `src/core/safety.ts` handles content moderation for both input and output.

### Internal Trust

- Internal function calls trust TypeScript types. Do not add defensive null checks on values that are statically guaranteed.

### Async Operations

- All network calls must have timeout handling. Use `retry()` from `src/core/utils.ts` for transient failures.
- WebSocket connections must have reconnect logic with configurable interval.

### Error Handling

- Main process: catch errors in IPC handlers, return `{ success: false, error: string }`.
- Core pipeline: catch AI call failures, return graceful fallback reply.
- Adapters: catch message handling errors, send fallback reply to user.

### Breaking Changes Must Be Recorded

Any change that breaks existing behavior (removes a dependency, changes component library, alters imports across multiple files, causes white screen / compile errors, regresses UI appearance) **must** be documented in `docs/DEVLOG.md` with:
- What broke and why
- How it was resolved
- Files affected

This is not optional — the DEVLOG is the project memory for debugging future regressions.

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/core/config.ts` | All shared types, `loadConfig()`, `loadProfile()`, `writeEnvFile()`, `writeFileAtomic()` |
| `src/core/pipeline.ts` | Message processing pipeline: safety -> relationship -> search -> memory -> mood -> AI -> output check |
| `src/core/girlfriend.ts` | System prompt builder, mood, sadness detection, session management |
| `src/core/relationship.ts` | Slow-burn relationship state machine (stranger -> friend -> close_friend -> crush -> lover) |
| `src/core/memory.ts` | Short-term conversation history, long-term memory, fact extraction |
| `src/core/safety.ts` | Input/output content filtering, refusal generation |
| `src/core/utils.ts` | Logger, retry, pickRandom, sleep |
| `src/core/scheduler.ts` | Cron-based scheduled tasks |
| `src/core/search.ts` | Web search intent detection and execution |
| `src/main/index.ts` | App entry: window creation, auto-updater setup |
| `src/main/preload.ts` | Context bridge API (`window.api`) |
| `src/main/ipc-handlers.ts` | All IPC handler registrations |
| `src/main/napcat-manager.ts` | NapCatQQ lifecycle: download, install, configure, start, stop |
| `src/main/wechat-manager.ts` | WeChat Gewechat lifecycle |
| `src/adapters/onebot.ts` | OneBot v11 WebSocket adapter -- connects to NapCatQQ, relays messages to pipeline |
| `src/adapters/wechat.ts` | WeChat HTTP adapter |
| `src/cli/setup.ts` | CLI setup wizard, `parseDescription()` for AI partner description parsing |
| `data/profile.json` | Partner character card (Profile type) |
| `data/relationship.json` | Relationship state machine data |
| `data/conversations/` | Per-user conversation history |

## Naming Conventions

- Files: kebab-case (`napcat-manager.ts`, `ipc-handlers.ts`)
- Components: PascalCase (`MessageBubble.tsx`, `SetupWizard.tsx`)
- Functions/variables: camelCase (`loadConfig`, `processMessage`, `writeFileAtomic`)
- Types/interfaces: PascalCase (`AppConfig`, `QQMessage`, `NapCatState`)
- String union types: snake_case values (`"slow_burn"`, `"close_friend"`)

## IPC Channels

All IPC communication uses `ipcRenderer.invoke` / `ipcMain.handle` (request-response).
Push events from main to renderer use `webContents.send` with `ipcRenderer.on` listeners.

Channel naming: `domain:action` (e.g., `napcat:start`, `chat:send`, `app:get-state`).

Valid push event channels (allowlisted in preload):
- `napcat:status-changed`, `napcat:qr-ready`
- `wechat:status-changed`
- `chat:reply-chunk`
- `app:update-status`

## Configuration Flow

1. App loads `.env` from data root via `loadEnvFile()` (only keys not already in `process.env`)
2. `loadConfig()` reads env vars and merges with DEFAULTS
3. Settings changes go through `writeEnvFile()` which writes to temp then renames (atomic)
4. After write, `reloadEnv()` refreshes `process.env` and pipeline context is invalidated

## Build & Run

```bash
npm run dev             # electron-vite dev (main + preload + renderer)
npm run build           # production build
npm run package:mac     # build + electron-builder for macOS
npm run package:win     # build + electron-builder for Windows
npm run package:linux   # build + electron-builder for Linux
npm run setup           # CLI setup wizard
```
