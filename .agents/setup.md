# ArchLens — Project Setup Guide

This document walks you through setting up the ArchLens development environment
from zero to a running, testable codebase. Follow it in order the first time.

---

## Prerequisites

Make sure these are installed before you start:

| Tool | Minimum Version | Check |
|---|---|---|
| Node.js | 20 LTS | `node --version` |
| npm | 10+ | `npm --version` |
| git | 2.30+ | `git --version` |
| Ollama (optional, for local LLM) | latest | `ollama --version` |

Install Node.js via [nvm](https://github.com/nvm-sh/nvm) — never via your system package manager.
You'll thank yourself when you need to switch versions later.

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
nvm use 20
nvm alias default 20
```

---

## 1. Initialize the Repository

```bash
# Create the project
mkdir archlens
cd archlens
git init
git branch -M main

# Initialize npm (generates package.json)
npm init -y
```

---

## 2. Configure package.json

Replace the generated `package.json` with this:

```json
{
  "name": "archlens",
  "version": "0.1.0",
  "description": "Architectural decision intelligence for AI-assisted development",
  "type": "module",
  "bin": {
    "archlens": "./dist/cli/index.js"
  },
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "tsup",
    "build:watch": "tsup --watch",
    "dev": "tsx src/cli/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run build && npm run test"
  },
  "keywords": [
    "architecture",
    "adr",
    "ai",
    "mcp",
    "developer-tools",
    "git-hooks"
  ],
  "license": "MIT",
  "engines": {
    "node": ">=20.0.0"
  }
}
```

---

## 3. Install Dependencies

```bash
# Core runtime dependencies
npm install \
  better-sqlite3 \
  @modelcontextprotocol/sdk \
  @anthropic-ai/sdk \
  openai \
  ink \
  ink-spinner \
  react \
  chalk \
  commander \
  tree-sitter \
  tree-sitter-javascript \
  tree-sitter-typescript \
  tree-sitter-python \
  tree-sitter-go \
  dependency-cruiser \
  js-yaml \
  glob \
  execa \
  p-queue \
  zod

# Dev dependencies
npm install -D \
  typescript \
  tsup \
  tsx \
  vitest \
  @vitest/coverage-v8 \
  @biomejs/biome \
  @types/node \
  @types/react \
  @types/better-sqlite3 \
  @types/js-yaml \
  @types/ink
```

---

## 4. TypeScript Configuration

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

---

## 5. Build Configuration (tsup)

Create `tsup.config.ts`:

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'cli/index': 'src/cli/index.ts',
    index: 'src/index.ts',
    'merge-driver/index': 'src/merge-driver/index.ts',
  },
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  banner: {
    // Required for ink / React in ESM CLI context
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  esbuildOptions(options) {
    options.conditions = ['node'];
  },
});
```

---

## 6. Linter Configuration (Biome)

Create `biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noExplicitAny": "error"
      },
      "style": {
        "useConst": "error",
        "noNonNullAssertion": "warn"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "files": {
    "ignore": ["dist/**", "node_modules/**", "coverage/**"]
  }
}
```

---

## 7. Test Configuration (Vitest)

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'src/cli/**',          // CLI tested via integration, not unit
        '**/*.test.ts',
        '**/*.d.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    testTimeout: 30000,        // LLM mocks can be slow
  },
});
```

---

## 8. Project Directory Structure

Create all the directories now so the structure is clear before you write a single file:

```bash
mkdir -p \
  src/interceptor \
  src/adr-engine/adapters \
  src/adr-engine/templates \
  src/drift-detector/grammars \
  src/storage \
  src/mcp-server/handlers \
  src/merge-driver \
  src/collaboration \
  src/cli/commands \
  src/cli/components \
  src/shared/types \
  src/shared/errors \
  src/shared/utils \
  tests/unit/interceptor \
  tests/unit/adr-engine \
  tests/unit/drift-detector \
  tests/unit/storage \
  tests/unit/mcp-server \
  tests/unit/merge-driver \
  tests/integration \
  tests/fixtures/repos \
  tests/fixtures/adrs \
  docs/decisions \
  .archlens
