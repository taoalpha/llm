import { spawn } from "node:child_process";

export type StdioMode = "inherit" | "ignore";

export interface SpawnCommandOptions {
  stdin?: StdioMode | Uint8Array;
  stdout?: StdioMode;
  stderr?: StdioMode;
  setExitCode?: boolean;
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
    const proc = spawn(cmd, args, { stdio });

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
