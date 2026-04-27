import { describe, expect, it } from "vitest";

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildDraftADR, formatADRMarkdown } from "../../../src/adr-engine/formatter.js";
import { parseADRMarkdown } from "../../../src/adr-engine/parser.js";

describe("ADR formatter", () => {
  it("creates stable draft filenames and markdown sections", () => {
    const adr = buildDraftADR({
      title: "Use SQLite for local indexing",
      context: "Need a local metadata store.",
      decision: "Use SQLite.",
      rationale: "Simple deployment.",
      tradeoffs: "Single file database limitations.",
      consequences: "Need migration handling.",
      tags: ["storage"],
    });

    expect(adr.id).toMatch(/^ADR-draft-/);
    expect(adr.bodyMdPath).toContain("use-sqlite-for-local-indexing");

    const markdown = formatADRMarkdown(adr);
    expect(markdown).toContain("## Context");
    expect(markdown).toContain("schema_version: 1");
  });

  it("round-trips ADR markdown through the parser", () => {
    const adr = buildDraftADR({
      title: "Track decisions in markdown",
      context: "Need a readable format.",
      decision: "Use markdown ADRs.",
      rationale: "Git-friendly and portable.",
      tradeoffs: "Less structured than pure JSON.",
      consequences: "Need parsing logic.",
    });
    const tempDir = mkdtempSync(join(tmpdir(), "archlens-adr-"));
    const filePath = join(tempDir, "draft.md");
    writeFileSync(filePath, formatADRMarkdown(adr), "utf8");

    const parsed = parseADRMarkdown(filePath);
    expect(parsed.title).toBe(adr.title);
    expect(parsed.body.rationale).toBe(adr.body.rationale);

    rmSync(tempDir, { recursive: true, force: true });
  });
});
