import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { execa } from "execa";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildDraftADR } from "../../src/adr-engine/formatter.js";
import { importADRs } from "../../src/adr-engine/importer.js";
import { writeADR } from "../../src/adr-engine/writer.js";
import { initializeProject } from "../../src/cli/project.js";
import { SQLiteStore } from "../../src/storage/sqlite-store.js";

describe("manual ADR capture workflow", () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = mkdtempSync(join(tmpdir(), "archlens-integration-"));
    await execa("git", ["init"], { cwd: projectRoot });
    await execa("git", ["config", "user.name", "ArchLens Tester"], { cwd: projectRoot });
    await execa("git", ["config", "user.email", "tester@example.com"], { cwd: projectRoot });
    mkdirSync(join(projectRoot, ".git", "hooks"), { recursive: true });
    initializeProject(projectRoot);
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it("writes, imports, and reads ADRs from the store", () => {
    const adr = buildDraftADR({
      title: "Use SQLite for the local decision index",
      context: "ArchLens needs a local metadata store.",
      decision: "Use SQLite with a single project-local database file.",
      rationale: "It keeps installation simple and supports local search.",
      tradeoffs: "Writes are serialized and the schema needs migrations.",
      consequences: "The init flow must create a store and run migrations.",
      tags: ["storage", "local-first"],
      participants: [{ name: "ArchLens Tester", role: "author" }],
    });

    const filePath = writeADR(projectRoot, adr);
    expect(existsSync(filePath)).toBe(true);

    const imported = importADRs(projectRoot);
    expect(imported).toBe(1);

    const store = new SQLiteStore(projectRoot);
    const found = store.getADR(adr.id);
    store.close();

    expect(found?.title).toBe(adr.title);
    expect(readFileSync(resolve(projectRoot, adr.bodyMdPath), "utf8")).toContain("## Decision");
  });
});
