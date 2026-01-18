import * as p from "@clack/prompts";
import pc from "picocolors";
import { getDefaultProvider, setDefaultProvider, clearDefaultProvider, getConfigPath } from "../config";
import { providers, getProvidersWithStatus, detectProvider, getProvider } from "../providers";

/**
 * The --self TUI: Interactive management for the llm wrapper
 */
export async function runSelfUI(): Promise<void> {
  p.intro(pc.cyan(`
   █   █     █   █
   █   █     ██ ██
   █   █     █ █ █
   ███ ███   █   █ ${pc.dim("v0.0.1")}
  `));

  while (true) {
    const currentDefault = getDefaultProvider();
    const providersWithStatus = await getProvidersWithStatus();
    const installedProviders = providersWithStatus.filter((item) => item.installed);
    const autoDetected = await detectProvider();

    p.note(
      [
        `${pc.blue("Config Path:")}      ${getConfigPath()}`,
        `${pc.blue("Default Provider:")} ${currentDefault ? pc.green(currentDefault) : pc.magenta("Auto-detect")}`,
        `${pc.blue("System Detected:")}  ${autoDetected ? pc.cyan(autoDetected.name) : pc.red("None")}`,
      ].join("\n"),
      "System Status"
    );

    const action = await p.select({
      message: "Main Menu",
      options: [
        { value: "set-default", label: "Set Default Provider" },
        { value: "install", label: "Install Provider" },
        { value: "list", label: "List Available Providers" },
        { value: "exit", label: "Exit" },
      ],
    });

    if (p.isCancel(action) || action === "exit") {
      p.outro(pc.dim("Goodbye!"));
      return;
    }

    if (action === "set-default") {
      await handleSetDefault(installedProviders, currentDefault);
    } else if (action === "list") {
      await handleListProviders(providersWithStatus, currentDefault);
    } else if (action === "install") {
      await handleInstallProvider(providersWithStatus);
    }
  }
}

async function handleSetDefault(
  installed: Array<{ provider: { name: string; description: string }; installed: boolean }>,
  currentDefault: string | undefined
): Promise<void> {
  if (installed.length === 0) {
    p.log.warn("No providers installed. Please install one first.");
    return;
  }

  const options = [
    { value: "back", label: pc.dim("← Back to Main Menu") },
    { value: "__auto__", label: `${pc.magenta("Auto-detect")} ${pc.dim("(Use first available)")}` },
    ...installed.map((item) => ({
      value: item.provider.name,
      label: `${item.provider.name} ${pc.dim(`- ${item.provider.description}`)}`,
    })),
  ];

  const choice = await p.select({
    message: "Select default provider:",
    options,
    initialValue: currentDefault ?? "__auto__",
  });

  if (p.isCancel(choice) || choice === "back") return;

  if (choice === "__auto__") {
    clearDefaultProvider();
    p.log.success("Default set to auto-detect");
  } else {
    setDefaultProvider(choice as string);
    p.log.success(`Default set to ${pc.cyan(choice as string)}`);
  }
}

async function handleListProviders(
  providersWithStatus: Array<{ provider: { name: string; description: string; installHint: string }; installed: boolean }>,
  currentDefault: string | undefined
): Promise<void> {
  const lines: string[] = [];

  for (const { provider, installed } of providersWithStatus) {
    const status = installed ? pc.green("✓ Installed") : pc.dim("○ Not installed");
    const isDefault = provider.name === currentDefault ? pc.yellow(" (default)") : "";
    lines.push(`  ${pc.bold(provider.name)}${isDefault}`);
    lines.push(`    ${pc.dim(provider.description)}`);
    lines.push(`    ${status}`);
    if (!installed) {
      lines.push(`    ${pc.dim(`Install: ${provider.installHint}`)}`);
    }
    lines.push("");
  }

  p.note(lines.join("\n"), "Providers");
  
  await p.select({
    message: "Navigation",
    options: [{ value: "back", label: "Back to Main Menu" }]
  });
}

async function handleInstallProvider(
  providersWithStatus: Array<{ provider: { name: string; description: string; installHint: string }; installed: boolean }>
): Promise<void> {
  const notInstalled = providersWithStatus.filter((p) => !p.installed);

  if (notInstalled.length === 0) {
    p.log.success("All providers are already installed!");
    return;
  }

  const choice = await p.select({
    message: "Select a provider to install:",
    options: [
      { value: "back", label: pc.dim("← Back to Main Menu") },
      ...notInstalled.map(({ provider }) => ({
        value: provider.name,
        label: `${provider.name} ${pc.dim(`- ${provider.description}`)}`,
        hint: provider.installHint,
      })),
    ],
  });

  if (p.isCancel(choice) || choice === "back") return;

  const provider = notInstalled.find((p) => p.provider.name === choice)?.provider;
  if (!provider) return;

  p.log.info(`To install ${pc.cyan(provider.name)}, run:`);
  p.log.message(pc.bold(provider.installHint));

  const shouldRun = await p.confirm({
    message: "Run installation command now?",
    initialValue: false,
  });

  if (p.isCancel(shouldRun) || !shouldRun) {
    p.log.info("Installation skipped.");
    return;
  }

  p.log.step(`Running: ${provider.installHint}`);
  
  const proc = Bun.spawn(["sh", "-c", provider.installHint], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  
  await proc.exited;
  
  if (proc.exitCode === 0) {
    p.log.success(`${provider.name} installed successfully!`);
  } else {
    p.log.error(`Installation failed with exit code ${proc.exitCode}`);
  }
}
