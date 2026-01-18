# AGENTS.md

Guidelines for AI agents working on this repository.

## Project Overview

This repository contains `llm`, a lightweight, LLM-agnostic bash CLI wrapper that auto-detects and delegates to various LLM tools. It supports multiple backends including OpenCode, Claude, Gemini, Codex, Ollama, and any OpenAI-compatible API.

**Tech Stack**: Pure Bash (no additional languages or frameworks)

### Supported Backends (Priority Order)
1. **opencode** - OpenCode CLI
2. **claude** - Anthropic's Claude Code CLI
3. **gemini** - Google's Gemini CLI
4. **codex** - OpenAI Codex CLI
5. **ollama** - Local Ollama
6. **custom** - Any OpenAI-compatible API (e.g., localhost:8000)

---

## Build / Lint / Test Commands

This is a simple bash script project with no build system, package manager, or formal test suite.

```bash
# Validate bash syntax
bash -n llm

# Run ShellCheck (if installed) - RECOMMENDED before committing
shellcheck llm

# Manual execution test
./llm "Hello, how are you?"
echo "test input" | ./llm -p "analyze this"
./llm "describe this image" -f /path/to/image.png
```

### No Formal Tests
There is no automated test suite. Test changes manually by running the script with various inputs:
- Direct text argument
- Piped input from stdin
- Image file attachment (`-f` flag)
- Different backends (`-b opencode`, `-b ollama`, etc.)

---

## Architecture

The script uses a **modular adapter pattern** to support multiple LLM backends.

### Auto-Detection
On startup (if no `-b` flag), the script probes for installed tools in priority order:
```
opencode → claude → gemini → codex → ollama → custom (curl+jq)
```

### Backend Adapters
Each backend has a dedicated function (`call_opencode`, `call_claude`, etc.) that:
1. Receives standardized arguments: `model`, `prompt`, `image_file`
2. Translates them to the backend's specific CLI flags
3. Returns the LLM response to stdout

### Adding a New Backend
To add support for a new LLM tool:

1. **Add detection** in `detect_backend()`:
   ```bash
   elif command -v newtool &>/dev/null; then
       echo "newtool"
   ```

2. **Create adapter function**:
   ```bash
   call_newtool() {
       local model="$1"
       local prompt="$2"
       local image="$3"
       # Map to newtool's CLI flags
       newtool --prompt "$prompt"
   }
   ```

3. **Add to dispatcher** (case statement at bottom):
   ```bash
   newtool) call_newtool "$MODEL" "$FULL_PROMPT" "$IMAGE_FILE" ;;
   ```

4. **Update validation** (valid backends list)

5. **Document** in help text and AGENTS.md

---

## Code Style Guidelines

### Bash Script Conventions

Follow the patterns established in the existing `llm` script.

#### Shebang & Header
```bash
#!/bin/bash

# Script Name / Purpose
# 
# Brief description of what this script does.
#
# Usage:
#   example command usage
```

#### Variable Naming
- **UPPERCASE** for global/exported variables and constants
- **lowercase** for local variables (in functions)
- Use descriptive names: `IMAGE_FILE` not `IMG`

```bash
# Good
PROMPT="Summarize the following:"
MODEL="gpt-5.2"
IMAGE_FILE=""

# Avoid
p="prompt"
m="model"
```

#### Quoting
- **Always quote variables**: `"$VAR"` not `$VAR`
- Use `"${VAR}"` when concatenating or to avoid ambiguity
- Quote command substitutions: `"$(command)"`

```bash
# Good
echo "$FULL_PROMPT"
INPUT="$CMD_INPUT"
RESPONSE=$(curl -s "http://127.0.0.1:8000/v1/chat/completions")

# Bad
echo $FULL_PROMPT
```

#### Conditionals
- Use `[[ ]]` for conditionals (bash-specific, safer)
- Use `-n` for non-empty, `-z` for empty string checks
- Use `&&` and `||` for chaining

