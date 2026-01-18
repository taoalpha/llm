import { Provider, commandExists, spawnInherit, looksLikePrompt } from "./base";

export const geminiProvider: Provider = {
  name: "gemini",
  description: "Gemini CLI by Google",
  command: "gemini",
  installHint: "npm install -g @google/gemini-cli",

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
