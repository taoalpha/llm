import * as p from "@clack/prompts";
import pc from "picocolors";
import pkg from "../../package.json";
import { getDefaultProvider, setDefaultProvider, clearDefaultProvider, getConfigPath } from "../config";
import { getProvidersWithStatus, detectProvider } from "../providers";
import { npmExists, getInstallHint, getUninstallHint, getShellCommand } from "../providers/base";
import { spawnCommand } from "../process";
import type { Provider } from "../providers/base";

// Ask about oh-my-opencode installation after OpenCode setup
async function askAboutOhMyOpenCode(): Promise<void> {
  const shouldInstall = await p.confirm({
    message: "Would you also like to install 'oh-my-opencode' for enhanced agent orchestration?",
    initialValue: true,
  });

  if (p.isCancel(shouldInstall)) {
    p.log.info("Skipping oh-my-opencode installation.");
    return;
  }

  if (!shouldInstall) {
    p.log.info("You can install it later with: npm install -g oh-my-opencode");
    return;
  }

  p.log.step("Installing oh-my-opencode...");
  const installCommand = "npm install -g oh-my-opencode";
  
  const exitCode = await spawnCommand(["sh", "-c", installCommand], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    setExitCode: false,
  });

  if (exitCode === 0) {
    p.log.success("oh-my-opencode installed successfully!");
    p.log.info("Run 'oh-my-opencode' to start the enhanced agent orchestrator.");
  } else {
    p.log.error(`oh-my-opencode installation failed with exit code ${exitCode}`);
  }
}

function compareVersions(a: string, b: string): number {
  const aParts = a.split(".").map((part) => Number(part));
  const bParts = b.split(".").map((part) => Number(part));
  const length = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < length; i += 1) {
    const aVal = aParts[i] ?? 0;
    const bVal = bParts[i] ?? 0;
    if (aVal > bVal) return 1;
    if (aVal < bVal) return -1;
  }

  return 0;
}

async function getLatestVersion(): Promise<string | undefined> {
  const response = await fetch("https://api.github.com/repos/taoalpha/llm/releases/latest");
  if (!response.ok) return undefined;
  const data = (await response.json()) as { tag_name?: string };
  if (!data.tag_name) return undefined;
  return data.tag_name.replace(/^v/, "");
}

async function runUpdate(): Promise<boolean> {
  p.log.step("Running installer...");
  const updateCommand = process.platform === "win32"
    ? ["powershell", "-c", "irm https://raw.githubusercontent.com/taoalpha/llm/master/install.ps1 | iex; Install-Llm"]
    : ["sh", "-c", "curl -fsSL https://raw.githubusercontent.com/taoalpha/llm/master/install | bash"];
  const exitCode = await spawnCommand(updateCommand, {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    setExitCode: false,
  });
  return exitCode === 0;
}

export async function runSelfUI(): Promise<void> {
  p.intro(pc.cyan(`
   █   █     █   █
   █   █     ██ ██
   █   █     █ █ █
   ███ ███   █   █ ${pc.dim(`v${pkg.version}`)}
  `));

  while (true) {
    const currentDefault = getDefaultProvider();
    const providersWithStatus = await getProvidersWithStatus();
    const installedProviders = providersWithStatus.filter((item) => item.installed);
    const autoDetected = await detectProvider();

    let latestVersion: string | undefined;
    try {
      latestVersion = await getLatestVersion();
    } catch {
      latestVersion = undefined;
    }

    const updateAvailable =
      latestVersion && compareVersions(latestVersion, pkg.version) > 0 ? latestVersion : undefined;

    p.note(
      [
        `${pc.blue("Config Path:")}      ${getConfigPath()}`,
        `${pc.blue("Default Provider:")} ${currentDefault ? pc.green(currentDefault) : pc.magenta("Auto-detect")}`,
        `${pc.blue("System Detected:")}  ${autoDetected ? pc.cyan(autoDetected.name) : pc.red("None")}`,
        `${pc.blue("Update Available:")} ${updateAvailable ? pc.green(`v${updateAvailable}`) : pc.dim("None")}`,
      ].join("\n"),
      "System Status"
    );

    const options = [
      { value: "set-default", label: "Set Default Provider" },
      { value: "install", label: "Install Provider" },
      { value: "uninstall", label: "Uninstall Provider" },
      { value: "list", label: "List Available Providers" },
    ];

    if (updateAvailable) {
      options.unshift({ value: "update", label: `Update to v${updateAvailable}` });
    }

    options.push({ value: "exit", label: "Exit" });

    const action = await p.select({
      message: "Main Menu",
      options,
    });

    if (p.isCancel(action) || action === "exit") {
      p.outro(pc.dim("Goodbye!"));
      return;
    }

    if (action === "update") {
      if (!updateAvailable) continue;
      const ok = await runUpdate();
      if (ok) {
        p.log.success(`Updated to v${updateAvailable}`);
      } else {
        p.log.error("Update failed");
      }
    } else if (action === "set-default") {
      await handleSetDefault(installedProviders, currentDefault);
    } else if (action === "list") {
      await handleListProviders(providersWithStatus, currentDefault);
    } else if (action === "install") {
      await handleInstallProvider(providersWithStatus);
    } else if (action === "uninstall") {
      await handleUninstallProvider(providersWithStatus);
    }
  }
}