```

The full intended layout looks like this:

```
archlens/
├── src/
│   ├── index.ts                        # Public API entry point
│   │
│   ├── interceptor/
│   │   ├── index.ts
│   │   ├── git-hook-interceptor.ts     # Reads git diff, emits ChangeSignal
│   │   ├── mcp-bridge-interceptor.ts   # Observes MCP tool calls
│   │   ├── signal-classifier.ts        # Decides if a change is structural
│   │   └── manifest-parser.ts          # Parses package.json, go.mod, etc.
│   │
│   ├── adr-engine/
│   │   ├── index.ts
│   │   ├── prompt-builder.ts           # Constructs LLM prompts
│   │   ├── adr-formatter.ts            # LLM output → valid ADR Markdown
│   │   ├── adr-writer.ts               # Atomic file writes
│   │   └── adapters/
│   │       ├── llm-adapter.ts          # Interface definition
│   │       ├── ollama-adapter.ts
│   │       ├── claude-adapter.ts
│   │       ├── openai-adapter.ts
│   │       └── groq-adapter.ts
│   │
│   ├── drift-detector/
│   │   ├── index.ts
│   │   ├── snapshot-builder.ts         # Builds StructuralSnapshot via tree-sitter
│   │   ├── drift-analyzer.ts           # Compares snapshot vs ADR index
│   │   ├── language-registry.ts        # Maps extensions → grammars
│   │   └── grammars/
│   │       ├── javascript.ts
│   │       ├── typescript.ts
│   │       ├── python.ts
│   │       └── go.ts
│   │
│   ├── storage/
│   │   ├── index.ts
│   │   ├── sqlite-store.ts             # All DB operations
│   │   ├── file-store.ts               # Atomic filesystem writes
│   │   ├── lock-store.ts               # Domain lock files
│   │   └── migrations/
│   │       ├── runner.ts
│   │       └── 001-initial-schema.ts
│   │
│   ├── mcp-server/
│   │   ├── index.ts
│   │   ├── server.ts                   # MCP protocol, connection handling
│   │   ├── semantic-search.ts          # FTS5 search over ADR index
│   │   ├── impact-analyzer.ts          # diff → structural impact summary
│   │   └── handlers/
│   │       ├── query-decisions.ts
│   │       ├── get-impact-preview.ts
│   │       ├── list-drift-events.ts
│   │       ├── add-manual-adr.ts
│   │       └── list-domain-locks.ts
│   │
│   ├── merge-driver/
│   │   ├── index.ts
│   │   ├── index-merger.ts             # Unions two index.json files
│   │   ├── file-renamer.ts             # draft → ADR-NNN rename
│   │   └── conflict-detector.ts        # Finds mutually exclusive ADRs
│   │
│   ├── collaboration/
│   │   ├── index.ts
│   │   ├── participant-tracker.ts      # git co-authors + agent identity
│   │   └── domain-lock-manager.ts      # Lock acquisition and release
│   │
│   ├── cli/
│   │   ├── index.ts                    # Entry point, commander setup
│   │   ├── commands/
│   │   │   ├── init.ts
│   │   │   ├── log.ts
│   │   │   ├── show.ts
│   │   │   ├── check.ts
│   │   │   ├── resolve.ts
│   │   │   ├── capture.ts
│   │   │   ├── serve.ts
│   │   │   ├── report.ts
│   │   │   ├── locks.ts
│   │   │   └── config.ts
│   │   └── components/                 # ink React components
│   │       ├── adr-diff-view.tsx
│   │       ├── drift-event-list.tsx
│   │       ├── resolve-wizard.tsx
│   │       └── spinner.tsx
│   │
│   └── shared/
│       ├── types/
│       │   ├── adr.ts                  # ADR, ADRDraft, ADRStatus types
│       │   ├── signals.ts              # ChangeSignal type
│       │   ├── drift.ts                # DriftEvent, DriftEventType types
│       │   ├── snapshot.ts             # StructuralSnapshot type
│       │   └── config.ts               # ArchLensConfig type
│       ├── errors/
│       │   └── index.ts                # Typed error classes
│       └── utils/
│           ├── hash.ts                 # Content hash generation
│           ├── paths.ts                # POSIX path normalization
│           └── logger.ts              # Structured logger
│
├── tests/
│   ├── unit/
│   │   └── ...                         # Mirrors src/ structure
│   ├── integration/
│   │   ├── full-pipeline.test.ts
│   │   ├── merge-driver.test.ts
│   │   └── mcp-server.test.ts
│   └── fixtures/
│       ├── repos/                      # Temporary git repos for tests
│       └── adrs/                       # Sample ADR files
│
├── docs/
│   └── decisions/                      # ArchLens dogfoods itself
│
├── .archlens/
│   └── config.json                     # Bootstrap config (no LLM key)
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── archlens.yml                # Drift check on PRs
│
├── biome.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── package.json
├── .gitignore
├── .gitattributes
├── README.md
├── CONTRIBUTING.md
└── LICENSE
```

---

## 9. Core Type Definitions

These are the shared types every module depends on. Write these first —
they are your contracts. Create `src/shared/types/`:

**`src/shared/types/config.ts`**
```typescript
import { z } from 'zod';

