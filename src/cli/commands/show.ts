import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Command } from "commander";

import { logger } from "../../shared/utils/logger.js";
import { resolveProjectRoot } from "../../shared/utils/paths.js";
import { SQLiteStore } from "../../storage/sqlite-store.js";

export function createShowCommand(): Command {
  return new Command("show")
    .description("Show a single ADR by id or draft id")
    .argument("<id>", "ADR id or draft id")
    .action((id: string) => {
      const projectRoot = resolveProjectRoot();
      const store = new SQLiteStore(projectRoot);
      const adr = store.getADR(id);
      store.close();

      if (!adr) {
        throw new Error(`No ADR found for ${id}`);
      }

      const content = readFileSync(resolve(projectRoot, adr.bodyMdPath), "utf8");
      logger.info(content);
    });
}
