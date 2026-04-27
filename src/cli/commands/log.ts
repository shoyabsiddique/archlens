import { Command } from "commander";

import { logger } from "../../shared/utils/logger.js";
import { resolveProjectRoot } from "../../shared/utils/paths.js";
import { SQLiteStore } from "../../storage/sqlite-store.js";

export function createLogCommand(): Command {
  return new Command("log")
    .description("List indexed architecture decision records")
    .option("--status <status>", "Filter by ADR status")
    .action((options: { status?: "draft" | "accepted" | "superseded" | "deprecated" }) => {
      const projectRoot = resolveProjectRoot();
      const store = new SQLiteStore(projectRoot);
      const adrs = store.listADRs(options.status);
      store.close();

      if (adrs.length === 0) {
        logger.info("No ADRs found.");
        return;
      }

      for (const adr of adrs) {
        logger.info(`${adr.id} | ${adr.status} | ${adr.title}`);
      }
    });
}