```bash
# Preferred
if [[ -n "$CMD_INPUT" ]]; then
    INPUT="$CMD_INPUT"
elif [[ ! -t 0 ]]; then
    INPUT=$(cat)
fi

# One-liners with short-circuit
[[ -n $LLM_BACKEND ]] && echo "Backend: $LLM_BACKEND"
```

#### Argument Parsing
Use `while` with `case` for argument parsing:

```bash
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -p|--prompt) PROMPT="$2"; shift ;; 
        -m|--model) MODEL="$2"; shift ;; 
        -f|--file) IMAGE_FILE="$2"; shift ;; 
        *) CMD_INPUT="${CMD_INPUT}${CMD_INPUT:+ }$1" ;; 
    esac
    shift
done
```

#### Error Handling
- Check for required files before use
- Provide helpful error messages with usage hints
- Exit with non-zero status on errors

```bash
if [[ ! -f "$IMAGE_FILE" ]]; then
    echo "Error: File $IMAGE_FILE not found."
    exit 1
fi
```

#### Exit Codes
- `0` = success
- `1` = general error (file not found, invalid input, API error)

#### Comments
- Use `#` comments to explain non-obvious logic
- Add section headers for major blocks

---

## Formatting

- **Indentation**: 4 spaces (no tabs)
- **Line length**: No strict limit, but aim for readability
- **Blank lines**: Separate logical sections with one blank line
- **Semicolons**: Use `;` before `;;` in case statements for consistency

---

## External Dependencies

The script requires these tools to be available:
- `jq` - JSON processing (required for `custom` backend)
- `curl` - HTTP requests (required for `custom` backend)
- `base64` - Image encoding (for multimodal with `custom` backend)
- `file` - MIME type detection (for multimodal with `custom` backend)

For other backends, only the respective CLI tool needs to be installed.

---

## API Integration

The script communicates with a local LLM proxy at `http://127.0.0.1:8000`. The payload follows OpenAI-compatible format:

```json
{
  "model": "gpt-5.2",
  "responses_tools": [{"type": "web_search"}],
  "responses_tool_choice": "auto",
  "messages": [{"role": "user", "content": "..."}]
}
```

When modifying API calls:
- Use `jq -n` with `--arg` for safe JSON construction (prevents injection)
- Never construct JSON via string concatenation
- Handle API errors gracefully (check for "null" responses)

---

## Common Patterns

### Reading from Stdin or Arguments
```bash
if [[ -n "$CMD_INPUT" ]]; then
    INPUT="$CMD_INPUT"
elif [[ ! -t 0 ]]; then
    INPUT=$(cat)
fi
```

### Multimodal Payloads
For image support, encode as base64 data URL:
```bash
MIME_TYPE=$(file --mime-type -b "$IMAGE_FILE")
B64_DATA=$(base64 -i "$IMAGE_FILE")
# Then construct: "data:$MIME_TYPE;base64,$B64_DATA"
```

---

## Git Workflow

- **Commit messages**: Use imperative mood ("Add feature" not "Added feature")
- **No CI/CD**: No automated pipelines - run `shellcheck` locally before committing
- **Branch strategy**: Not specified - assume trunk-based development

---

## Troubleshooting

If the script fails:
1. Check that the local LLM proxy is running at `http://127.0.0.1:8000`
2. Verify `jq` is installed: `which jq`
3. Test API connectivity: `curl -s http://127.0.0.1:8000/v1/models`

---

## Agent-Specific Notes

When working on this codebase as an AI agent:

1. **Keep it simple** - This is intentionally a minimal bash script. Don't over-engineer.
2. **Test manually** - No test suite exists. Verify changes work via command line.
3. **Preserve compatibility** - Maintain backward compatibility with existing usage patterns.
4. **Quote everything** - Bash quoting issues are the #1 source of bugs.
5. **Use ShellCheck** - Run `shellcheck llm` to catch common bash pitfalls.
