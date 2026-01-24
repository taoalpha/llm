import { $ } from "bun";

export interface CommandArgs {
  rest: string;
  options: string[];
}

export type ProviderCommandHandler = (args: CommandArgs) => Promise<void>;

export interface ProviderCommands {
  run: ProviderCommandHandler;
}

export interface Provider {
  name: string;
  description: string;
  command: string;
  installHint: string;
  isInstalled(): Promise<boolean>;
  commands: ProviderCommands;
  forward(args: string[], pipeData?: string): Promise<void>;
}

/**
 * Split args into rest (prompt/content) and options (CLI flags like --model)
 */
export function splitArgs(args: string[]): CommandArgs {
  const options: string[] = [];
  const rest: string[] = [];

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg.startsWith("-")) {
      options.push(arg);
      if (!arg.includes("=") && i + 1 < args.length && !args[i + 1].startsWith("-")) {
        options.push(args[i + 1]);
        i += 2;
      } else {
        i += 1;
      }
    } else {
      rest.push(arg);
      i += 1;
    }
  }

  return { rest: rest.join(" "), options };
}

export function looksLikePrompt(args: string[]): boolean {
  if (args.length === 0) return false;
  
  for (const arg of args) {
    if (arg.includes(" ")) return true;
    if (arg.startsWith('"') || arg.startsWith("'")) return true;
    if (arg.includes("?")) return true;
    if (arg.includes("!")) return true;
    if (arg.includes("\n")) return true;
  }
  
  return false;
}

export function looksLikeSubcommand(arg: string): boolean {
  if (!arg || arg.startsWith("-")) return false;
  if (arg.includes(" ") || arg.includes("?") || arg.includes("!") || arg.includes("\n")) return false;
  if (arg.startsWith('"') || arg.startsWith("'")) return false;
  return true;
}

/**
 * Unified commands that llm intercepts and translates per-provider.
 * e.g., `llm run "prompt"` becomes `opencode run`, `claude -p`, `gemini -p`, etc.
 */
export const LLM_COMMANDS = ["run"] as const;
export type LLMCommand = (typeof LLM_COMMANDS)[number];

export function isLLMCommand(arg: string): arg is LLMCommand {
  return LLM_COMMANDS.includes(arg as LLMCommand);
}

/**
 * Check if a command exists in PATH
 */
export async function commandExists(cmd: string): Promise<boolean> {
  try {
    await $`which ${cmd}`.quiet();
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if npm is available
 */
export async function npmExists(): Promise<boolean> {
  return await commandExists("npm") || await commandExists("bunx") || await commandExists("npx");
}

/**
 * Spawn a process with full TTY inheritance (for interactive commands)
 */
export async function spawnInherit(cmd: string, args: string[]): Promise<void> {
  const proc = Bun.spawn([cmd, ...args], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  await proc.exited;
  process.exitCode = proc.exitCode ?? 0;
}

/**
 * Spawn a process with piped input
 */
export async function spawnWithInput(
  cmd: string,
  args: string[],
  input: string
): Promise<void> {
  const proc = Bun.spawn([cmd, ...args], {
    stdin: new TextEncoder().encode(input),
    stdout: "inherit",
    stderr: "inherit",
  });
  await proc.exited;
  process.exitCode = proc.exitCode ?? 0;
}
