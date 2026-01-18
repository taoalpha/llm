import { $ } from "bun";

export interface Provider {
  /** Unique identifier for the provider */
  name: string;
  /** Human-readable description */
  description: string;
  /** The CLI command name */
  command: string;
  /** Installation instructions */
  installHint: string;
  /** Check if this provider's CLI is installed */
  isInstalled(): Promise<boolean>;
  /** 
   * Forward args to the underlying CLI.
   * @param args - Raw arguments to pass through
   * @param pipeData - Optional piped input from stdin
   */
  forward(args: string[], pipeData?: string): Promise<void>;
}

/**
 * Default heuristic to detect if args look like a prompt vs a subcommand
 */
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
