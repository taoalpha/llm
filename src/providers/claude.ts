import { Provider, CommandArgs, commandExists, spawnInherit, looksLikePrompt, looksLikeSubcommand, splitArgs } from "./base";

const CLAUDE_COMMAND = "claude";

export const claudeProvider: Provider = {
  name: "claude",
  description: "Claude Code CLI by Anthropic",
  command: CLAUDE_COMMAND,
  installHint: "curl -fsSL https://claude.ai/install.sh | bash",
  installHintWindows: "powershell -c \"irm https://claude.ai/install.ps1 | iex\"",
  uninstallHint: "rm -f ~/.local/bin/claude && rm -rf ~/.local/share/claude",
  uninstallHintWindows: "powershell -c \"Remove-Item -Force $env:LOCALAPPDATA\\claude.exe\"",

  async isInstalled() {
    return commandExists(this.command);
  },

  commands: {
    async run({ rest, options }: CommandArgs) {
      await spawnInherit(CLAUDE_COMMAND, ["-p", rest, ...options]);
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
