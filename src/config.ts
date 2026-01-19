import Conf from "conf";

export interface LLMConfig {
  defaultProvider?: string;
  updateCheckLastAt?: number;
  updateCheckIntervalMs?: number;
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

export function getUpdateCheckLastAt(): number | undefined {
  return config.get("updateCheckLastAt");
}

export function setUpdateCheckLastAt(value: number): void {
  config.set("updateCheckLastAt", value);
}

export function getUpdateCheckIntervalMs(): number | undefined {
  return config.get("updateCheckIntervalMs");
}
