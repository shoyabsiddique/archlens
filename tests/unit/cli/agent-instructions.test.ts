import { describe, expect, it } from "vitest";
import { generateAgentInstructions } from "../../../src/cli/agent-instructions";
import { AGENT_CONFIGS, SupportedAgents, type SupportedAgent } from "../../../src/shared/types/agents";

describe("agent instructions generator", () => {
  it("should generate instructions for all supported agents", () => {
    for (const agent of SupportedAgents) {
      const instructions = generateAgentInstructions(agent);

      expect(instructions).toBeDefined();
      expect(instructions.length).toBeGreaterThan(0);
      expect(instructions).toContain("ArchLens Integration Instructions");
      expect(instructions).toContain("query_decisions");
      expect(instructions).toContain("get_impact_preview");
    }
  });

  it("should include agent-specific guidance", () => {
    const agents: SupportedAgent[] = ["github-copilot", "claude", "gpt4", "antigravity", "qwen", "custom"];

    agents.forEach((agent) => {
      const instructions = generateAgentInstructions(agent);
      const config = AGENT_CONFIGS[agent];

      expect(instructions).toContain(config.displayName);
    });
  });

  it("github-copilot instructions should mention GitHub Copilot", () => {
    const instructions = generateAgentInstructions("github-copilot");
    expect(instructions).toContain("GitHub Copilot");
  });

  it("claude instructions should mention Claude", () => {
    const instructions = generateAgentInstructions("claude");
    expect(instructions).toContain("Claude");
  });

  it("all instructions should contain core MCP directives", () => {
    const instructions = generateAgentInstructions("gpt4");

    expect(instructions).toContain("Before making or explaining");
    expect(instructions).toContain("Query the ArchLens MCP server");
    expect(instructions).toContain("Use");
    expect(instructions).toContain("MCP Tools");
    expect(instructions).toContain("query_decisions");
    expect(instructions).toContain("get_impact_preview");
  });
});
