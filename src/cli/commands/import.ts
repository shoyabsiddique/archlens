import { Command } from "commander";

import { importADRs } from "../../adr-engine/importer.js";
import { logger } from "../../shared/utils/logger.js";
import { resolveProjectRoot } from "../../shared/utils/paths.js";

export function createImportCommand(): Command {
  return new Command("import")
    .description("Import ADR files from docs/decisions into the local SQLite index")
    .action(() => {
      const projectRoot = resolveProjectRoot();
      const imported = importADRs(projectRoot);
      logger.info(`Imported ${imported} ADR file(s).`);
    });
}
