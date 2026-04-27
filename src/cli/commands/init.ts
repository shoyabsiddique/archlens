import { Command } from "commander";
import prompts from "prompts";

import { findProjectRoot } from "../../shared/utils/paths.js";
import { AGENT_CONFIGS, SupportedAgents, type SupportedAgent } from "../../shared/types/agents.js";
import { initializeProject, printInitActions } from "../project.js";

export function createInitCommand(): Command {
  return new Command("init")
    .description("Initialize ArchLens in the current git repository")
    .option("--dry-run", "Print the actions ArchLens would take without modifying files")
    .option("--no-hooks", "Skip git hook installation")
    .option("--agents <agents>", "Comma-separated list of agents to configure (e.g., github-copilot,claude)")
    .action(async (options: { dryRun?: boolean; noHooks?: boolean; agents?: string }) => {
      const projectRoot = findProjectRoot(process.cwd()) ?? process.cwd();
      let selectedAgents: SupportedAgent[] = [];

      // If agents are provided via CLI option
      if (options.agents) {
        const agentList = options.agents.split(",").map((a) => a.trim());
        selectedAgents = agentList.filter((a) => isValidAgent(a)) as SupportedAgent[];

        if (selectedAgents.length === 0) {
          console.error(`No valid agents specified. Valid options: ${SupportedAgents.join(", ")}`);
          process.exit(1);
        }
      } else {
        // Interactive prompt for agent selection
        const response = await prompts({
          type: "multiselect",
          name: "agents",
          message: "Which agents would you like to configure instructions for?",
          choices: SupportedAgents.map((agent) => ({
            title: AGENT_CONFIGS[agent].displayName,
            value: agent,
          })),
          hint: "- Use Space to select, Enter to confirm",
        });

        if (response.agents && response.agents.length > 0) {
          selectedAgents = response.agents;
        }
      }

      const actions = initializeProject(projectRoot, {
        dryRun: options.dryRun ?? undefined,
        noHooks: options.noHooks ?? undefined,
        agents: selectedAgents.length > 0 ? selectedAgents : undefined,
      });
      printInitActions(actions);
    });
}

function isValidAgent(agent: string): agent is SupportedAgent {
  return SupportedAgents.includes(agent as SupportedAgent);
}
