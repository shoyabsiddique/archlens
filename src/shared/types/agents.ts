import { z } from "zod";

export const SupportedAgents = [
  "github-copilot",
  "claude",
  "gpt4",
  "antigravity",
  "qwen",
  "custom",
] as const;

export const AgentConfigSchema = z.object({
  name: z.enum(SupportedAgents),
  displayName: z.string(),
  instructionsPath: z.string(),
  isEnabled: z.boolean().default(true),
});

export type SupportedAgent = (typeof SupportedAgents)[number];
export type AgentConfig = z.infer<typeof AgentConfigSchema>;

export const AGENT_CONFIGS: Record<SupportedAgent, Omit<AgentConfig, "isEnabled">> = {
  "github-copilot": {
    name: "github-copilot",
    displayName: "GitHub Copilot",
    instructionsPath: ".github/copilot-instructions.md",
  },
  claude: {
    name: "claude",
    displayName: "Claude",
    instructionsPath: ".agents/claude/.instructions.md",
  },
  gpt4: {
    name: "gpt4",
    displayName: "GPT-4",
    instructionsPath: ".agents/gpt4/.instructions.md",
  },
  antigravity: {
    name: "antigravity",
    displayName: "Antigravity",
    instructionsPath: ".agents/antigravity/.instructions.md",
  },
  qwen: {
    name: "qwen",
    displayName: "Qwen",
    instructionsPath: ".agents/qwen/.instructions.md",
  },
  custom: {
    name: "custom",
    displayName: "Custom Agent",
    instructionsPath: ".agents/custom/.instructions.md",
  },
};
