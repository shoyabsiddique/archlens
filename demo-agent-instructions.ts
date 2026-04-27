#!/usr/bin/env node

/**
 * Demonstration of the Agent Instructions Feature
 *
 * This script shows how the agent instructions feature works
 * during ArchLens initialization.
 */

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { initializeProject } from "./src/cli/project.js";
import { AGENT_CONFIGS } from "./src/shared/types/agents.js";

console.log("\nAgent Instructions Feature Demonstration\n");

const projectRoot = mkdtempSync(join(tmpdir(), "archlens-demo-"));

console.log("Demo project root:", projectRoot);
console.log();

console.log("Initializing ArchLens with multiple agents...\n");

const selectedAgents = ["github-copilot", "claude", "qwen"] as const;

const actions = initializeProject(projectRoot, {
  agents: selectedAgents,
});

console.log("Initialization actions:");
actions.forEach((action) => {
  console.log(`  - ${action}`);
});

console.log("\nGenerated instruction files:\n");

selectedAgents.forEach((agent) => {
  const config = AGENT_CONFIGS[agent];
  const instructionsPath = join(projectRoot, config.instructionsPath);

  console.log("-".repeat(60));
  console.log(config.displayName);
  console.log(`Path: ${config.instructionsPath}`);
  console.log("-".repeat(60));

  const content = readFileSync(instructionsPath, "utf8");
  const lines = content.split("\n").slice(0, 20);

  lines.forEach((line) => {
    console.log(line);
  });

  console.log("...");
  console.log(`Total lines: ${content.split("\n").length}`);
  console.log();
});

console.log("Project structure after initialization:");
console.log(`
${projectRoot}
|-- .archlens/
|   |-- config.json
|   \`-- archlens.db
|-- .git/
|   \`-- hooks/
|       |-- post-commit
|       |-- pre-push
|       \`-- post-merge
|-- .github/
|   \`-- copilot-instructions.md
|-- CLAUDE.md
|-- .agents/
|   \`-- qwen/
|       \`-- AGENTS.md
|-- docs/
|   \`-- decisions/
|       \`-- .gitkeep
\`-- .gitattributes
`);

console.log("Usage examples:\n");
console.log("1. GitHub Copilot reads .github/copilot-instructions.md");
console.log("2. Claude reads CLAUDE.md");
console.log("3. Qwen reads .agents/qwen/AGENTS.md\n");

console.log("What the instructions tell agents to do:");
console.log(`
1. Query ArchLens for relevant architectural decisions
2. Analyze proposed changes with get_impact_preview
3. Reference ADR IDs in recommendations
4. Respect existing architectural constraints
`);

rmSync(projectRoot, { recursive: true, force: true });

console.log("Demo complete.\n");
console.log("To use this in your project:");
console.log("  archlens init");
console.log("  archlens capture --manual --title 'Your First Decision'");
console.log("  archlens serve");
