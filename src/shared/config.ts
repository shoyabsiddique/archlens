import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { ArchLensConfig } from "./types/config.js";
import { ArchLensConfigSchema } from "./types/config.js";

const defaultConfig = ArchLensConfigSchema.parse({});

export function getConfigPath(projectRoot: string): string {
  return resolve(projectRoot, ".archlens", "config.json");
}

export function createDefaultConfig(): ArchLensConfig {
  return structuredClone(defaultConfig);
}

export function loadConfig(projectRoot: string): ArchLensConfig {
  const configPath = getConfigPath(projectRoot);
  const raw = JSON.parse(readFileSync(configPath, "utf8")) as unknown;
  return ArchLensConfigSchema.parse(raw);
}

export function saveConfig(projectRoot: string, config: ArchLensConfig): void {
  const configPath = getConfigPath(projectRoot);
  mkdirSync(resolve(projectRoot, ".archlens"), { recursive: true });
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}
