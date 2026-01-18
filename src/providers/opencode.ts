import { Provider, commandExists, spawnInherit, looksLikePrompt } from "./base";

function splitModelArgs(args: string[]): { modelArgs: string[]; promptArgs: string[] } {
  const modelArgs: string[] = [];
  const promptArgs: string[] = [];

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === "--model" && i + 1 < args.length) {
      modelArgs.push(arg, args[i + 1]);
      i += 2;
      continue;
    }

    if (arg.startsWith("--model=")) {
      modelArgs.push(arg);
      i += 1;
      continue;
    }

    promptArgs.push(arg);
    i += 1;
  }

  return { modelArgs, promptArgs };
}

export const opencodeProvider: Provider = {
  name: "opencode",
  description: "OpenCode CLI",
  command: "opencode",
  installHint: "brew install opencode-ai/tap/opencode",

  async isInstalled() {
    return commandExists(this.command);
  },

  async forward(args: string[], pipeData?: string) {
    const { modelArgs, promptArgs } = splitModelArgs(args);
    const isPrompt = pipeData || (promptArgs.length > 0 && looksLikePrompt(promptArgs));

    if (isPrompt) {
      const prompt = pipeData
        ? [...promptArgs, pipeData].filter(Boolean).join("\n")
        : promptArgs.join(" ");
      await spawnInherit(this.command, ["run", ...modelArgs, prompt]);
    } else {
      await spawnInherit(this.command, args);
    }
  },
};
