import { describe, expect, it } from "vitest";

import { analyzeDrift } from "../../../src/drift-detector/drift-analyzer.js";
import type { StructuralSnapshot } from "../../../src/shared/types/snapshot.js";

describe("analyzeDrift", () => {
  it("detects dependency and module changes between snapshots", () => {
    const previous: StructuralSnapshot = {
      id: "old",
      capturedAt: "2026-04-25T00:00:00.000Z",
      depManifest: { zod: "^3.25.76" },
      moduleGraph: { "src/index.ts": [] },
      patterns: { modules: ["src/index.ts"] },
      apiContracts: {},
      languageStats: { ts: 1 },
    };

    const current: StructuralSnapshot = {
      id: "new",
      capturedAt: "2026-04-25T00:05:00.000Z",
      depManifest: { zod: "^3.25.76", commander: "^14.0.0" },
      moduleGraph: { "src/index.ts": [], "src/check.ts": [] },
      patterns: { modules: ["src/index.ts", "src/check.ts"] },
      apiContracts: {},
      languageStats: { ts: 2 },
    };

    const result = analyzeDrift(previous, current);

    expect(result.events.some((event) => event.type === "dependency_added")).toBe(true);
    expect(result.events.some((event) => event.type === "pattern_introduced")).toBe(true);
  });
});
