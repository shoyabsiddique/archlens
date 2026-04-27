#!/usr/bin/env node

/**
 * Demonstration of the Agent Instructions Feature
 * 
 * This script shows how the new agent instructions feature works
 * during ArchLens initialization
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initializeProject } from "./src/cli/project.js";
import { AGENT_CONFIGS } from "./src/shared/types/agents.js";

console.log("\n╔════════════════════════════════════════════════════════╗");
console.log("║   Agent Instructions Feature Demonstration             ║");
console.log("╚════════════════════════════════════════════════════════╝\n");

// Create a temporary project directory
const projectRoot = mkdtempSync(join(tmpdir(), "archlens-demo-"));
const gitHooksDir = join(projectRoot, ".git", "hooks");
mkdirSync(gitHooksDir, { recursive: true });

console.log("📁 Demo Project Root:", projectRoot);
console.log();

// Initialize with multiple agents
console.log("🔧 Initializing ArchLens with multiple agents...\n");

const selectedAgents = ["github-copilot", "claude", "qwen"] as const;

const actions = initializeProject(projectRoot, {
  agents: selectedAgents,
});

console.log("\n📋 Initialization Actions:");
actions.forEach((action) => {
  console.log(`   ✓ ${action}`);
});

// Show the generated instruction files
console.log("\n📄 Generated Instruction Files:\n");

selectedAgents.forEach((agent) => {
  const config = AGENT_CONFIGS[agent];
  const instructionsPath = join(projectRoot, config.instructionsPath);

  console.log(`\n${"─".repeat(60)}`);
  console.log(`📌 ${config.displayName}`);
  console.log(`   Path: ${config.instructionsPath}`);
  console.log(`${"─".repeat(60)}`);

  const content = readFileSync(instructionsPath, "utf8");

  // Show first 20 lines of each instruction file
  const lines = content.split("\n").slice(0, 20);
  lines.forEach((line) => {
    console.log(line);
  });

  console.log("   ...");
  console.log(`   (Total lines: ${content.split("\n").length})`);
});

// Show project structure
console.log("\n\n📂 Project Structure After Initialization:");
console.log(`
${projectRoot}
├── .archlens/
│   ├── config.json        (Project configuration)
│   └── store.db           (SQLite database)
├── .git/
│   ├── hooks/
│   │   ├── post-commit    (Auto-capture ADRs)
│   │   ├── pre-push       (Auto-import ADRs)
│   │   └── post-merge     (Auto-import ADRs)
│   └── ...
├── .github/
│   └── copilot-instructions.md     (GitHub Copilot guidance)
├── .agents/
│   ├── claude/
│   │   └── .instructions.md        (Claude guidance)
│   └── qwen/
│       └── .instructions.md        (Qwen guidance)
├── docs/
│   └── decisions/          (ADR markdown files)
└── .gitattributes         (Merge conflict rules)
`);

// Show usage examples
console.log("\n💡 Usage Examples:\n");

console.log("1️⃣  GitHub Copilot will automatically load instructions");
console.log("   when used in VS Code chat interface\n");

console.log("2️⃣  Claude can be configured to use the instructions");
console.log("   in system prompt or custom context\n");

console.log("3️⃣  Qwen agents will query the MCP server before");
console.log("   making architectural recommendations\n");

// Show example of what instructions tell agents to do
console.log("📖 What the Instructions Tell Agents:");
console.log(`
When an agent needs to make a decision, it will:

1. Query ArchLens MCP Server:
   - Ask for relevant architectural decisions
   - Example: "What storage solutions have we decided on?"

2. Analyze Proposed Changes:
   - Use 'get_impact_preview' tool to assess architectural impact
   - Check if changes violate existing decisions

3. Reference Decisions:
   - Include ADR IDs in explanations
   - Explain rationale and consequences
   - Warn about conflicts with established patterns

4. Respect Architecture:
   - Suggest alternatives aligned with decisions
   - Propose changes that fit established patterns
   - Document new decisions when appropriate
`);

// Cleanup
rmSync(projectRoot, { recursive: true, force: true });

console.log("✅ Demo Complete!\n");
console.log("To use this in your project:");
console.log("  $ cd your-project");
console.log("  $ archlens init");
console.log("  $ archlens capture --manual --title 'Your First Decision'");
console.log("  $ archlens serve  # Start MCP server");
