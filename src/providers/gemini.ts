import { Provider, CommandArgs, commandExists, spawnInherit, looksLikePrompt, looksLikeSubcommand, splitArgs } from "./base";

const GEMINI_COMMAND = "gemini";

export const geminiProvider: Provider = {
  name: "gemini",
  description: "Gemini CLI by Google",
  command: GEMINI_COMMAND,
  installHint: "npm install -g @google/gemini-cli",
  uninstallHint: "npm uninstall -g @google/gemini-cli",

  async isInstalled() {
    return commandExists(this.command);
  },

  commands: {
    async run({ rest, options }: CommandArgs) {
      await spawnInherit(GEMINI_COMMAND, ["-p", rest, ...options]);
    },
  },

  async forward(args: string[], pipeData?: string) {
    const firstArg = args[0];
    const isSubcommand = firstArg && looksLikeSubcommand(firstArg);

    if (isSubcommand) {
      if (pipeData) {
        const restArgs = args.slice(1);
        const fullArgv = [...restArgs, pipeData].filter(Boolean).join("\n");
        await spawnInherit(this.command, [firstArg, fullArgv]);
      } else {
        await spawnInherit(this.command, args);
      }
      return;
    }

    const isPrompt = pipeData || (args.length > 0 && looksLikePrompt(args));

    if (isPrompt) {
      const { rest, options } = splitArgs(args);
      const fullArgv = pipeData ? [rest, pipeData].filter(Boolean).join("\n") : rest;
      await this.commands.run({ rest: fullArgv, options });
    } else {
      await spawnInherit(this.command, args);
    }
  },
};
