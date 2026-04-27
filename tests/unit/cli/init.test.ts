import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { initializeProject } from "../../../src/cli/project";
import { AGENT_CONFIGS } from "../../../src/shared/types/agents";

describe("initializeProject", () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), "archlens-init-"));
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it("is idempotent and installs matching hooks", () => {
    initializeProject(projectRoot);
    initializeProject(projectRoot);

    const hooksDir = join(projectRoot, ".git", "hooks");
    const postCommit = readFileSync(join(hooksDir, "post-commit"), "utf8");
    const prePush = readFileSync(join(hooksDir, "pre-push"), "utf8");
    const postMerge = readFileSync(join(hooksDir, "post-merge"), "utf8");

    expect(existsSync(join(projectRoot, ".archlens", "config.json"))).toBe(true);
    expect(existsSync(join(projectRoot, ".archlens", "archlens.db"))).toBe(true);
    expect(existsSync(join(projectRoot, ".mcp.json"))).toBe(true);
    expect(existsSync(join(projectRoot, ".vscode", "mcp.json"))).toBe(true);
    expect(existsSync(join(projectRoot, ".cursor", "mcp.json"))).toBe(true);
    expect(postCommit).toContain("archlens capture --from-commit HEAD");
    expect(prePush).toContain("archlens import");
    expect(postMerge).toContain("archlens import");
  });

  it("initializes git when the project is not already a repository", () => {
    expect(existsSync(join(projectRoot, ".git"))).toBe(false);

    initializeProject(projectRoot);

    expect(existsSync(join(projectRoot, ".git"))).toBe(true);
    expect(existsSync(join(projectRoot, ".git", "hooks", "post-commit"))).toBe(true);
  });

  it("adds ArchLens MCP server config for project-scoped MCP clients", () => {
    initializeProject(projectRoot);

    const rootMcpConfig = JSON.parse(readFileSync(join(projectRoot, ".mcp.json"), "utf8")) as {
      mcpServers?: Record<string, { command?: string; args?: string[] }>;
    };
    const vscodeMcpConfig = JSON.parse(
      readFileSync(join(projectRoot, ".vscode", "mcp.json"), "utf8"),
    ) as {
      mcpServers?: Record<string, { command?: string; args?: string[] }>;
    };
    const cursorMcpConfig = JSON.parse(
      readFileSync(join(projectRoot, ".cursor", "mcp.json"), "utf8"),
    ) as {
      mcpServers?: Record<string, { command?: string; args?: string[] }>;
    };

    expect(rootMcpConfig.mcpServers?.archlens?.command).toBe("archlens");
    expect(rootMcpConfig.mcpServers?.archlens?.args).toEqual(["serve"]);
    expect(vscodeMcpConfig.mcpServers?.archlens?.command).toBe("archlens");
    expect(cursorMcpConfig.mcpServers?.archlens?.command).toBe("archlens");
  });

  it("merges ArchLens MCP config without overwriting existing project config", () => {
    mkdirSync(join(projectRoot, ".vscode"), { recursive: true });
    writeFileSync(
      join(projectRoot, ".vscode", "mcp.json"),
      `${JSON.stringify(
        {
          mcpServers: {
            existing: {
              type: "stdio",
              command: "npx",
              args: ["@example/server"],
              env: {},
            },
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    initializeProject(projectRoot);

    const vscodeMcpConfig = JSON.parse(
      readFileSync(join(projectRoot, ".vscode", "mcp.json"), "utf8"),
    ) as {
      mcpServers?: Record<string, { command?: string; args?: string[] }>;
    };

    expect(vscodeMcpConfig.mcpServers?.existing?.command).toBe("npx");
    expect(vscodeMcpConfig.mcpServers?.archlens?.command).toBe("archlens");
  });

  it("creates agent instructions when agents are specified", () => {
    initializeProject(projectRoot, {
      agents: ["github-copilot", "claude"],
    });

    // Check GitHub Copilot instructions
    const githubCopilotInstructionsPath = join(
      projectRoot,
      AGENT_CONFIGS["github-copilot"].instructionsPath
    );
    expect(existsSync(githubCopilotInstructionsPath)).toBe(true);

    const githubCopilotInstructions = readFileSync(githubCopilotInstructionsPath, "utf8");
    expect(githubCopilotInstructions).toContain("ArchLens Integration Instructions");
    expect(githubCopilotInstructions).toContain("query_decisions");
    expect(githubCopilotInstructions).toContain("GitHub Copilot");

    // Check Claude instructions
    const claudeInstructionsPath = join(projectRoot, AGENT_CONFIGS.claude.instructionsPath);
    expect(existsSync(claudeInstructionsPath)).toBe(true);

    const claudeInstructions = readFileSync(claudeInstructionsPath, "utf8");
    expect(claudeInstructions).toContain("Claude");
    expect(claudeInstructions).toContain("query_decisions");
  });

  it("creates necessary directories for agent instructions", () => {
    initializeProject(projectRoot, {
      agents: ["antigravity"],
    });

    const antigravityDir = join(projectRoot, ".agents", "antigravity");
    expect(existsSync(antigravityDir)).toBe(true);
    expect(existsSync(join(antigravityDir, ".instructions.md"))).toBe(true);
  });

  it("does not overwrite existing agent instructions", () => {
    // First initialization
    initializeProject(projectRoot, {
      agents: ["qwen"],
    });

    const qwenPath = join(projectRoot, AGENT_CONFIGS.qwen.instructionsPath);
    const originalContent = readFileSync(qwenPath, "utf8");

    // Modify the content
    const modifiedContent = originalContent + "\n// Custom modification";
    writeFileSync(qwenPath, modifiedContent, "utf8");

    // Second initialization should not overwrite
    initializeProject(projectRoot, {
      agents: ["qwen"],
    });

    const finalContent = readFileSync(qwenPath, "utf8");
    expect(finalContent).toBe(modifiedContent);
  });
});
