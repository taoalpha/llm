import { Provider, CommandArgs, commandExists, spawnInherit, looksLikePrompt, looksLikeSubcommand, splitArgs } from "./base";

const PI_COMMAND = "pi";

export const piProvider: Provider = {
  name: "pi",
  description: "Pi Coding Agent CLI",
  command: PI_COMMAND,
  installHint: "npm install -g @mariozechner/pi-coding-agent",
  installHintWindows: "npm install -g @mariozechner/pi-coding-agent",
  uninstallHint: "npm uninstall -g @mariozechner/pi-coding-agent",
  uninstallHintWindows: "npm uninstall -g @mariozechner/pi-coding-agent",

  async isInstalled() {
    return commandExists(this.command);
  },

  commands: {
    async run({ rest, options }: CommandArgs) {
      await spawnInherit(PI_COMMAND, ["-p", rest, ...options]);
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
