import { Provider, commandExists, spawnInherit, looksLikePrompt } from "./base";

export const opencodeProvider: Provider = {
  name: "opencode",
  description: "OpenCode CLI",
  command: "opencode",
  installHint: "brew install opencode-ai/tap/opencode",

  async isInstalled() {
    return commandExists(this.command);
  },

  async forward(args: string[], pipeData?: string) {
    const isPrompt = pipeData || (args.length > 0 && looksLikePrompt(args));

    if (isPrompt) {
      const prompt = pipeData
        ? [...args, pipeData].filter(Boolean).join("\n")
        : args.join(" ");
      await spawnInherit(this.command, ["run", prompt]);
    } else {
      await spawnInherit(this.command, args);
    }
  },
};
