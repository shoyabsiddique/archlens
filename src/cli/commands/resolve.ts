import { Command } from "commander";

import { buildStructuralSnapshot } from "../../drift-detector/snapshot-builder.js";
import { logger } from "../../shared/utils/logger.js";
import { resolveProjectRoot } from "../../shared/utils/paths.js";
import { SQLiteStore } from "../../storage/sqlite-store.js";

export function createResolveCommand(): Command {
  return new Command("resolve")
    .description(
      "Mark unresolved drift events as acknowledged and advance the architectural baseline",
    )
    .argument("[id]", "Drift event id to resolve. Resolves all unresolved events when omitted.")
    .action((id?: string) => {
      const projectRoot = resolveProjectRoot();
      const store = new SQLiteStore(projectRoot);
      const resolved = store.resolveDriftEvents(id ? [id] : undefined);

      if (id && resolved === 0) {
        store.close();
        throw new Error(`No unresolved drift event found for ${id}`);
      }

      const snapshot = buildStructuralSnapshot(projectRoot);
      store.insertSnapshot(snapshot);
      store.close();

      logger.info(
        `Resolved ${resolved} drift event(s) and advanced baseline to snapshot ${snapshot.id}.`,
      );
    });
}
