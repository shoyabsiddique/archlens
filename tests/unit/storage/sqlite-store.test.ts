import { copyFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { ADRDraft } from "../../../src/shared/types/adr.js";
import { SQLiteStore } from "../../../src/storage/sqlite-store.js";

describe("SQLiteStore", () => {
  let projectRoot: string;
  let store: SQLiteStore;

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), "archlens-store-"));
    store = new SQLiteStore(projectRoot);
  });

  afterEach(() => {
    store.close();
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it("creates the schema on startup", () => {
    expect(store.hasSchema()).toBe(true);
  });

  it("persists and retrieves ADRs", () => {
    const adr: ADRDraft = {
      id: "ADR-draft-abc123",
      draftId: "abc123",
      title: "Use Redis for session storage",
      status: "draft",
      date: "2026-04-25T00:00:00.000Z",
      participants: [{ name: "Dev", role: "author" }],
      supersedes: [],
      tags: ["dependency"],
      body: {
        context: "Sessions need persistence.",
        decision: "Use Redis.",
        rationale: "Fast and common.",
        tradeoffs: "Another dependency.",
        consequences: "Need runtime configuration.",
      },
      bodyMdPath: "docs/decisions/ADR-draft-abc123-use-redis.md",
      schemaVersion: 1,
    };

    store.insertADR(adr);

    const found = store.getADR("ADR-draft-abc123");
    expect(found?.title).toBe(adr.title);
    expect(found?.body.decision).toBe("Use Redis.");
  });

  it("creates the documented archlens.db store file", () => {
    expect(existsSync(join(projectRoot, ".archlens", "archlens.db"))).toBe(true);
  });

  it("migrates a legacy store.db file to archlens.db", () => {
    store.close();

    const dataDir = join(projectRoot, ".archlens");
    const currentPath = join(dataDir, "archlens.db");
    const legacyPath = join(dataDir, "store.db");
    copyFileSync(currentPath, legacyPath);
    rmSync(currentPath);

    store = new SQLiteStore(projectRoot);

    expect(existsSync(currentPath)).toBe(true);
    expect(store.hasSchema()).toBe(true);
  });
});
