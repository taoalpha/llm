import { Provider, commandExists, spawnInherit, looksLikePrompt } from "./base";

export const claudeProvider: Provider = {
  name: "claude",
  description: "Claude Code CLI by Anthropic",
  command: "claude",
  installHint: "npm install -g @anthropic-ai/claude-code",

  async isInstalled() {
    return commandExists(this.command);
  },

  async forward(args: string[], pipeData?: string) {
    const isPrompt = pipeData || (args.length > 0 && looksLikePrompt(args));

    if (isPrompt) {
      const prompt = pipeData
        ? [...args, pipeData].filter(Boolean).join("\n")
        : args.join(" ");
      await spawnInherit(this.command, ["-p", prompt]);
    } else {
      await spawnInherit(this.command, args);
    }
  },
};