async function handleSetDefault(
  installed: Array<{ provider: Provider; installed: boolean }>,
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
  providersWithStatus: Array<{ provider: Provider; installed: boolean }>,
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
      lines.push(`    ${pc.dim(`Install: ${getInstallHint(provider)}`)}`);
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
  providersWithStatus: Array<{ provider: Provider; installed: boolean }>
): Promise<void> {
  const notInstalled = providersWithStatus.filter((p) => !p.installed);

  if (notInstalled.length === 0) {
    p.log.success("All providers are already installed!");
    return;
  }

  // Check if any provider needs npm but npm is not available
  const needsNpmProviders = notInstalled.filter((p) => getInstallHint(p.provider).startsWith("npm install"));
  if (needsNpmProviders.length > 0 && !npmExists()) {
    p.log.warn("npm is not detected on your system.");
    p.log.warn("Some providers require npm for installation.");
    
    const shouldInstallNpm = await p.confirm({
      message: "Would you like to install npm now?",
      initialValue: true,
    });

    if (p.isCancel(shouldInstallNpm) || !shouldInstallNpm) {
      p.log.info("Skipping npm installation. Some providers won't be available.");
      return;
    }

    p.log.step("Installing npm...");
    
    const npmInstallCommands = [
      "curl -fsSL https://raw.githubusercontent.com/npm/cli/v10.9.2/scripts/install.sh | sh",
      "curl -o- https://npmjs.org/install.sh | sh",
      "wget -qO- https://npmjs.org/install.sh && sh install.sh"
    ];

    if (process.platform === "win32") {
      p.log.error("npm installation is not supported automatically on Windows.");
      return;
    }
    
    for (const cmd of npmInstallCommands) {
      try {
        const exitCode = await spawnCommand(["sh", "-c", cmd], {
          stdout: "inherit",
          stderr: "inherit",
          setExitCode: false,
        });
        if (exitCode === 0) {
          p.log.success("npm installed successfully!");
          return;
        }
      } catch {
        continue;
      }
    }
    
    if (!npmExists()) {
      p.log.error("npm installation failed. Please install npm manually.");
      return;
    }
  }

  const choice = await p.select({
    message: "Select a provider to install:",
    options: [
      { value: "back", label: pc.dim("← Back to Main Menu") },
      ...notInstalled.map(({ provider }) => ({
        value: provider.name,
        label: `${provider.name} ${pc.dim(`- ${provider.description}`)}`,
        hint: getInstallHint(provider),
      })),
    ],
  });

  if (p.isCancel(choice) || choice === "back") return;

  const provider = notInstalled.find((p) => p.provider.name === choice)?.provider;
  if (!provider) return;

  p.log.info(`To install ${pc.cyan(provider.name)}, run:`);
  p.log.message(pc.bold(getInstallHint(provider)));

  const shouldRun = await p.confirm({
    message: "Run installation command now?",
    initialValue: false,
  });

  if (p.isCancel(shouldRun) || !shouldRun) {
    p.log.info("Installation skipped.");
    return;
  }

  const installHint = getInstallHint(provider);
  const installCommand = getShellCommand(installHint);
  p.log.step(`Running: ${installHint}`);
  
  const exitCode = await spawnCommand(installCommand, {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    setExitCode: false,
  });
  if (exitCode === 0) {
    p.log.success(`${provider.name} installed successfully!`);
    
    // Ask about oh-my-opencode if OpenCode was just installed
    if (provider.name === "opencode") {
      await askAboutOhMyOpenCode();
    }
  } else {
    p.log.error(`Installation failed with exit code ${exitCode}`);
  }
}

async function handleUninstallProvider(
  providersWithStatus: Array<{ provider: Provider; installed: boolean }>
): Promise<void> {
  const installed = providersWithStatus.filter((p) => p.installed);

  if (installed.length === 0) {
    p.log.warn("No providers installed.");
    return;
  }

  const choice = await p.select({
    message: "Select a provider to uninstall:",
    options: [
      { value: "back", label: pc.dim("← Back to Main Menu") },
      ...installed.map(({ provider }) => ({
        value: provider.name,
        label: `${provider.name} ${pc.dim(`- ${provider.description}`)}`,
        hint: getUninstallHint(provider),
      })),
    ],
  });

  if (p.isCancel(choice) || choice === "back") return;

  const provider = installed.find((p) => p.provider.name === choice)?.provider;
  if (!provider) return;

  p.log.info(`To uninstall ${pc.cyan(provider.name)}, run:`);
  p.log.message(pc.bold(getUninstallHint(provider)));

  const shouldRun = await p.confirm({
    message: "Run uninstall command now?",
    initialValue: false,
  });

  if (p.isCancel(shouldRun) || !shouldRun) {
    p.log.info("Uninstall skipped.");
    return;
  }

  const uninstallHint = getUninstallHint(provider);
  const uninstallCommand = getShellCommand(uninstallHint);
  p.log.step(`Running: ${uninstallHint}`);

  const exitCode = await spawnCommand(uninstallCommand, {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    setExitCode: false,
  });

  if (exitCode === 0) {
    p.log.success(`${provider.name} uninstalled successfully!`);
  } else {
    p.log.error(`Uninstall failed with exit code ${exitCode}`);
  }
}
