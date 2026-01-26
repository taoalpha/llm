import { spawn } from "node:child_process";

export type StdioMode = "inherit" | "ignore";

export interface SpawnCommandOptions {
  stdin?: StdioMode | Uint8Array;
  stdout?: StdioMode;
  stderr?: StdioMode;
  setExitCode?: boolean;
}

const WINDOWS_SHELL_EXCLUSIONS = new Set(["cmd", "cmd.exe", "powershell", "powershell.exe", "pwsh", "pwsh.exe"]);

function shouldUseWindowsShell(cmd: string): boolean {
  if (process.platform !== "win32") return false;
  if (WINDOWS_SHELL_EXCLUSIONS.has(cmd.toLowerCase())) return false;
  if (cmd.includes("/") || cmd.includes("\\")) return false;
  if (cmd.includes(".")) return false;
  return true;
}

function quoteForCmd(arg: string): string {
  const escaped = arg.replace(/\^/g, "^^").replace(/"/g, "^\"");
  if (escaped === "" || /[\s&|<>()]/.test(escaped)) {
    return `"${escaped}"`;
  }
  return escaped;
}

export async function spawnCommand(
  argv: string[],
  options: SpawnCommandOptions = {}
): Promise<number> {
  const [cmd, ...args] = argv;
  if (!cmd) {
    if (options.setExitCode !== false) {
      process.exitCode = 1;
    }
    return 1;
  }

  const stdinOption = options.stdin ?? "inherit";
  const stdoutOption = options.stdout ?? "inherit";
  const stderrOption = options.stderr ?? "inherit";
  const stdio: ("inherit" | "ignore" | "pipe")[] = [
    stdinOption instanceof Uint8Array ? "pipe" : stdinOption,
    stdoutOption,
    stderrOption,
  ];

  return await new Promise<number>((resolve) => {
    const useShell = shouldUseWindowsShell(cmd);
    const finalCmd = useShell ? "cmd.exe" : cmd;
    const finalArgs = useShell
      ? ["/d", "/s", "/c", [cmd, ...args].map(quoteForCmd).join(" ")]
      : args;
    const proc = spawn(finalCmd, finalArgs, { stdio });

    if (stdinOption instanceof Uint8Array) {
      proc.stdin?.write(stdinOption);
      proc.stdin?.end();
    }

    proc.on("error", () => {
      if (options.setExitCode !== false) {
        process.exitCode = 1;
      }
      resolve(1);
    });

    proc.on("close", (code: number | null) => {
      const exitCode = code ?? 0;
      if (options.setExitCode !== false) {
        process.exitCode = exitCode;
      }
      resolve(exitCode);
    });
  });
}
