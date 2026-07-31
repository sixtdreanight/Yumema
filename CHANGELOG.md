# Changelog

> **Versioning note:** The `v1.0.0-beta.*` tags (beta.2 → beta.8, April–May 2026) belong to an
> early parallel release line that was superseded by the stable `0.x` series. Highlights from that
> line — shadcn/ui refactor, AI config GUI, sakura-pink theme, unified title bar, WeChat
> integration, avatar upload, and data reset — were folded into the stable `0.x` releases.
> Development follows `0.x`; the `v1.0.0-beta.*` tags are historical and no longer maintained.
> `package.json` reflects the latest stable `0.x` tag.

## Unreleased

Merged to `main` after the latest stable tag (v0.2.2), not yet released:

- **Mobile app**: standalone React Native app in `mobile/` (RNFS StorageAdapter, AsyncStorage KVStore, 8-step setup wizard, FlatList chat UI, dark mode, memory management)
- **Dependencies**: companion-engine bumped to `^0.5.0` (mutex file locks, circuit breaker, structured logging, API-key encryption infrastructure)
- **Reliability**: NapCatQQ auto-restart on crash (3 retries, 5s interval); friendly EADDRINUSE port-conflict error
- **CI**: electron-vite build step added for full type checking (main + preload + renderer)

## v0.2.2 (2026-06-05)

### Security Fixes
- **macOS hardening**: enable `hardenedRuntime` and `gatekeeperAssess` in `electron-builder.yml`
- **Shell injection**: replace `execSync` with `spawn(shell: false)` in `extractZip`
- **Renderer isolation**: explicit `nodeIntegration: false` and `sandbox: true`; add dev-mode CSP meta tag in `index.html`; remove unreferenced `chat:export` channel from the handler whitelist

### Documentation
- Complete `zh-Hant` and `ja` README translations
- Add community health files (`CODE_OF_CONDUCT.md`, `SECURITY.md`, `CONTRIBUTING.md`, `.editorconfig`) and GitHub issue/PR templates
- Split README into 4 languages (EN, zh-CN, zh-Hant, JA)

### CI
- Drop Node 18 from CI

## v0.2.1 (2026-05-24)

- **Refactor**: clean up `src/core/` — remove 21 duplicate source files and 3 test files + `stages/` already covered by companion-engine's 111 tests
- Delegate all core imports to the `@sixtdreamnight/companion-engine` package; `src/core/index.ts` kept as a thin re-export bridge
- Fix `QuickStartStep.tsx` import: `src/core/role-templates` → `companion-engine`
- Add CI workflow (`tsc --noEmit` + vitest on Node 18/20/22)

## v0.2.0 (2026-05-24)

### Security Fixes
- **macOS hardening**: `hardenedRuntime: true`, `gatekeeperAssess: true` in `electron-builder.yml`
- **Renderer sandbox**: `sandbox: true` in `webPreferences`
- **Crash logs**: stack traces sanitized (api_key, token, secret masked)
- **NapCatQQ download**: file size verification + SHA256 checksum validation (when provided)
- **Docker**: image digest pinning note in `wechat-manager.ts`

### Bug Fixes
- **Renderer import**: `QuickStartStep.tsx` now imports from local `src/core/role-templates` instead of npm package (fixes build)
- **Scheduler**: cron callbacks wrapped in try-catch
- **Config**: empty config updates rejected by Zod schema
- **IPC**: stale `chat:export` channel removed from handler allowlist
- **Channels**: handler-utils and preload channel lists synchronized

## v0.1.1 (2026-05-23)
- Security audit fixes

## v0.1.0 (2026-05-16)
- Initial Electron build with AI companion engine