export const LLMProviderSchema = z.enum(['ollama', 'claude', 'openai', 'groq']);

export const ArchLensConfigSchema = z.object({
  llm: z.object({
    provider: LLMProviderSchema.default('ollama'),
    model: z.string().default('llama3.2'),
    api_key: z.string().optional(),
    base_url: z.string().optional(),
  }),
  detection: z.object({
    watch_paths: z.array(z.string()).default(['src', 'lib', 'pkg']),
    ignore_paths: z.array(z.string()).default(['node_modules', 'dist', '.git']),
    disabled_signal_types: z.array(z.string()).default([]),
  }).default({}),
  adr: z.object({
    output_dir: z.string().default('docs/decisions'),
    prompt_template: z.string().optional(),
  }).default({}),
  locks: z.object({
    ttl_hours: z.number().default(4),
  }).default({}),
  mcp: z.object({
    socket_path: z.string().optional(),
    port: z.number().optional(),
  }).default({}),
});

export type ArchLensConfig = z.infer<typeof ArchLensConfigSchema>;
export type LLMProvider = z.infer<typeof LLMProviderSchema>;
```

**`src/shared/types/signals.ts`**
```typescript
export type SignalType =
  | 'dependency_added'
  | 'dependency_removed'
  | 'new_module'
  | 'api_contract_changed'
  | 'schema_changed'
  | 'import_graph_changed';

export interface ChangeSignal {
  type: SignalType;
  affectedPaths: string[];
  diff: string;
  commitSha: string;
  commitMessage: string;
  timestamp: string;         // ISO-8601
  authors: Author[];
  agentName?: string;        // present if triggered via MCP bridge
}

export interface Author {
  name: string;
  email: string;
  role: 'author' | 'co-author';
}
```

**`src/shared/types/adr.ts`**
```typescript
export type ADRStatus = 'draft' | 'accepted' | 'superseded' | 'deprecated';

export interface ADRParticipant {
  name: string;
  role: 'author' | 'reviewer' | 'ai-agent';
}

export interface ADR {
  id: string;               // "ADR-007" or "ADR-draft-{hash}"
  draftId: string;          // content hash, always present
  title: string;
  status: ADRStatus;
  date: string;             // ISO-8601
  participants: ADRParticipant[];
  supersedes: string[];
  tags: string[];
  body: ADRBody;
  bodyMdPath: string;
  bodyJsonPath: string;
  schemaVersion: number;
}

export interface ADRBody {
  context: string;
  decision: string;
  rationale: string;
  tradeoffs: string;
  consequences: string;
}

export interface ADRDraft extends Omit<ADR, 'id'> {
  id: string;               // still "ADR-draft-{hash}" at this point
}
```

**`src/shared/types/drift.ts`**
```typescript
export type DriftEventType =
  | 'dependency_added'
  | 'dependency_removed'
  | 'pattern_introduced'
  | 'pattern_abandoned'
  | 'contract_broken'
  | 'boundary_crossed'
  | 'adr_orphaned'
  | 'structural_conflict';

export type DriftSeverity = 'info' | 'warning' | 'error';

