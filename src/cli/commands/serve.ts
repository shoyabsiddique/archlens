import { Command } from "commander";

import { startArchLensMcpServer } from "../../mcp-server/server.js";
import { resolveProjectRoot } from "../../shared/utils/paths.js";

export function createServeCommand(): Command {
  return new Command("serve")
    .description("Start the ArchLens MCP server over stdio for MCP-capable agents")
    .action(async () => {
      const projectRoot = resolveProjectRoot();
      await startArchLensMcpServer(projectRoot);
    });
}
