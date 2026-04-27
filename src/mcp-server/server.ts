import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";

import { resolveProjectRoot } from "../shared/utils/paths.js";
import { SQLiteStore } from "../storage/sqlite-store.js";
import { getImpactPreview } from "./impact-analyzer.js";

export function createArchLensMcpServer(projectRoot = resolveProjectRoot()): McpServer {
  const server = new McpServer({
    name: "archlens",
    version: "0.1.0",
  });

  server.registerTool(
    "query_decisions",
    {
      description: "Search local architecture decision records by natural language query.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe("Natural language question about architectural decisions"),
        limit: z.number().int().positive().max(20).default(5),
        status_filter: z
          .array(z.enum(["draft", "accepted", "superseded", "deprecated"]))
          .optional(),
      },
      outputSchema: {
        results: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            status: z.enum(["draft", "accepted", "superseded", "deprecated"]),
            date: z.string(),
            tags: z.array(z.string()),
            summary: z.string(),
            bodyMdPath: z.string(),
          }),
        ),
      },
    },
    async ({ query, limit, status_filter }) => {
      const store = new SQLiteStore(projectRoot);
      const matches = store
        .searchADRs(query, limit)
        .filter((adr) => !status_filter || status_filter.includes(adr.status));
      store.close();

      const results = matches.map((adr) => ({
        id: adr.id,
        title: adr.title,
        status: adr.status,
        date: adr.date,
        tags: adr.tags,
        summary: [adr.body.context, adr.body.decision].filter(Boolean).join(" ").slice(0, 300),
        bodyMdPath: adr.bodyMdPath,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ results }, null, 2),
          },
        ],
        structuredContent: { results },
      };
    },
  );

  server.registerTool(
    "get_impact_preview",
    {
      description: "Inspect a proposed diff and summarize likely architectural impact.",
      inputSchema: {
        diff: z.string().min(1).describe("Unified diff of the proposed change"),
        context: z
          .string()
          .optional()
          .describe("Optional human or agent description of the intended change"),
      },
      outputSchema: {
        summary: z.string(),
        signalTypes: z.array(z.string()),
        affectedPaths: z.array(z.string()),
        relatedDecisionIds: z.array(z.string()),
      },
    },
    async ({ diff, context }) => {
      const store = new SQLiteStore(projectRoot);
      const decisions = store.listADRs();
      store.close();

      const preview = getImpactPreview(context ? `${context}\n\n${diff}` : diff, decisions);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(preview, null, 2),
          },
        ],
        structuredContent: preview,
      };
    },
  );

  server.registerTool(
    "list_drift_events",
    {
      description: "List unresolved architecture drift events recorded locally.",
      inputSchema: {
        severity: z.enum(["info", "warning", "error"]).optional(),
      },
      outputSchema: {
        events: z.array(
          z.object({
            id: z.string(),
            type: z.string(),
            severity: z.enum(["info", "warning", "error"]),
            description: z.string(),
            affectedPaths: z.array(z.string()),
          }),
        ),
      },
    },
    async ({ severity }) => {
      const store = new SQLiteStore(projectRoot);
      const events = store.listDriftEvents(severity).map((event) => ({
        id: event.id,
        type: event.type,
        severity: event.severity,
        description: event.description,
        affectedPaths: event.affectedPaths,
      }));
      store.close();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ events }, null, 2),
          },
        ],
        structuredContent: { events },
      };
    },
  );

  return server;
}

export async function startArchLensMcpServer(projectRoot = resolveProjectRoot()): Promise<void> {
  const server = createArchLensMcpServer(projectRoot);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
