import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";

import type { ADR } from "../shared/types/adr.js";
import type { DriftEvent } from "../shared/types/drift.js";
import type { StructuralSnapshot } from "../shared/types/snapshot.js";
import { up as migration001 } from "./migrations/001-initial-schema.js";

type DatabaseRow = Record<string, unknown>;

export class SQLiteStore {
  private readonly db: Database.Database;

  constructor(projectRoot: string) {
    const dataDir = join(projectRoot, ".archlens");
    mkdirSync(dataDir, { recursive: true });
    this.db = new Database(resolveStorePath(projectRoot));
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.runMigrations();
  }

  hasSchema(): boolean {
    const result = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'decisions'")
      .get() as DatabaseRow | undefined;
    return result !== undefined;
  }

  insertADR(adr: ADR): void {
    const bodyJson = JSON.stringify(adr.body);
    const tags = JSON.stringify(adr.tags);
    const supersedes = JSON.stringify(adr.supersedes);
    const participants = JSON.stringify(adr.participants);

    this.db
      .prepare(`
        INSERT OR REPLACE INTO decisions
          (id, draft_id, title, status, created_at, tags, supersedes, participants, body_json, body_md_path, schema_version)
        VALUES
          (@id, @draftId, @title, @status, @date, @tags, @supersedes, @participants, @bodyJson, @bodyMdPath, @schemaVersion)
      `)
      .run({
        id: adr.id,
        draftId: adr.draftId,
        title: adr.title,
        status: adr.status,
        date: adr.date,
        tags,
        supersedes,
        participants,
        bodyJson,
        bodyMdPath: adr.bodyMdPath,
        schemaVersion: adr.schemaVersion,
      });

    this.db.prepare("DELETE FROM decisions_fts WHERE id = ?").run(adr.id);
    this.db
      .prepare("INSERT INTO decisions_fts (id, title, body_text, tags) VALUES (?, ?, ?, ?)")
      .run(adr.id, adr.title, Object.values(adr.body).join("\n\n"), adr.tags.join(" "));
  }

  getADR(id: string): ADR | null {
    const row = this.db
      .prepare("SELECT * FROM decisions WHERE id = ? OR draft_id = ?")
      .get(id, id) as DatabaseRow | undefined;
    return row ? this.rowToADR(row) : null;
  }

  listADRs(status?: ADR["status"]): ADR[] {
    const rows = status
      ? (this.db
          .prepare("SELECT * FROM decisions WHERE status = ? ORDER BY created_at DESC")
          .all(status) as DatabaseRow[])
      : (this.db
          .prepare("SELECT * FROM decisions ORDER BY created_at DESC")
          .all() as DatabaseRow[]);
    return rows.map((row) => this.rowToADR(row));
  }

  searchADRs(query: string, limit = 5): ADR[] {
    try {
      const rows = this.db
        .prepare(`
          SELECT d.* FROM decisions d
          JOIN decisions_fts fts ON d.id = fts.id
          WHERE decisions_fts MATCH ?
          LIMIT ?
        `)
        .all(query, limit) as DatabaseRow[];
      return rows.map((row) => this.rowToADR(row));
    } catch {
      const likeQuery = `%${query.replace(/\s+/g, "%")}%`;
      const rows = this.db
        .prepare(`
          SELECT * FROM decisions
          WHERE title LIKE ? OR body_json LIKE ?
          ORDER BY created_at DESC
          LIMIT ?
        `)
        .all(likeQuery, likeQuery, limit) as DatabaseRow[];
      return rows.map((row) => this.rowToADR(row));
    }
  }

  listDriftEvents(severity?: DriftEvent["severity"]): DriftEvent[] {
    const rows = severity
      ? (this.db
          .prepare(
            "SELECT * FROM drift_events WHERE severity = ? AND resolved = 0 ORDER BY detected_at DESC",
          )
          .all(severity) as DatabaseRow[])
      : (this.db
          .prepare("SELECT * FROM drift_events WHERE resolved = 0 ORDER BY detected_at DESC")
          .all() as DatabaseRow[]);

    return rows.map((row) => {
      const event: DriftEvent = {
        id: String(row.id),
        detectedAt: String(row.detected_at),
        type: row.event_type as DriftEvent["type"],
        severity: row.severity as DriftEvent["severity"],
        description: String(row.description),
        affectedPaths: JSON.parse(String(row.affected_paths)) as string[],
        resolved: Boolean(row.resolved),
      };

      if (row.adr_id) {
        event.adrId = String(row.adr_id);
      }

      return event;
    });
  }

