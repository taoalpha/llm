import { Provider, commandExists, spawnInherit, looksLikePrompt } from "./base";

export const codexProvider: Provider = {
  name: "codex",
  description: "OpenAI Codex CLI",
  command: "codex",
  installHint: "npm install -g @openai/codex",

  async isInstalled() {
    return commandExists(this.command);
  },

  async forward(args: string[], pipeData?: string) {
    const isPrompt = pipeData || (args.length > 0 && looksLikePrompt(args));

    if (isPrompt) {
      const prompt = pipeData
        ? [...args, pipeData].filter(Boolean).join("\n")
        : args.join(" ");
      await spawnInherit(this.command, [prompt]);
    } else {
      await spawnInherit(this.command, args);
    }
  },
};
