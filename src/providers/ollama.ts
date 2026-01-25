import { Provider, CommandArgs, commandExists, spawnInherit, looksLikePrompt, looksLikeSubcommand, splitArgs } from "./base";

const OLLAMA_COMMAND = "ollama";

export const ollamaProvider: Provider = {
  name: "ollama",
  description: "Ollama (Local LLMs)",
  command: OLLAMA_COMMAND,
  installHint: "curl -fsSL https://ollama.com/install.sh | sh",
  uninstallHint:
    "sudo systemctl stop ollama && sudo systemctl disable ollama && sudo rm /etc/systemd/system/ollama.service " +
    "&& sudo rm -r $(which ollama | tr 'bin' 'lib') && sudo rm $(which ollama) " +
    "&& sudo userdel ollama && sudo groupdel ollama && sudo rm -r /usr/share/ollama",

  async isInstalled() {
    return commandExists(this.command);
  },

  commands: {
    async run({ rest, options }: CommandArgs) {
      await spawnInherit(OLLAMA_COMMAND, ["run", "llama3", rest, ...options]);
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