  insertSnapshot(snapshot: StructuralSnapshot): void {
    this.db
      .prepare(`
        INSERT OR REPLACE INTO structural_snapshots
          (id, commit_sha, captured_at, module_graph, dep_manifest, patterns, api_contracts, language_stats)
        VALUES
          (@id, @commitSha, @capturedAt, @moduleGraph, @depManifest, @patterns, @apiContracts, @languageStats)
      `)
      .run({
        id: snapshot.id,
        commitSha: snapshot.commitSha ?? null,
        capturedAt: snapshot.capturedAt,
        moduleGraph: JSON.stringify(snapshot.moduleGraph),
        depManifest: JSON.stringify(snapshot.depManifest),
        patterns: JSON.stringify(snapshot.patterns),
        apiContracts: JSON.stringify(snapshot.apiContracts),
        languageStats: JSON.stringify(snapshot.languageStats),
      });
  }

  getLatestSnapshot(): StructuralSnapshot | null {
    const row = this.db
      .prepare("SELECT * FROM structural_snapshots ORDER BY captured_at DESC LIMIT 1")
      .get() as DatabaseRow | undefined;

    if (!row) {
      return null;
    }

    const snapshot: StructuralSnapshot = {
      id: String(row.id),
      capturedAt: String(row.captured_at),
      moduleGraph: JSON.parse(String(row.module_graph)) as StructuralSnapshot["moduleGraph"],
      depManifest: JSON.parse(String(row.dep_manifest)) as StructuralSnapshot["depManifest"],
      patterns: JSON.parse(String(row.patterns)) as StructuralSnapshot["patterns"],
      apiContracts: JSON.parse(String(row.api_contracts)) as StructuralSnapshot["apiContracts"],
      languageStats: JSON.parse(String(row.language_stats)) as StructuralSnapshot["languageStats"],
    };

    if (row.commit_sha) {
      snapshot.commitSha = String(row.commit_sha);
    }

    return snapshot;
  }

  insertDriftEvent(event: DriftEvent): void {
    this.db
      .prepare(`
        INSERT OR REPLACE INTO drift_events
          (id, detected_at, event_type, severity, adr_id, description, affected_paths, resolved)
        VALUES
          (@id, @detectedAt, @type, @severity, @adrId, @description, @affectedPaths, @resolved)
      `)
      .run({
        id: event.id,
        detectedAt: event.detectedAt,
        type: event.type,
        severity: event.severity,
        adrId: event.adrId ?? null,
        description: event.description,
        affectedPaths: JSON.stringify(event.affectedPaths),
        resolved: event.resolved ? 1 : 0,
      });
  }

  resolveDriftEvents(eventIds?: string[]): number {
    if (eventIds && eventIds.length > 0) {
      const placeholders = eventIds.map(() => "?").join(", ");
      const result = this.db
        .prepare(
          `UPDATE drift_events SET resolved = 1, resolved_at = ? WHERE id IN (${placeholders}) AND resolved = 0`,
        )
        .run(new Date().toISOString(), ...eventIds);
      return Number(result.changes);
    }

    const result = this.db
      .prepare("UPDATE drift_events SET resolved = 1, resolved_at = ? WHERE resolved = 0")
      .run(new Date().toISOString());
    return Number(result.changes);
  }

  close(): void {
    this.db.close();
  }

  private runMigrations(): void {
    migration001(this.db);
    this.db
      .prepare("INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (1, ?)")
      .run(new Date().toISOString());
  }

  private rowToADR(row: DatabaseRow): ADR {
    return {
      id: String(row.id),
      draftId: String(row.draft_id),
      title: String(row.title),
      status: row.status as ADR["status"],
      date: String(row.created_at),
      participants: JSON.parse(String(row.participants)) as ADR["participants"],
      supersedes: JSON.parse(String(row.supersedes)) as string[],
      tags: JSON.parse(String(row.tags)) as string[],
      body: JSON.parse(String(row.body_json)) as ADR["body"],
      bodyMdPath: String(row.body_md_path),
      schemaVersion: Number(row.schema_version),
    };
  }
}

export function storeExists(projectRoot: string): boolean {
  return existsSync(join(projectRoot, ".archlens", "archlens.db"))
    || existsSync(join(projectRoot, ".archlens", "store.db"));
}

function resolveStorePath(projectRoot: string): string {
  const dataDir = join(projectRoot, ".archlens");
  const currentPath = join(dataDir, "archlens.db");
  const legacyPath = join(dataDir, "store.db");

  if (existsSync(currentPath)) {
    return currentPath;
  }

  if (existsSync(legacyPath)) {
    copyFileSync(legacyPath, currentPath);
    return currentPath;
  }

  return currentPath;
}