export interface DriftEvent {
  id: string;
  detectedAt: string;       // ISO-8601
  type: DriftEventType;
  severity: DriftSeverity;
  adrId?: string;
  description: string;
  affectedPaths: string[];
  resolved: boolean;
}
```

**`src/shared/types/snapshot.ts`**
```typescript
export interface StructuralSnapshot {
  id: string;
  commitSha?: string;
  capturedAt: string;
  moduleGraph: Record<string, string[]>;     // module → [imports]
  depManifest: Record<string, string>;       // name → version
  patterns: Record<string, string[]>;        // pattern → [locations]
  apiContracts: Record<string, string>;      // contract id → fingerprint
  languageStats: Record<string, number>;     // lang → file count
}
```

---

## 10. Bootstrap Config

Create `.archlens/config.json`:

```json
{
  "llm": {
    "provider": "ollama",
    "model": "llama3.2"
  },
  "detection": {
    "watch_paths": ["src", "lib"],
    "ignore_paths": ["node_modules", "dist", ".git", "coverage"],
    "disabled_signal_types": []
  },
  "adr": {
    "output_dir": "docs/decisions"
  },
  "locks": {
    "ttl_hours": 4
  },
  "mcp": {}
}
```

---

## 11. .gitignore

```
# Dependencies
node_modules/

# Build output
dist/
coverage/

# ArchLens runtime files (keep config and decisions, ignore runtime state)
.archlens/store.db
.archlens/store.db-wal
.archlens/store.db-shm
.archlens/error.log
.archlens/capture.queue
.archlens/locks/

# Env / secrets
.env
.env.local
.env.*.local

# OS
.DS_Store
Thumbs.db

# Editor
.vscode/settings.json
.idea/
*.swp
```

---

## 12. .gitattributes

```
# ArchLens merge driver — prevents index.json conflicts on branch merges
docs/decisions/index.json merge=archlens-index

# Normalize line endings
* text=auto
*.ts text eol=lf
*.json text eol=lf
*.md text eol=lf
```

---

## 13. Storage Module (Start Here)

The storage module is the foundation everything else builds on.
Write it first so every other module has something real to call.

**`src/storage/migrations/001-initial-schema.ts`**
```typescript
import type { Database } from 'better-sqlite3';

