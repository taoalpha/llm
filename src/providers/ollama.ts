import { Provider, commandExists, spawnInherit, looksLikePrompt } from "./base";

const OLLAMA_SUBCOMMANDS = ["run", "list", "pull", "push", "create", "show", "cp", "rm", "serve", "ps", "stop"];

export const ollamaProvider: Provider = {
  name: "ollama",
  description: "Ollama (Local LLMs)",
  command: "ollama",
  installHint: "brew install ollama",

  async isInstalled() {
    return commandExists(this.command);
  },

  async forward(args: string[], pipeData?: string) {
    const firstArg = args[0];
    const isSubcommand = firstArg && OLLAMA_SUBCOMMANDS.includes(firstArg);
    const isPrompt = !isSubcommand && (pipeData || (args.length > 0 && looksLikePrompt(args)));

    if (isPrompt) {
      const prompt = pipeData
        ? [...args, pipeData].filter(Boolean).join("\n")
        : args.join(" ");
      await spawnInherit(this.command, ["run", "llama3", prompt]);
    } else {
      await spawnInherit(this.command, args);
    }
  },
};
