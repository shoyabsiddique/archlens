import type { DriftEvent, DriftEventSeverity } from "../shared/types/drift.js";
import type { StructuralSnapshot } from "../shared/types/snapshot.js";
import { hashContent } from "../shared/utils/hash.js";

export interface DriftAnalysisResult {
  events: DriftEvent[];
}

export function analyzeDrift(
  previousSnapshot: StructuralSnapshot,
  currentSnapshot: StructuralSnapshot,
): DriftAnalysisResult {
  const events: DriftEvent[] = [];

  events.push(
    ...diffDependencies(
      previousSnapshot.depManifest,
      currentSnapshot.depManifest,
      currentSnapshot.capturedAt,
    ),
  );
  events.push(
    ...diffModules(
      previousSnapshot.patterns.modules ?? [],
      currentSnapshot.patterns.modules ?? [],
      currentSnapshot.capturedAt,
    ),
  );

  return { events };
}

function diffDependencies(
  previous: Record<string, string>,
  current: Record<string, string>,
  detectedAt: string,
): DriftEvent[] {
  const previousKeys = new Set(Object.keys(previous));
  const currentKeys = new Set(Object.keys(current));
  const events: DriftEvent[] = [];

  for (const dependency of currentKeys) {
    if (!previousKeys.has(dependency)) {
      events.push(
        createDriftEvent(
          "dependency_added",
          "warning",
          `Dependency ${dependency} was added without resolving the prior architecture baseline.`,
          [`package.json#${dependency}`],
          detectedAt,
        ),
      );
    }
  }

  for (const dependency of previousKeys) {
    if (!currentKeys.has(dependency)) {
      events.push(
        createDriftEvent(
          "dependency_removed",
          "error",
          `Dependency ${dependency} was removed from the current codebase relative to the last resolved baseline.`,
          [`package.json#${dependency}`],
          detectedAt,
        ),
      );
    }
  }

  return events;
}

function diffModules(previous: string[], current: string[], detectedAt: string): DriftEvent[] {
  const previousSet = new Set(previous);
  const currentSet = new Set(current);
  const events: DriftEvent[] = [];

  for (const modulePath of currentSet) {
    if (!previousSet.has(modulePath)) {
      events.push(
        createDriftEvent(
          "pattern_introduced",
          "info",
          `Module ${modulePath} is new compared with the last resolved baseline.`,
          [modulePath],
          detectedAt,
        ),
      );
    }
  }

  for (const modulePath of previousSet) {
    if (!currentSet.has(modulePath)) {
      events.push(
        createDriftEvent(
          "pattern_abandoned",
          "warning",
          `Module ${modulePath} no longer exists compared with the last resolved baseline.`,
          [modulePath],
          detectedAt,
        ),
      );
    }
  }

  return events;
}

function createDriftEvent(
  type: DriftEvent["type"],
  severity: DriftEventSeverity,
  description: string,
  affectedPaths: string[],
  detectedAt: string,
): DriftEvent {
  return {
    id: hashContent(`${type}:${description}:${affectedPaths.join(",")}`),
    detectedAt,
    type,
    severity,
    description,
    affectedPaths,
    resolved: false,
  };
}
