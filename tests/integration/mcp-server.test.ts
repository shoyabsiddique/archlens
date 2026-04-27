import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildDraftADR } from "../../src/adr-engine/formatter.js";
import { writeADR } from "../../src/adr-engine/writer.js";
import { initializeProject } from "../../src/cli/project.js";
import { createArchLensMcpServer } from "../../src/mcp-server/server.js";
import { SQLiteStore } from "../../src/storage/sqlite-store.js";

describe("ArchLens MCP server", () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), "archlens-mcp-"));
    mkdirSync(join(projectRoot, ".git", "hooks"), { recursive: true });
    initializeProject(projectRoot);

    const adr = buildDraftADR({
      title: "Use SQLite for local ADR indexing",
      context: "ArchLens needs a local-first metadata store.",
      decision: "Persist ADR metadata in SQLite.",
      rationale: "SQLite is simple to ship and query.",
      tradeoffs: "Concurrent writes are limited compared with a server database.",
      consequences: "The tool must manage migrations and local file lifecycle.",
      tags: ["storage", "sqlite"],
      participants: [{ name: "Tester", role: "author" }],
    });

    writeADR(projectRoot, adr);
    const store = new SQLiteStore(projectRoot);
    store.insertADR({
      ...adr,
      bodyMdPath: join(projectRoot, adr.bodyMdPath),
    });
    store.close();
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it("lists tools and returns structured decision search results", async () => {
    const server = createArchLensMcpServer(projectRoot);
    const client = new Client({ name: "archlens-test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toContain("query_decisions");

    const result = await client.callTool({
      name: "query_decisions",
      arguments: {
        query: "sqlite local metadata",
        limit: 5,
      },
    });

    const structured = "structuredContent" in result ? result.structuredContent : undefined;
    const payload = structured as { results?: Array<{ title: string }> } | undefined;
    expect(payload?.results?.[0]?.title).toContain("SQLite");

    await Promise.all([client.close(), server.close()]);
  });

  it("returns structural impact hints for diffs", async () => {
    const server = createArchLensMcpServer(projectRoot);
    const client = new Client({ name: "archlens-test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

    const result = await client.callTool({
      name: "get_impact_preview",
      arguments: {
        diff: [
          "diff --git a/package.json b/package.json",
          "+++ b/package.json",
          "@@",
          '+    "better-sqlite3": "^11.10.0"',
        ].join("\n"),
      },
    });

    const structured = "structuredContent" in result ? result.structuredContent : undefined;
    const payload = structured as
      | { signalTypes?: string[]; relatedDecisionIds?: string[] }
      | undefined;
    expect(payload?.signalTypes).toContain("dependency_change");
    expect(payload?.relatedDecisionIds?.length).toBeGreaterThan(0);

    await Promise.all([client.close(), server.close()]);
  });
});
