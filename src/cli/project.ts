import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { createDefaultConfig, saveConfig } from "../shared/config.js";
import { logger } from "../shared/utils/logger.js";
import { SQLiteStore } from "../storage/sqlite-store.js";
import { AGENT_CONFIGS, type SupportedAgent } from "../shared/types/agents.js";
import { generateAgentInstructions } from "./agent-instructions.js";

export interface InitOptions {
  dryRun?: boolean | undefined;
  noHooks?: boolean | undefined;
  agents?: SupportedAgent[] | undefined;
}

interface McpConfigFile {
  mcpServers?: Record<
    string,
    {
      type?: string;
      command?: string;
      args?: string[];
      env?: Record<string, string>;
    }
  >;
}

const hookScripts: Record<string, string> = {
  "post-commit": "#!/bin/sh\narchlens capture --from-commit HEAD >/dev/null 2>&1 || true\n",
  "pre-push": "#!/bin/sh\narchlens import >/dev/null 2>&1 || true\n",
  "post-merge": "#!/bin/sh\narchlens import >/dev/null 2>&1 || true\n",
};

const mcpConfigPaths = [".mcp.json", ".vscode/mcp.json", ".cursor/mcp.json"];

const archLensMcpServerConfig = {
  type: "stdio",
  command: "archlens",
  args: ["serve"],
  env: {},
};

export function initializeProject(projectRoot: string, options: InitOptions = {}): string[] {
  const actions: string[] = [];
  const decisionsDir = resolve(projectRoot, "docs", "decisions");
  const gitkeepPath = resolve(decisionsDir, ".gitkeep");
  const archlensDir = resolve(projectRoot, ".archlens");
  const configPath = resolve(archlensDir, "config.json");
  const gitattributesPath = resolve(projectRoot, ".gitattributes");
  const hasGitRepository = existsSync(resolve(projectRoot, ".git"));

  if (!hasGitRepository) {
    actions.push(`initialize git repository in ${projectRoot}`);
  }

  actions.push(`ensure directory ${decisionsDir}`);
  actions.push(`ensure file ${gitkeepPath}`);
  actions.push(`ensure directory ${archlensDir}`);
  actions.push(`ensure config ${configPath}`);
  actions.push(`ensure sqlite store ${resolve(archlensDir, "archlens.db")}`);
  actions.push("ensure .gitattributes contains ArchLens merge rule");
  for (const relativePath of mcpConfigPaths) {
    actions.push(`ensure MCP config ${resolve(projectRoot, relativePath)}`);
  }

  if (!options.noHooks) {
    for (const hookName of Object.keys(hookScripts)) {
      actions.push(`install git hook ${hookName}`);
    }
  }

  // Add agent instruction setup actions
  if (options.agents && options.agents.length > 0) {
    for (const agent of options.agents) {
      const config = AGENT_CONFIGS[agent];
      actions.push(`create agent instructions for ${config.displayName} at ${config.instructionsPath}`);
    }
  }

  if (options.dryRun) {
    return actions;
  }

  ensureGitRepository(projectRoot, hasGitRepository);

  mkdirSync(decisionsDir, { recursive: true });
  if (!existsSync(gitkeepPath)) {
    writeFileSync(gitkeepPath, "", "utf8");
  }

  mkdirSync(archlensDir, { recursive: true });
  if (!existsSync(configPath)) {
    saveConfig(projectRoot, createDefaultConfig());
  }

  const store = new SQLiteStore(projectRoot);
  store.close();

  ensureGitAttributes(gitattributesPath);
  ensureMcpConfigs(projectRoot);

  if (!options.noHooks) {
    installHooks(projectRoot);
  }

  // Create agent instructions
  if (options.agents && options.agents.length > 0) {
    for (const agent of options.agents) {
      createAgentInstructions(projectRoot, agent);
    }
  }

  return actions;
}

function ensureGitRepository(projectRoot: string, hasGitRepository: boolean): void {
  if (hasGitRepository) {
    return;
  }

  execFileSync("git", ["init"], {
    cwd: projectRoot,
    stdio: "ignore",
  });
}

function ensureMcpConfigs(projectRoot: string): void {
  for (const relativePath of mcpConfigPaths) {
    const configPath = resolve(projectRoot, relativePath);
    const configDir = dirname(configPath);
    mkdirSync(configDir, { recursive: true });

    const existing = readMcpConfig(configPath);
    const mcpServers = existing.mcpServers ?? {};

    if (mcpServers.archlens) {
      continue;
    }

    mcpServers.archlens = archLensMcpServerConfig;
    writeFileSync(
      configPath,
      `${JSON.stringify({ ...existing, mcpServers }, null, 2)}\n`,
      "utf8",
    );
  }
}

function readMcpConfig(configPath: string): McpConfigFile {
  if (!existsSync(configPath)) {
    return {};
  }

  try {
    const content = readFileSync(configPath, "utf8");
    return JSON.parse(content) as McpConfigFile;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Could not parse existing MCP config at ${configPath}: ${message}`);
    return {};
  }
}

function ensureGitAttributes(gitattributesPath: string): void {
  const requiredLine = "docs/decisions/index.json merge=archlens-index";
  const existing = existsSync(gitattributesPath) ? readFileSync(gitattributesPath, "utf8") : "";
  if (existing.includes(requiredLine)) {
    return;
  }

  const content =
    existing.trim().length > 0 ? `${existing.trimEnd()}\n${requiredLine}\n` : `${requiredLine}\n`;
  writeFileSync(gitattributesPath, content, "utf8");
}

function installHooks(projectRoot: string): void {
  const hooksDir = resolve(projectRoot, ".git", "hooks");
  mkdirSync(hooksDir, { recursive: true });
  for (const [hookName, hookContent] of Object.entries(hookScripts)) {
    const hookPath = resolve(hooksDir, hookName);
    if (existsSync(hookPath)) {
      const existing = readFileSync(hookPath, "utf8");
      if (existing === hookContent) {
        continue;
      }
    }
    writeFileSync(hookPath, hookContent, "utf8");
    chmodSync(hookPath, 0o755);
  }
}

function createAgentInstructions(projectRoot: string, agent: SupportedAgent): void {
  const config = AGENT_CONFIGS[agent];
  const instructionsPath = resolve(projectRoot, config.instructionsPath);
  const instructionsDir = dirname(instructionsPath);

  // Create directory if it doesn't exist
  mkdirSync(instructionsDir, { recursive: true });

  // Generate instruction content
  const content = generateAgentInstructions(agent);

  // Write instructions file (don't overwrite if it exists)
  if (!existsSync(instructionsPath)) {
    writeFileSync(instructionsPath, content, "utf8");
    logger.info(`created agent instructions for ${config.displayName}`);
  } else {
    logger.info(`agent instructions for ${config.displayName} already exist at ${instructionsPath}`);
  }
}

export function printInitActions(actions: string[]): void {
  for (const action of actions) {
    logger.info(action);
  }
}
