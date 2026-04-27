import type { Database } from "better-sqlite3";

export function up(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS decisions (
      id TEXT PRIMARY KEY,
      draft_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('draft','accepted','superseded','deprecated')),
      created_at TEXT NOT NULL,
      merged_at TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      supersedes TEXT NOT NULL DEFAULT '[]',
      participants TEXT NOT NULL DEFAULT '[]',
      body_json TEXT NOT NULL,
      body_md_path TEXT NOT NULL,
      schema_version INTEGER NOT NULL DEFAULT 1
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS decisions_fts USING fts5(
      id UNINDEXED,
      title,
      body_text,
      tags
    );

    CREATE TABLE IF NOT EXISTS structural_snapshots (
      id TEXT PRIMARY KEY,
      commit_sha TEXT,
      captured_at TEXT NOT NULL,
      module_graph TEXT NOT NULL DEFAULT '{}',
      dep_manifest TEXT NOT NULL DEFAULT '{}',
      patterns TEXT NOT NULL DEFAULT '{}',
      api_contracts TEXT NOT NULL DEFAULT '{}',
      language_stats TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS drift_events (
      id TEXT PRIMARY KEY,
      detected_at TEXT NOT NULL,
      event_type TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('info','warning','error')),
      adr_id TEXT REFERENCES decisions(id),
      description TEXT NOT NULL,
      affected_paths TEXT NOT NULL DEFAULT '[]',
      resolved INTEGER NOT NULL DEFAULT 0,
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
}
