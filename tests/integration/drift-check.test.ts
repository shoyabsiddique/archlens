import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { initializeProject } from "../../src/cli/project.js";
import { analyzeDrift } from "../../src/drift-detector/drift-analyzer.js";
import { buildStructuralSnapshot } from "../../src/drift-detector/snapshot-builder.js";
import { createArchLensMcpServer } from "../../src/mcp-server/server.js";
import { SQLiteStore } from "../../src/storage/sqlite-store.js";

describe("drift detection workflow", () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), "archlens-drift-"));
    mkdirSync(join(projectRoot, ".git", "hooks"), { recursive: true });
    mkdirSync(join(projectRoot, "src"), { recursive: true });

    writeFileSync(
      join(projectRoot, "package.json"),
      `${JSON.stringify(
        {
          name: "fixture",
          version: "1.0.0",
          dependencies: {
            zod: "^3.25.76",
          },
        },
        null,
        2,
      )}\n`,
    );
    writeFileSync(
      join(projectRoot, "src", "index.ts"),
      'import { z } from "zod";\nexport const schema = z.string();\n',
    );

    initializeProject(projectRoot);

    const store = new SQLiteStore(projectRoot);
    store.insertSnapshot(buildStructuralSnapshot(projectRoot));
    store.close();
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it("records drift and exposes it through the MCP server", async () => {
    writeFileSync(
      join(projectRoot, "package.json"),
      `${JSON.stringify(
        {
          name: "fixture",
          version: "1.0.0",
          dependencies: {
            zod: "^3.25.76",
            commander: "^14.0.0",
          },
        },
        null,
        2,
      )}\n`,
    );
    writeFileSync(join(projectRoot, "src", "feature.ts"), 'export const feature = "new";\n');

    const store = new SQLiteStore(projectRoot);
    const previous = store.getLatestSnapshot();
    const current = buildStructuralSnapshot(projectRoot);
    expect(previous).not.toBeNull();
    if (!previous) {
      throw new Error("Expected a baseline snapshot to exist before drift analysis.");
    }

    const result = analyzeDrift(previous, current);
    for (const event of result.events) {
      store.insertDriftEvent(event);
    }
    store.close();

    const server = createArchLensMcpServer(projectRoot);
    const client = new Client({ name: "archlens-drift-test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

    const response = await client.callTool({
      name: "list_drift_events",
      arguments: {},
    });

    const structured = "structuredContent" in response ? response.structuredContent : undefined;
    const payload = structured as { events?: Array<{ type: string }> } | undefined;

    expect(payload?.events?.some((event) => event.type === "dependency_added")).toBe(true);
    expect(payload?.events?.some((event) => event.type === "pattern_introduced")).toBe(true);

    await Promise.all([client.close(), server.close()]);
  });
});
