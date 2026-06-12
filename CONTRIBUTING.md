# Contributing to Yumema (梦间)

Thank you for your interest in contributing!

## Ways to Contribute

- **Bug reports**: Use the [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) template
- **Feature requests**: Use the [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md) template
- **Code**: Fork, branch, commit, open a PR
- **Translations**: Help translate README and docs to more languages
- **Testing**: Run the app and report issues

## Development Setup

```bash
git clone https://github.com/sixtdreanight/Yumema.git
cd Yumema
npm install
npm run dev
```

See [docs/development.md](docs/development.md) for detailed setup.

**Mobile app** (see `mobile/` directory):
```bash
cd mobile
npm install
npx react-native run-ios    # or run-android
```

## Commit Convention

```
<type>: <description>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`, `security`

## Pull Request Process

1. Ensure CI passes (`npm run build` + `npm test`)
2. Update CHANGELOG.md if applicable
3. Describe what changed and why in the PR description

## Code Style

- TypeScript strict mode
- React function components + hooks
- No `console.log` — use the logger from `@sixtdreamnight/companion-engine`
- Prefer immutable patterns
- Write tests for new functionality

## Project Structure

See [docs/architecture.md](docs/architecture.md) for the full architecture overview.

## Questions?

Open an issue or email erk163@163.com.
