#!/usr/bin/env bun

import pc from "picocolors";
import { getDefaultProvider } from "./config";
import { getProvider, detectProvider } from "./providers";
import { runSelfUI } from "./ui/setup";

const VERSION = "0.0.2";

/**
 * Parse and extract llm-specific flags from argv
 * Returns: { provider, self, passthrough }
 */
function parseArgs(argv: string[]): {
  provider: string | undefined;
  self: boolean;
  passthrough: string[];
} {
  let provider: string | undefined;
  let self = false;
  const passthrough: string[] = [];

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    if (arg === "--self") {
      self = true;
      i++;
    } else if (arg === "--provider") {
      provider = argv[i + 1];
      i += 2;
    } else if (arg.startsWith("--provider=")) {
      provider = arg.split("=")[1];
      i++;
    } else {
      // Everything else is passthrough
      passthrough.push(arg);
      i++;
    }
  }

  return { provider, self, passthrough };
}

/**
 * Read all stdin if piped
 */
async function readStdin(): Promise<string | undefined> {
  // Check if stdin is a TTY (interactive terminal)
  if (process.stdin.isTTY) {
    return undefined;
  }

  // Read piped input
  const chunks: Uint8Array[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const buffer = Buffer.concat(chunks);
  return buffer.toString("utf-8").trim();
}

async function main() {
  // Skip "bun" and script path
  const rawArgs = process.argv.slice(2);
  const { provider: providerFlag, self, passthrough } = parseArgs(rawArgs);

  // Handle --self (internal management)
  if (self) {
    await runSelfUI();
    return;
  }

  // Resolve the active provider
  let activeProvider;

  if (providerFlag) {
    // Explicit --provider flag
    activeProvider = getProvider(providerFlag);
    if (!activeProvider) {
      console.error(pc.red(`Error: Unknown provider "${providerFlag}"`));
      console.error(pc.dim("Available: opencode, claude, gemini, codex, ollama"));
      process.exit(1);
    }
    if (!(await activeProvider.isInstalled())) {
      console.error(pc.red(`Error: Provider "${providerFlag}" is not installed`));
      console.error(pc.dim(`Install with: ${activeProvider.installHint}`));
      process.exit(1);
    }
  } else {
    // Check config for default, then auto-detect
    const defaultName = getDefaultProvider();
    if (defaultName) {
      activeProvider = getProvider(defaultName);
      if (!activeProvider || !(await activeProvider.isInstalled())) {
        console.error(pc.yellow(`Warning: Default provider "${defaultName}" is not available, auto-detecting...`));
        activeProvider = await detectProvider();
      }
    } else {
      activeProvider = await detectProvider();
    }
  }

  if (!activeProvider) {
    console.error(pc.red("Error: No LLM provider found."));
    console.error(pc.dim("Run 'llm --self' to set up a provider."));
    process.exit(1);
  }

  // Read piped input if available
  const pipeData = await readStdin();

  // Forward to the active provider
  await activeProvider.forward(passthrough, pipeData);
}

main().catch((err) => {
  console.error(pc.red("Fatal error:"), err.message);
  process.exit(1);
});
