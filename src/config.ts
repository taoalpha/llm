import Conf from "conf";

export interface LLMConfig {
  defaultProvider?: string;
  // Future: custom endpoints, API keys, etc.
}

const config = new Conf<LLMConfig>({
  projectName: "llm-cli",
  projectSuffix: "",
  defaults: {},
});

export function getDefaultProvider(): string | undefined {
  return config.get("defaultProvider");
}

export function setDefaultProvider(provider: string): void {
  config.set("defaultProvider", provider);
}

export function clearDefaultProvider(): void {
  config.delete("defaultProvider");
}

export function getConfigPath(): string {
  return config.path;
}
