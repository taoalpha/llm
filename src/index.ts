#!/usr/bin/env bun

import pc from "picocolors";
import pkg from "../package.json";
import { getDefaultProvider, getUpdateCheckIntervalMs, getUpdateCheckLastAt, setUpdateCheckLastAt } from "./config";
import { getProvider, detectProvider } from "./providers";
import { isLLMCommand, splitArgs, npmExists, getInstallHint } from "./providers/base";
import { runSelfUI } from "./ui/setup";

const VERSION = pkg.version;

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
async function promptInstallNpm(): Promise<boolean> {
  console.log(pc.yellow("npm is required to install this provider."));
        const answer = await new Promise<boolean>((resolve) => {
    process.stdin.setEncoding("utf8");
    process.stdin.resume();
    process.stdout.write("Install npm now? [Y/n]: ");
    
    process.stdin.once("data", (data) => {
      const input = data.toString().trim().toLowerCase();
      resolve(input === "y" || input === "yes" || input === "");
    });
  });
  
  return answer;
}

async function installNpm(): Promise<void> {
  const npmInstallCommands = [
    "curl -fsSL https://raw.githubusercontent.com/npm/cli/v10.9.2/scripts/install.sh | sh",
    "curl -o- https://npmjs.org/install.sh | sh",
    "wget -qO- https://npmjs.org/install.sh && sh install.sh"
  ];
  
  for (const cmd of npmInstallCommands) {
    try {
      const proc = Bun.spawn(["sh", "-c", cmd], {
        stdout: "inherit",
        stderr: "inherit",
      });
      await proc.exited;
      
      if (proc.exitCode === 0) {
        return;
      }
    } catch {
      continue;
    }
  }
}

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

async function maybeAutoUpdate(): Promise<void> {
  const now = Date.now();
  const lastChecked = getUpdateCheckLastAt();
  const intervalMs = getUpdateCheckIntervalMs() ?? 6 * 60 * 60 * 1000;

  if (lastChecked && now - lastChecked < intervalMs) {
    return;
  }

  setUpdateCheckLastAt(now);

  const updateCommand = process.platform === "win32"
    ? ["powershell", "-c", "irm https://raw.githubusercontent.com/taoalpha/llm/master/install.ps1 | iex; Install-Llm"]
    : ["sh", "-c", "curl -fsSL https://raw.githubusercontent.com/taoalpha/llm/master/install | bash"];
  const proc = Bun.spawn(updateCommand, {
    stdin: "ignore",
    stdout: "ignore",
    stderr: "ignore",
  });

  await proc.exited;
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
      
      // Check if we need npm for this provider
      const needsNpm = getInstallHint(activeProvider).startsWith("npm install");
      if (needsNpm && !npmExists()) {
        console.error(pc.yellow("Note: npm is not detected on your system."));
        console.error(pc.dim("npm is required to install this provider."));
        
        const shouldInstallNpm = await promptInstallNpm();
        if (!shouldInstallNpm) {
          console.error(pc.dim("Installation cancelled. Please install npm manually and try again."));
          process.exit(1);
        }
        
        // Try to install npm
        console.log(pc.cyan("Installing npm..."));
        await installNpm();
        
        // Verify npm installation
        if (!npmExists()) {
          console.error(pc.red("npm installation failed. Please install npm manually."));
          process.exit(1);
        }
        
        console.log(pc.green("npm installed successfully!"));
      }
      
      console.error(pc.dim(`Install with: ${getInstallHint(activeProvider)}`));
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
    console.log(pc.yellow("No LLM providers found. Opening setup..."));
    await runSelfUI();
    return;
  }

  // Read piped input if available
  const pipeData = await readStdin();

  void maybeAutoUpdate();

  // Handle unified llm commands (e.g., `llm run "prompt"`)
  const firstArg = passthrough[0];
  if (firstArg && isLLMCommand(firstArg)) {
    const restArgs = passthrough.slice(1);
    const { rest, options } = splitArgs(restArgs);
    const finalRest = pipeData ? [rest, pipeData].filter(Boolean).join("\n") : rest;
    await activeProvider.commands.run({ rest: finalRest, options });
    return;
  }

  // Forward to the active provider
  await activeProvider.forward(passthrough, pipeData);
}

main().catch((err) => {
  console.error(pc.red("Fatal error:"), err.message);
  process.exit(1);
});
