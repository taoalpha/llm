# llm

A lightweight, provider-agnostic CLI wrapper that auto-detects and delegates to your preferred LLM tool.

## Features

- **Zero Configuration**: Auto-detects installed LLM CLIs (OpenCode, Claude, Gemini, Codex, Ollama)
- **Transparent Proxy**: All flags and subcommands pass through to the underlying provider
- **Pipe Support**: Process output from other CLI tools
- **Cross-Platform**: Pre-built binaries for macOS, Linux, and Windows

## Installation

### For Humans

**Recommended install (installs Bun if missing)**
```bash
curl -fsSL https://raw.githubusercontent.com/taoalpha/llm/master/install | bash -s -- --install-runtime
```

**One-line install (macOS/Linux/Windows WSL)**
```bash
curl -fsSL https://raw.githubusercontent.com/taoalpha/llm/master/install | bash
```

**Specific version**
```bash
curl -fsSL https://raw.githubusercontent.com/taoalpha/llm/master/install | bash -s -- --version 0.0.1
```

**Windows (PowerShell) - recommended (installs Bun if missing)**
```powershell
powershell -c "irm https://raw.githubusercontent.com/taoalpha/llm/master/install.ps1 | iex; Install-Llm --install-runtime"
```

**Windows (PowerShell)**
```powershell
powershell -c "irm https://raw.githubusercontent.com/taoalpha/llm/master/install.ps1 | iex; Install-Llm"
```

Make sure `~/.local/bin` is in your PATH:
```bash
export PATH="$HOME/.local/bin:$PATH"
```

### For AI Agents

Add to your `AGENTS.md` or system prompt:

```markdown
## LLM CLI Tool

Install:
- `curl -fsSL https://raw.githubusercontent.com/taoalpha/llm/master/install | bash -s -- --install-runtime`

Use it to:
- Send prompts: `llm "your question here"`
- Pipe input: `cat file.txt | llm "summarize this"`
- Run provider commands: `llm session list`, `llm login`, etc.
- Switch providers: `llm --provider claude "hello"`
- Manage settings: `llm --self`

The tool auto-detects installed providers (opencode, claude, gemini, codex, ollama) and uses the first available one.
```

## Usage

```bash
# Send a prompt (uses default provider)
llm "Explain quantum computing"

# Pipe input
cat logs.txt | llm "Find errors in these logs"

# Provider subcommands pass through transparently
llm session list          # -> opencode session list
llm login                 # -> claude login
llm --version             # -> <provider> --version

# Force a specific provider
llm --provider claude "Hello"

# Manage llm settings (set default provider, install providers)
llm --self
```

## Supported Providers

| Provider | Command | Install |
|----------|---------|---------|
| OpenCode | `opencode` | `curl -fsSL https://opencode.ai/install | bash` |
| Claude | `claude` | `curl -fsSL https://claude.ai/install.sh | bash` |
| Gemini | `gemini` | `npm install -g @google/gemini-cli` |
| Codex | `codex` | `npm install -g @openai/codex` |
| Ollama | `ollama` | `curl -fsSL https://ollama.com/install.sh | sh` |

## npm Installation

Some providers (Gemini, Codex) require npm for installation. The LLM CLI will automatically detect if npm is missing and prompt you to install it.

### Termux/Android Support

For Termux on Android devices, you may need to install `node` and `npm` first:

```bash
# Install Node.js
pkg install nodejs-lts

# Install npm (if not included)
pkg install npm
```

After installing Node.js and npm, the LLM CLI will work normally with npm-based providers.

The tool auto-detects providers in the order listed above.

## Configuration

Run `llm --self` to open the interactive configuration menu where you can:
- Set a default provider
- View installed providers
- Get installation commands for new providers

Configuration is stored in `~/.config/llm-cli/config.json`.

## Flags

| Flag | Description |
|------|-------------|
| `--self` | Open the llm configuration menu |
| `--provider <name>` | Use a specific provider for this command |

All other flags are passed through to the underlying provider.

## Development

```bash
# Install dependencies
bun install

# Run in development
bun run dev

# Type check
bun run typecheck

# Build binary
bun run build

# Build for all platforms
bun run build:all
```

## Installer

The `install` script downloads the right zipped binary for the current OS/arch and installs it to `~/.local/bin/llm`.

## License

MIT