export function up(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS decisions (
      id              TEXT PRIMARY KEY,
      draft_id        TEXT UNIQUE NOT NULL,
      title           TEXT NOT NULL,
      status          TEXT NOT NULL CHECK(status IN ('draft','accepted','superseded','deprecated')),
      created_at      TEXT NOT NULL,
      merged_at       TEXT,
      tags            TEXT NOT NULL DEFAULT '[]',
      supersedes      TEXT NOT NULL DEFAULT '[]',
      participants    TEXT NOT NULL DEFAULT '[]',
      body_md_path    TEXT NOT NULL,
      body_json_path  TEXT NOT NULL,
      schema_version  INTEGER NOT NULL DEFAULT 1
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS decisions_fts USING fts5(
      id UNINDEXED,
      title,
      body_text,
      tags,
      content='decisions'
    );

    CREATE TABLE IF NOT EXISTS structural_snapshots (
      id              TEXT PRIMARY KEY,
      commit_sha      TEXT,
      captured_at     TEXT NOT NULL,
      module_graph    TEXT NOT NULL DEFAULT '{}',
      dep_manifest    TEXT NOT NULL DEFAULT '{}',
      patterns        TEXT NOT NULL DEFAULT '{}',
      api_contracts   TEXT NOT NULL DEFAULT '{}',
      language_stats  TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS drift_events (
      id              TEXT PRIMARY KEY,
      detected_at     TEXT NOT NULL,
      event_type      TEXT NOT NULL,
      severity        TEXT NOT NULL CHECK(severity IN ('info','warning','error')),
      adr_id          TEXT REFERENCES decisions(id),
      description     TEXT NOT NULL,
      affected_paths  TEXT NOT NULL DEFAULT '[]',
      resolved        INTEGER NOT NULL DEFAULT 0,
      resolved_at     TEXT
    );

    CREATE TABLE IF NOT EXISTS domain_locks (
      domain          TEXT PRIMARY KEY,
      holder_agent    TEXT NOT NULL,
      session_id      TEXT NOT NULL,
      acquired_at     TEXT NOT NULL,
      expires_at      TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schema_migrations (
      version         INTEGER PRIMARY KEY,
      applied_at      TEXT NOT NULL
    );
  `);
}
```

**`src/storage/sqlite-store.ts`**
```typescript
import Database from 'better-sqlite3';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import type { ADR, ADRDraft } from '../shared/types/adr.js';
import type { DriftEvent } from '../shared/types/drift.js';
import type { StructuralSnapshot } from '../shared/types/snapshot.js';
import { up as migration001 } from './migrations/001-initial-schema.js';

export class SQLiteStore {
  private db: Database.Database;

  constructor(projectRoot: string) {
    const storePath = join(projectRoot, '.archlens');
    mkdirSync(storePath, { recursive: true });

    this.db = new Database(join(storePath, 'store.db'));
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.runMigrations();
  }

  private runMigrations(): void {
    migration001(this.db);
    const now = new Date().toISOString();
    this.db
      .prepare(`INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (1, ?)`)
      .run(now);
  }

  // --- ADR Operations ---

  insertADR(adr: ADRDraft): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO decisions
        (id, draft_id, title, status, created_at, tags, supersedes,
         participants, body_md_path, body_json_path, schema_version)
      VALUES
        (@id, @draftId, @title, @status, @date, @tags, @supersedes,
         @participants, @bodyMdPath, @bodyJsonPath, @schemaVersion)
    `).run({
      id: adr.id,
      draftId: adr.draftId,
      title: adr.title,
      status: adr.status,
      date: adr.date,
      tags: JSON.stringify(adr.tags),
      supersedes: JSON.stringify(adr.supersedes),
      participants: JSON.stringify(adr.participants),
      bodyMdPath: adr.bodyMdPath,
      bodyJsonPath: adr.bodyJsonPath,
      schemaVersion: adr.schemaVersion,
    });
  }

  getADR(id: string): ADR | null {
    const row = this.db
      .prepare('SELECT * FROM decisions WHERE id = ? OR draft_id = ?')
      .get(id, id) as Record<string, unknown> | undefined;

    return row ? this.rowToADR(row) : null;
  }

  listADRs(status?: string): ADR[] {
    const rows = status
      ? (this.db.prepare('SELECT * FROM decisions WHERE status = ? ORDER BY created_at DESC').all(status) as Record<string, unknown>[])
      : (this.db.prepare('SELECT * FROM decisions ORDER BY created_at DESC').all() as Record<string, unknown>[]);
    return rows.map(r => this.rowToADR(r));
  }

  searchADRs(query: string, limit = 5): ADR[] {
    const rows = this.db.prepare(`
      SELECT d.* FROM decisions d
      JOIN decisions_fts fts ON d.id = fts.id
      WHERE decisions_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `).all(query, limit) as Record<string, unknown>[];
    return rows.map(r => this.rowToADR(r));
  }

  // --- Snapshot Operations ---

  insertSnapshot(snapshot: StructuralSnapshot): void {
    this.db.prepare(`
      INSERT INTO structural_snapshots
        (id, commit_sha, captured_at, module_graph, dep_manifest,
         patterns, api_contracts, language_stats)
      VALUES
        (@id, @commitSha, @capturedAt, @moduleGraph, @depManifest,
         @patterns, @apiContracts, @languageStats)
    `).run({
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
      .prepare('SELECT * FROM structural_snapshots ORDER BY captured_at DESC LIMIT 1')
      .get() as Record<string, unknown> | undefined;

    if (!row) return null;
    return {
      id: row['id'] as string,
      commitSha: row['commit_sha'] as string | undefined,
      capturedAt: row['captured_at'] as string,
      moduleGraph: JSON.parse(row['module_graph'] as string),
      depManifest: JSON.parse(row['dep_manifest'] as string),
      patterns: JSON.parse(row['patterns'] as string),
      apiContracts: JSON.parse(row['api_contracts'] as string),
      languageStats: JSON.parse(row['language_stats'] as string),
    };
  }

  // --- Drift Event Operations ---

  insertDriftEvent(event: DriftEvent): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO drift_events
        (id, detected_at, event_type, severity, adr_id, description, affected_paths)
      VALUES
        (@id, @detectedAt, @type, @severity, @adrId, @description, @affectedPaths)
    `).run({
      id: event.id,
      detectedAt: event.detectedAt,
      type: event.type,
      severity: event.severity,
      adrId: event.adrId ?? null,
      description: event.description,
      affectedPaths: JSON.stringify(event.affectedPaths),
    });
  }

  listDriftEvents(severity?: string): DriftEvent[] {
    const rows = severity
      ? (this.db.prepare('SELECT * FROM drift_events WHERE severity = ? AND resolved = 0 ORDER BY detected_at DESC').all(severity) as Record<string, unknown>[])
      : (this.db.prepare('SELECT * FROM drift_events WHERE resolved = 0 ORDER BY detected_at DESC').all() as Record<string, unknown>[]);
    return rows.map(r => ({
      id: r['id'] as string,
      detectedAt: r['detected_at'] as string,
      type: r['event_type'] as DriftEvent['type'],
      severity: r['severity'] as DriftEvent['severity'],
      adrId: r['adr_id'] as string | undefined,
      description: r['description'] as string,
      affectedPaths: JSON.parse(r['affected_paths'] as string),
      resolved: Boolean(r['resolved']),
    }));
  }

  close(): void {
    this.db.close();
  }

  private rowToADR(row: Record<string, unknown>): ADR {
    return {
      id: row['id'] as string,
      draftId: row['draft_id'] as string,
      title: row['title'] as string,
      status: row['status'] as ADR['status'],
      date: row['created_at'] as string,
      participants: JSON.parse(row['participants'] as string),
      supersedes: JSON.parse(row['supersedes'] as string),
      tags: JSON.parse(row['tags'] as string),
      body: { context: '', decision: '', rationale: '', tradeoffs: '', consequences: '' },
      bodyMdPath: row['body_md_path'] as string,
      bodyJsonPath: row['body_json_path'] as string,
      schemaVersion: row['schema_version'] as number,
    };
  }
}
```

---

## 14. CI Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20, 22]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Typecheck
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Test with coverage
        run: npm run test:coverage

      - name: Build
        run: npm run build

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        if: matrix.node-version == 20
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
```

---

## 15. First Build and Smoke Test

Create the minimal entry point so the build succeeds:

**`src/index.ts`**
```typescript
export { SQLiteStore } from './storage/sqlite-store.js';
export type { ArchLensConfig } from './shared/types/config.js';
export type { ADR, ADRDraft, ADRBody, ADRParticipant, ADRStatus } from './shared/types/adr.js';
export type { ChangeSignal, SignalType, Author } from './shared/types/signals.js';
export type { DriftEvent, DriftEventType, DriftSeverity } from './shared/types/drift.js';
export type { StructuralSnapshot } from './shared/types/snapshot.js';
```

**`src/cli/index.ts`**
```typescript
#!/usr/bin/env node
import { program } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pkg = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf-8')
) as { version: string };

program
  .name('archlens')
  .description('Architectural decision intelligence for AI-assisted development')
  .version(pkg.version);

// Commands registered here as you build them:
// program.addCommand(initCommand);
// program.addCommand(logCommand);
// program.addCommand(checkCommand);
// ...

program.parse();
```

Now run the build:

```bash
npm run build
```

If it succeeds, link it locally so you can run `archlens` in your terminal:

```bash
npm link
archlens --version   # should print 0.1.0
```

---

## 16. Write Your First Unit Test

Prove the test infrastructure works before writing real logic:

**`tests/unit/storage/sqlite-store.test.ts`**
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SQLiteStore } from '../../../src/storage/sqlite-store.js';
import type { ADRDraft } from '../../../src/shared/types/adr.js';

describe('SQLiteStore', () => {
  let store: SQLiteStore;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'archlens-test-'));
    store = new SQLiteStore(tmpDir);
  });

  afterEach(() => {
    store.close();
    rmSync(tmpDir, { recursive: true });
  });

  it('initializes without error', () => {
    expect(store).toBeDefined();
  });

  it('inserts and retrieves an ADR', () => {
    const draft: ADRDraft = {
      id: 'ADR-draft-abc123',
      draftId: 'abc123',
      title: 'Use Redis for session storage',
      status: 'draft',
      date: '2026-04-25T00:00:00Z',
      participants: [{ name: 'Dev', role: 'author' }],
      supersedes: [],
      tags: ['dependency'],
      body: {
        context: 'Needed persistent sessions',
        decision: 'Use Redis',
        rationale: 'Fast and persistent',
        tradeoffs: 'Extra infra dependency',
        consequences: 'Add Redis to docker-compose',
      },
      bodyMdPath: 'docs/decisions/ADR-draft-abc123.md',
      bodyJsonPath: 'docs/decisions/ADR-draft-abc123.json',
      schemaVersion: 1,
    };

    store.insertADR(draft);
    const retrieved = store.getADR('ADR-draft-abc123');

    expect(retrieved).not.toBeNull();
    expect(retrieved?.title).toBe('Use Redis for session storage');
    expect(retrieved?.status).toBe('draft');
    expect(retrieved?.tags).toEqual(['dependency']);
  });

  it('lists ADRs filtered by status', () => {
    // Insert two ADRs with different statuses
    const makeADR = (id: string, status: 'draft' | 'accepted'): ADRDraft => ({
      id,
      draftId: id,
      title: `Decision ${id}`,
      status,
      date: '2026-04-25T00:00:00Z',
      participants: [],
      supersedes: [],
      tags: [],
      body: { context: '', decision: '', rationale: '', tradeoffs: '', consequences: '' },
      bodyMdPath: `docs/decisions/${id}.md`,
      bodyJsonPath: `docs/decisions/${id}.json`,
      schemaVersion: 1,
    });

    store.insertADR(makeADR('draft-001', 'draft'));
    store.insertADR(makeADR('draft-002', 'accepted'));

    const drafts = store.listADRs('draft');
    const accepted = store.listADRs('accepted');

    expect(drafts).toHaveLength(1);
    expect(accepted).toHaveLength(1);
  });
});
```

Run it:

```bash
npm test
```

All green. You have a working foundation.

---

## 17. Build Order Recommendation

Now that scaffolding is done, build modules in this order.
Each step depends on the previous one being stable.

```
Week 1   Storage module (done above) + shared types
Week 2   Interceptor — git hook + signal classifier
Week 3   ADR Engine — prompt builder + formatter + one LLM adapter (Ollama)
Week 4   CLI — init, log, show commands (proves the pipeline end-to-end)
Week 5   Drift Detector — snapshot builder + drift analyzer (JS/TS first)
Week 6   CLI — check command + pre-push hook integration
Week 7   MCP Server — serve command + query_decisions + get_impact_preview
Week 8   Merge Driver — index merger + conflict detector
Week 9   Collaboration — participant tracker + domain lock manager
Week 10  Remaining LLM adapters (Claude, OpenAI, Groq)
Week 11  Remaining language grammars (Python, Go)
Week 12  Polish, docs, GIF demo, npm publish
```

The golden rule: **don't start week N+1 until week N has passing tests.** 
The pipeline is load-bearing — a bad abstraction in the Interceptor will
cost you two weeks of refactoring when you get to the MCP Server.

---

## 18. Ollama Setup (Local LLM for Development)

Don't burn cloud API credits during development. Use Ollama locally:

```bash
# macOS
brew install ollama
brew services start ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh
systemctl start ollama

# Pull the model (4GB download, one-time)
ollama pull llama3.2

# Verify it works
curl http://localhost:11434/api/generate \
  -d '{"model":"llama3.2","prompt":"Say hello","stream":false}'
```

ArchLens will use this by default with no config changes needed.

---

## Quick Reference: Daily Commands

```bash
npm run dev           # run CLI without building (tsx, fast)
npm run build         # compile to dist/
npm test              # run all tests once
npm run test:watch    # tests in watch mode while developing
npm run typecheck     # type-check without building
npm run lint:fix      # auto-fix lint issues
archlens --help       # test the linked CLI
```

---

*You're ready to start writing real module code. Start with the Interceptor.*