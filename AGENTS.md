# AGENTS.md

Guidelines for AI agents working on this repository.

## Project Overview

This repo ships `llm`, a provider-agnostic CLI wrapper built with Node.js + TypeScript (Bun-compatible runtime). It auto-detects installed LLM CLIs (OpenCode, Claude, Gemini, Codex, Ollama) and proxies commands or prompts to the active provider.

**Tech Stack**: Node.js, TypeScript, @clack/prompts, conf, picocolors.

## Build / Lint / Test Commands

### Build
```bash
# Local build (current OS)
npm run build:node

# All platforms
npm run build:node
```

### Typecheck (primary “lint”)
```bash
npm run typecheck
```

### Tests
There is no automated test suite. Use manual CLI checks:
```bash
# Basic prompt
npm run dev "hello"

# Pipe input
printf "hello" | npm run dev "count words"

# Proxy subcommand
npm run dev --version
npm run dev session list

# Config UI
npm run dev --self
```

### Single-test equivalent
No test runner exists. Validate a single behavior by running the specific CLI flow you changed (examples above).

## Installer

The `install` script downloads the correct zipped binary for the current OS/arch and installs to `~/.local/bin/llm`.
```bash
curl -fsSL https://raw.githubusercontent.com/taoalpha/llm/master/install | bash
```

## Repository Structure

```
./
├── src/                # TypeScript source
│   ├── index.ts        # CLI entry + dispatch
│   ├── config.ts       # conf-based settings
│   ├── ui/setup.ts     # --self TUI
│   └── providers/      # Provider adapters + registry
├── install             # Installer script (zip-based)
├── README.md
└── package.json
```

## Provider Behavior

- `llm --self` opens the management TUI (set default provider, install hints).
- `llm --provider <name> …` forces a provider for that call.
- Any other flags/args are passed through to the provider unless the adapter decides it is a prompt.
- Prompt vs subcommand is determined by heuristics in `src/providers/base.ts`.

## Code Style Guidelines

### General
- Keep the CLI thin: prefer small, focused adapters over large abstractions.
- Do not introduce new dependencies without user approval.
- Avoid refactors during bugfixes; change only what is required.

### TypeScript Conventions
- **Types**: Use explicit types for public APIs and exported functions.
- **Nullability**: Use `undefined` for optional values; avoid `null` unless required by external API.
- **Async**: Use `async/await`; avoid raw `.then` chains.
- **Errors**: Catch and display actionable errors; do not swallow errors.
- **Imports**: Use ESM syntax; keep imports grouped by source (builtins, external, internal).

### Naming
- **Functions**: `camelCase` verbs (e.g., `detectProvider`, `readStdin`).
- **Types/Interfaces**: `PascalCase` nouns (e.g., `Provider`, `LLMConfig`).
- **Constants**: `UPPER_SNAKE_CASE` only for true constants or config-like values.
- **Files**: `kebab-case` is not used; follow existing filenames.

### Formatting
- 2-space indentation in JSON and YAML.
- 2-space indentation in TypeScript (default TS formatting).
- Keep lines readable; no strict max length but avoid >120 unless necessary.

### Error Handling
- Prefer early returns with clear messages (`pc.red`, `p.log.error`).
- Preserve exit codes from spawned processes.
- Avoid hidden side-effects in error flows.

### Process Execution
- Use `spawnCommand` with `stdin/stdout/stderr: "inherit"` for proxy behavior.
- Do not capture output unless required for logic.

## Configuration

Configuration is stored via `conf` in:
- `~/.config/llm-cli/config.json` (projectSuffix is empty by design).

Do not store secrets in config unless explicitly requested.

## Release Notes

- Releases are tagged via `v<package.json version>`.
- Zipped binaries only (raw binaries are removed from release assets).
- Manual release workflow exists in `.github/workflows/release.yml`.

## Workflow / CI

No CI is enforced besides the manual release workflow. Run `npm run typecheck` before shipping.

## Cursor / Copilot Rules

No `.cursor/rules`, `.cursorrules`, or `.github/copilot-instructions.md` found.

## Agent Notes

- Update AGENTS.md when architecture or commands change.
- Keep README installation instructions in sync with the `install` script.
- When modifying providers, update `src/providers/index.ts` order if needed.
