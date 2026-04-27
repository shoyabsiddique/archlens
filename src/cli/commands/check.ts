import { Command } from "commander";

import { analyzeDrift } from "../../drift-detector/drift-analyzer.js";
import { buildStructuralSnapshot } from "../../drift-detector/snapshot-builder.js";
import { logger } from "../../shared/utils/logger.js";
import { resolveProjectRoot } from "../../shared/utils/paths.js";
import { SQLiteStore } from "../../storage/sqlite-store.js";

interface CheckOptions {
  ci?: boolean;
  warnOnly?: boolean;
  format?: "text" | "json";
}

export function createCheckCommand(): Command {
  return new Command("check")
    .description("Analyze the working tree against the last resolved architectural baseline")
    .option("--ci", "Exit non-zero when error-severity drift is detected")
    .option("--warn-only", "Never fail the process, even in CI mode")
    .option("--format <format>", "Output format: text or json", "text")
    .action((options: CheckOptions) => {
      const projectRoot = resolveProjectRoot();
      const store = new SQLiteStore(projectRoot);
      const previousSnapshot = store.getLatestSnapshot();
      const currentSnapshot = buildStructuralSnapshot(projectRoot);

      if (!previousSnapshot) {
        store.insertSnapshot(currentSnapshot);
        store.close();

        emitResult(
          {
            mode: "baseline_created",
            snapshotId: currentSnapshot.id,
            events: [],
          },
          options.format ?? "text",
        );
        return;
      }

      const analysis = analyzeDrift(previousSnapshot, currentSnapshot);
      for (const event of analysis.events) {
        store.insertDriftEvent(event);
      }

      if (analysis.events.length === 0) {
        store.insertSnapshot(currentSnapshot);
      }

      store.close();

      emitResult(
        {
          mode: "checked",
          snapshotId: currentSnapshot.id,
          events: analysis.events,
        },
        options.format ?? "text",
      );

      if (
        options.ci &&
        !options.warnOnly &&
        analysis.events.some((event) => event.severity === "error")
      ) {
        process.exitCode = 1;
      }
    });
}

function emitResult(
  result: {
    mode: "baseline_created" | "checked";
    snapshotId: string;
    events: ReturnType<typeof analyzeDrift>["events"];
  },
  format: "text" | "json",
): void {
  if (format === "json") {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (result.mode === "baseline_created") {
    logger.info(`Baseline snapshot created: ${result.snapshotId}`);
    return;
  }

  if (result.events.length === 0) {
    logger.info("No architectural drift detected.");
    return;
  }

  for (const event of result.events) {
    logger.warn(`${event.severity.toUpperCase()} ${event.type}: ${event.description}`);
  }
}
