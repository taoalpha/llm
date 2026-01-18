import type { Provider } from "./base";
import { claudeProvider } from "./claude";
import { opencodeProvider } from "./opencode";
import { geminiProvider } from "./gemini";
import { ollamaProvider } from "./ollama";
import { codexProvider } from "./codex";

/**
 * All registered providers in priority order (for auto-detection)
 */
export const providers: Provider[] = [
  opencodeProvider,
  claudeProvider,
  geminiProvider,
  codexProvider,
  ollamaProvider,
];

/**
 * Get a provider by name
 */
export function getProvider(name: string): Provider | undefined {
  return providers.find((p) => p.name === name);
}

/**
 * Detect the first available provider (in priority order)
 */
export async function detectProvider(): Promise<Provider | undefined> {
  for (const provider of providers) {
    if (await provider.isInstalled()) {
      return provider;
    }
  }
  return undefined;
}

/**
 * Get all installed providers
 */
export async function getInstalledProviders(): Promise<Provider[]> {
  const installed: Provider[] = [];
  for (const provider of providers) {
    if (await provider.isInstalled()) {
      installed.push(provider);
    }
  }
  return installed;
}

/**
 * Get all providers with their installation status
 */
export async function getProvidersWithStatus(): Promise<
  Array<{ provider: Provider; installed: boolean }>
> {
  return Promise.all(
    providers.map(async (provider) => ({
      provider,
      installed: await provider.isInstalled(),
    }))
  );
}
