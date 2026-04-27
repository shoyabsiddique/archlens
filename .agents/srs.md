# Software Requirements Specification
# ArchLens — Architectural Decision Intelligence for AI-Assisted Development

---

| Field | Value |
|---|---|
| Document Version | 1.0.0 |
| Status | Draft |
| Date | 2026-04-25 |
| Authors | ArchLens Core Team |
| License | MIT |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Stakeholders and User Personas](#3-stakeholders-and-user-personas)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [System Architecture](#6-system-architecture)
7. [Data Architecture](#7-data-architecture)
8. [External Interface Requirements](#8-external-interface-requirements)
9. [Collaboration and Concurrency Model](#9-collaboration-and-concurrency-model)
10. [Security Requirements](#10-security-requirements)
11. [Deployment Strategies](#11-deployment-strategies)
12. [Testing Requirements](#12-testing-requirements)
13. [Constraints and Assumptions](#13-constraints-and-assumptions)
14. [Glossary](#14-glossary)
15. [Appendices](#15-appendices)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) defines the complete functional and non-functional requirements for **ArchLens**, an open-source architectural decision intelligence layer for AI-assisted software development. This document is intended for contributors, maintainers, integration partners, and technical evaluators of the project.

### 1.2 Scope

ArchLens is a developer toolchain component — not an application, not a SaaS product, not an IDE. It is a local-first, open-source system that intercepts structural changes made by AI coding agents and human developers, captures the reasoning behind those changes as Architecture Decision Records (ADRs), detects when the codebase drifts from those decisions, and exposes the decision history to future AI agents via the Model Context Protocol (MCP).

ArchLens integrates with: git, any MCP-compatible AI coding agent (Claude Code, Cursor, Aider, Windsurf, etc.), CI/CD pipelines, and existing `adr-tools` conventions.

ArchLens does **not** replace: IDEs, AI coding agents, spec generators, test runners, or code review tools.

### 1.3 Problem Statement

AI coding agents are making architectural decisions continuously and silently. When Claude Code adds a Redis dependency, it has a reason — but that reason lives only in the ephemeral context window of that session. When Cursor restructures your auth layer, the rationale evaporates with the chat. When two agents run in parallel on different branches, they can make contradictory architectural choices with no human ever noticing until the codebase is already incoherent.

The consequences are predictable and painful:

- New engineers cannot onboard into a codebase because the "why" behind every major decision is gone
- AI agents in subsequent sessions hallucinate plausible-sounding but wrong rationales for existing structure
- Teams accumulate architectural debt silently because there is no continuous validation that the code still reflects what was decided
- Multi-developer and multi-agent workflows produce structural contradictions that git merge drivers cannot detect because they operate on text, not semantics

No existing tool addresses this problem. `adr-tools` requires manual authoring. SpecKit and similar tools work greenfield-only. Git itself tracks what changed, not why. ArchLens is the missing layer.

### 1.4 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|---|---|
| ADR | Architecture Decision Record — a structured document capturing a single architectural decision, its context, rationale, and tradeoffs |
| MCP | Model Context Protocol — Anthropic's open protocol for connecting AI agents to external tools and data sources |
| AST | Abstract Syntax Tree — a tree representation of source code structure used for language-agnostic analysis |
| Drift | The state where live codebase structure diverges from what the ADR index describes as the intended architecture |
| Domain Lock | A file-based lock scoped to an architectural domain (e.g., auth, data layer) that prevents concurrent agent modifications |
| Draft ADR | A content-addressed, pre-merge ADR file awaiting sequential ID assignment at merge time |
| Structural Change | A code change that crosses an architectural threshold: new external dependency, new service boundary, new design pattern, API contract modification, or schema change |
| LLM | Large Language Model — the AI model backend used for ADR extraction and reasoning |
| CI/CD | Continuous Integration / Continuous Deployment |
| OSS | Open Source Software |

### 1.5 Overview of Document

Section 2 describes the product context and operating environment. Sections 3 through 5 define who uses ArchLens and what it must do. Sections 6 through 9 define how it is built. Sections 10 through 12 cover security, deployment, and testing. Sections 13 through 15 cover constraints, glossary, and appendices.

---

## 2. Overall Description

### 2.1 Product Perspective

ArchLens operates as a middleware layer in the AI-assisted development workflow. It is neither upstream (like a spec generator) nor downstream (like a code reviewer). It runs alongside the development process, intercepting signals from both human-driven git activity and AI agent tool calls.

```
┌───────────────────────────────────────────────────────────────────────┐
│                         Development Ecosystem                          │
│                                                                        │
│   Human Developer ──────────────────────────────────────────────────┐ │
│                                                                      │ │
│   AI Agent (Claude Code / Cursor / Aider / Windsurf / Codex) ──────┐│ │
│                                                                     ││ │
│                          ↓ git commits / MCP calls                  ││ │
│                                                                     ││ │
│   ┌─────────────────────────────────────────────────────────────┐  ││ │
│   │                        ArchLens                              │  ││ │
│   │                                                              │◀─┘│ │
│   │   Intercept → Capture → Index → Detect Drift → Expose       │◀──┘ │
│   └──────────────────────────────┬──────────────────────────────┘     │
│                                  │                                     │
│              ┌───────────────────┼──────────────────┐                 │
│              ▼                   ▼                  ▼                  │
│         /docs/decisions/    SQLite Store       CI/CD Pipeline          │
│         (git-versioned ADRs) (local index)    (drift gate)            │
└───────────────────────────────────────────────────────────────────────┘
```

### 2.2 Product Functions (Summary)

At the highest level, ArchLens performs five functions:

**Intercept** — detect when a structural change has occurred, via git hooks or MCP bridge observation.

**Capture** — invoke an LLM to extract the decision rationale from context (diff, commit message, agent reasoning trace) and persist it as a structured ADR.

**Index** — maintain a queryable, drift-checkable structural index of all decisions and the codebase state they describe.

**Detect** — continuously compare the live codebase structure against the indexed expected state, surface typed drift events, and block on critical violations.

**Expose** — serve the decision index to AI agents and CI systems via MCP and CLI interfaces, so future sessions have grounded architectural context.

### 2.3 User Characteristics

ArchLens targets developers with working familiarity with git, terminal tools, and at least one AI coding agent. It does not require knowledge of formal ADR processes, distributed systems theory, or the MCP protocol. The tool is designed to be invisible in the happy path and informative when something needs attention.

### 2.4 Operating Environment

| Environment | Specification |
|---|---|
| Host OS | macOS 12+, Linux (Ubuntu 20.04+, Debian 11+), Windows 11 via WSL2 |
| Runtime | Node.js 20 LTS or higher |
| Package manager | npm 10+, yarn 4+, or pnpm 9+ |
| git version | 2.30+ |
| Disk space | 50MB for binary + variable for SQLite store (typically <10MB per project) |
| Network | Optional — only required for cloud LLM providers; fully offline with Ollama |

### 2.5 Design and Implementation Constraints

- **Local-first by default.** No data leaves the machine without explicit opt-in. No telemetry, no analytics, no required accounts.
- **Zero-infra install.** `npx archlens init` must work in a fresh project with no prerequisites beyond Node.js and git.
- **ADR format compatibility.** All generated ADRs must be valid `adr-tools`-compatible Markdown files so teams with existing ADR workflows can adopt without migration.
- **Agent-agnostic.** ArchLens must not be tied to any specific AI agent. It integrates via MCP (open protocol) and git hooks (universal).
- **Non-destructive.** ArchLens must never modify source code. It only writes to `/docs/decisions/`, `.archlens/`, and its SQLite store.

### 2.6 Assumptions and Dependencies

- The project being analyzed uses git for version control.
- At least one of the supported dependency manifest formats is present (`package.json`, `go.mod`, `pyproject.toml`, `Cargo.toml`, `requirements.txt`, `pom.xml`).
- The developer has access to a supported LLM provider (cloud or local via Ollama) for ADR extraction.
- The AI agent in use supports MCP for the full integration experience (git hook integration works without MCP support).

---

## 3. Stakeholders and User Personas

### 3.1 Primary Users

**Solo developer using AI agents**
Uses Claude Code or Cursor daily. Commits rapidly. Has no time to write documentation manually. Wants the "why" of past decisions available when they or their agent return to a module weeks later. Measures success as: zero time spent on documentation, full context available on re-entry.

**Engineering team lead (2–10 person team)**
Responsible for code quality and architectural coherence across a team that uses multiple AI agents. Wants a lightweight process that doesn't require enforcing documentation discipline manually. Needs CI-level enforcement that drift doesn't accumulate silently. Measures success as: no surprise architecture regressions in PR review.

**New engineer onboarding into an existing codebase**
Joined a team that has been using AI agents for 6–12 months. The codebase has hundreds of undocumented decisions baked into it. Wants to understand why things are the way they are without interrogating each senior engineer. Measures success as: `archlens report` gives enough context to start contributing in day one.

**Open source maintainer**
Runs a project with external contributors who use varying AI agents. Wants incoming PRs to include ADRs for structural changes. Wants automated detection when a PR would break an existing architectural decision without acknowledgment. Measures success as: ADR coverage becomes a CI requirement with no manual overhead.

### 3.2 Secondary Stakeholders

**AI coding agents (Claude Code, Cursor, Aider, etc.)** — Act as both producers of structural changes (triggering ADR capture) and consumers of the decision index (querying context before making changes).

**CI/CD systems (GitHub Actions, GitLab CI, CircleCI)** — Consumers of `archlens check --ci` output for drift gate enforcement.

**Future contributors to ArchLens itself** — The design must be modular enough that language support, new LLM providers, and new output surfaces can be added without touching core logic.

---

## 4. Functional Requirements

Requirements are categorized by subsystem and assigned unique IDs for traceability. Priority levels: **P0** (must-have for MVP), **P1** (required for v1.0), **P2** (post-v1.0).

---

### 4.1 Initialization (FR-INIT)

**FR-INIT-001** `archlens init` must install git hooks (`post-commit`, `pre-push`, `post-merge`) into the project's `.git/hooks/` directory. *(P0)*

**FR-INIT-002** `archlens init` must create the `/docs/decisions/` directory if it does not exist, and add a `.gitkeep` to ensure it is tracked. *(P0)*

**FR-INIT-003** `archlens init` must initialize the SQLite database at `.archlens/store.db` with the required schema. *(P0)*

**FR-INIT-004** `archlens init` must register the custom git merge driver for `index.json` by writing to the project's `.gitattributes` and the global git config. *(P0)*

**FR-INIT-005** `archlens init` must create a default `.archlens/config.json` with LLM provider set to `ollama` (local, no key required) so the tool works out of the box without cloud credentials. *(P0)*

**FR-INIT-006** `archlens init` must be idempotent — running it twice on the same project must not duplicate hooks, corrupt config, or fail. *(P0)*

**FR-INIT-007** `archlens init` must detect and import existing `adr-tools`-format ADR files from `/docs/decisions/` if they are already present. *(P1)*

**FR-INIT-008** `archlens init --dry-run` must print all actions it would take without executing any of them. *(P1)*

---

### 4.2 Structural Change Detection (FR-DETECT)

**FR-DETECT-001** The post-commit hook must diff the current commit against HEAD~1 and identify structural changes across the following signal types: *(P0)*
- New or removed entries in any supported dependency manifest
- New files in `src/`, `lib/`, `pkg/`, or equivalent source roots that establish new modules or services
- Modifications to API contract files (OpenAPI specs, GraphQL schemas, Protobuf definitions)
- Modifications to database schema files (migration files, ORM model definitions)
- Import graph changes that introduce new inter-module dependencies

**FR-DETECT-002** The detector must support the following dependency manifest formats at MVP: `package.json`, `go.mod`, `pyproject.toml`, `Cargo.toml`. *(P0)*

**FR-DETECT-003** The detector must support the following manifest formats by v1.0: `requirements.txt`, `Pipfile`, `go.sum`, `Cargo.lock`, `pom.xml`, `build.gradle`. *(P1)*

**FR-DETECT-004** The detector must filter noise. The following must NOT trigger ADR capture: file renames with no structural change, comment-only edits, formatting changes, test file additions that don't add new dependencies, changelog updates. *(P0)*

**FR-DETECT-005** The MCP bridge must observe AI agent tool calls during an active session and flag structural signals in real time. When the agent calls a tool that writes a dependency manifest or creates a new module file, the bridge must queue a capture event. *(P1)*

**FR-DETECT-006** The detector must emit a structured `ChangeSignal` object for each detected structural change, containing: signal type, affected file paths, before/after diff, commit SHA, timestamp, and author identity. *(P0)*

**FR-DETECT-007** Developers must be able to configure custom detection thresholds via `.archlens/config.json` — for example, specifying additional paths to watch or suppressing specific signal types. *(P1)*

---

### 4.3 ADR Capture and Generation (FR-CAPTURE)

**FR-CAPTURE-001** On receiving a `ChangeSignal`, the ADR Engine must construct a prompt containing: the structural diff, the commit message, the commit author(s), any available AI agent reasoning trace, and the five most recently created ADRs for context. *(P0)*

**FR-CAPTURE-002** The ADR Engine must call the configured LLM provider with the constructed prompt and a system instruction to extract: the decision title, context, decision statement, rationale, tradeoffs considered, and consequences. *(P0)*

**FR-CAPTURE-003** The generated ADR must be saved as a Markdown file in `/docs/decisions/` using the draft naming convention `ADR-draft-{contenthash}-{slug}.md` before a sequential ID is assigned. *(P0)*

**FR-CAPTURE-004** The ADR Markdown file must conform to the following frontmatter schema: *(P0)*

```yaml
---
id: string           # assigned at merge: ADR-NNN
draft-id: string     # content hash used before merge
title: string
status: draft | accepted | superseded | deprecated
date: ISO-8601
participants:
  - name: string
    role: author | reviewer | ai-agent
supersedes: string[] # ADR IDs this replaces (optional)
tags: string[]       # e.g. ["dependency", "auth", "data-layer"]
---
```

**FR-CAPTURE-005** The ADR body must be structured with the following sections: Context, Decision, Rationale, Tradeoffs, Consequences. *(P0)*

**FR-CAPTURE-006** The ADR Engine must simultaneously write a JSON sidecar `{draft-id}.json` alongside the Markdown file for machine consumption. The JSON must mirror the frontmatter plus the full body content as structured fields. *(P0)*

**FR-CAPTURE-007** If the LLM call fails (network error, rate limit, provider unavailable), the system must save a stub ADR with status `draft` and the raw diff as the body, so the developer can complete it manually. The system must not silently drop the event. *(P0)*

**FR-CAPTURE-008** Developers must be able to invoke `archlens capture --manual` to write an ADR from scratch using an interactive terminal form without an LLM. *(P1)*

**FR-CAPTURE-009** The ADR Engine must support a configurable prompt template so teams can customize the extraction style, required sections, or language. *(P1)*

**FR-CAPTURE-010** `archlens log` must list all ADRs (including drafts) in reverse chronological order, with ID, title, status, date, and participant count. *(P0)*

**FR-CAPTURE-011** `archlens show ADR-007` must render the full ADR in the terminal with syntax highlighting. *(P1)*

---

### 4.4 Drift Detection (FR-DRIFT)

**FR-DRIFT-001** The Drift Detector must build and store an AST-based structural snapshot of the codebase after each successful ADR capture. The snapshot must record: module graph, dependency manifest state, identified design patterns, and API contract fingerprints. *(P0)*

**FR-DRIFT-002** `archlens check` must compare the current codebase structural state against the last stored snapshot and the ADR index, producing a typed list of drift events. *(P0)*

**FR-DRIFT-003** Drift events must be typed as follows: *(P0)*

| Type | Severity | Description |
|---|---|---|
| `dependency_added` | info | New dep present but no ADR exists |
| `dependency_removed` | warning | Dep removed that an ADR depends on |
| `pattern_introduced` | info | New design pattern detected, no ADR |
| `pattern_abandoned` | warning | ADR references a pattern no longer found |
| `contract_broken` | error | API contract changed without ADR |
| `boundary_crossed` | error | New coupling introduced between modules that ADR designated as independent |
| `adr_orphaned` | warning | ADR references files/patterns that no longer exist |

**FR-DRIFT-004** The pre-push git hook must run `archlens check` and block the push if any `error`-severity drift event is present, printing which ADR is violated and the `archlens resolve` command to fix it. *(P0)*

**FR-DRIFT-005** `archlens check --ci` must output drift events in a machine-readable format (JSON to stdout + GitHub Actions annotation format to stderr) suitable for use as a CI step. *(P0)*

**FR-DRIFT-006** `archlens check --warn-only` must report all drift events without blocking (exit code 0), suitable for gradual adoption in existing projects. *(P1)*

**FR-DRIFT-007** The Drift Detector must support JS/TS, Python, and Go at MVP via tree-sitter grammars. *(P0)*

**FR-DRIFT-008** The Drift Detector must support Rust, Java, and Ruby via tree-sitter grammars by v1.0. *(P1)*

**FR-DRIFT-009** `archlens watch` must run the Drift Detector as a daemon, re-running on every file save and printing drift events to the terminal in real time. *(P2)*

---

### 4.5 Conflict Resolution (FR-RESOLVE)

**FR-RESOLVE-001** When `archlens check` detects that two ADRs make mutually exclusive architectural claims, it must emit a `structural_conflict` event with both ADR IDs and the nature of the conflict. *(P0)*

**FR-RESOLVE-002** `archlens resolve ADR-007 ADR-012` must open an interactive terminal flow that: displays both ADRs side by side, asks the developer to designate a winner or a synthesis, and auto-generates a supersession ADR with status `accepted` that references both prior ADRs. *(P0)*

**FR-RESOLVE-003** The resolution flow must allow the developer to involve an LLM to suggest a synthesis based on both ADRs' rationale. *(P1)*

**FR-RESOLVE-004** `archlens resolve` must never delete or modify existing ADRs. It only creates new supersession ADRs. *(P0)*

---

### 4.6 MCP Server (FR-MCP)

**FR-MCP-001** `archlens serve` must start a local MCP server on a Unix socket (default) or TCP port (configurable) that implements the MCP 2025-03 specification. *(P0)*

**FR-MCP-002** The MCP server must expose the following tools: *(P0)*

| Tool | Input | Output |
|---|---|---|
| `query_decisions` | Natural language query string | Ranked list of relevant ADRs with excerpts |
| `get_impact_preview` | File diff string | Structural impact summary + related ADRs |
| `list_drift_events` | Optional severity filter | Current drift event list |
| `add_manual_adr` | Structured ADR fields | Confirmation + generated ADR file path |
| `list_domain_locks` | None | Active domain locks with holder info |

**FR-MCP-003** `query_decisions` must perform semantic search over the ADR index using embeddings stored in SQLite (via `sqlite-vec` extension). The query must return the top-5 most relevant ADRs with title, excerpt, date, and status. *(P1)*

**FR-MCP-004** At MVP, `query_decisions` may use simple full-text search (SQLite FTS5) as a fallback when embeddings are not yet available. *(P0)*

**FR-MCP-005** `get_impact_preview` must parse the provided diff, extract structural signals, cross-reference against the ADR index, and return a plain-language summary of: what architectural domains are affected, what decisions are relevant, and what contradictions (if any) the change would introduce. *(P0)*

**FR-MCP-006** The MCP server must handle concurrent connections from multiple agents without data corruption. All writes to SQLite must use WAL mode. *(P0)*

**FR-MCP-007** The MCP server must return a `domain_locked` error response when an agent calls `get_impact_preview` on a structural domain that has an active domain lock from another session. *(P1)*

**FR-MCP-008** The MCP server configuration must be expressible in two lines of `.mcp.json` so any Claude Code user can connect without reading documentation beyond the README quickstart. *(P0)*

---

### 4.7 Collaboration and Merge (FR-COLLAB)

**FR-COLLAB-001** During `archlens init`, the system must add `docs/decisions/index.json merge=archlens-index` to `.gitattributes` and register the `archlens-index` merge driver in the local git config. *(P0)*

**FR-COLLAB-002** The `archlens merge-index` command must accept three file paths (base, ours, theirs) as arguments, union the ADR entries by draft ID, assign sequential integer IDs to any draft entries not yet assigned, rename the corresponding Markdown files, and write the merged `index.json`. *(P0)*

**FR-COLLAB-003** ID assignment at merge time must be deterministic: IDs are assigned in chronological order by ADR creation timestamp. In case of equal timestamps (rare, but possible), lexicographic order by draft content hash breaks the tie. *(P0)*

**FR-COLLAB-004** The post-merge git hook must run `archlens check` and emit `structural_conflict` events for any ADRs that contradict each other in the merged state. *(P0)*

**FR-COLLAB-005** ADR participant tracking must automatically include all git co-authors from the `Co-authored-by:` trailer of the triggering commit. *(P0)*

**FR-COLLAB-006** AI agent identity must be captured in the participants list when a capture is triggered via the MCP bridge. The agent name must be derived from the MCP client's `clientInfo.name` field in the MCP handshake. *(P1)*

---

### 4.8 Domain Locking (FR-LOCK)

**FR-LOCK-001** The MCP server must create a domain lock file at `.archlens/locks/{domain}.lock` when an agent begins a structural change in a given domain, containing: agent identity, session ID, timestamp, and the structural domains affected. *(P1)*

**FR-LOCK-002** Domain lock files must be cleared automatically on post-commit hook execution by the locking agent's session. *(P1)*

**FR-LOCK-003** Lock files older than a configurable TTL (default: 4 hours) must be treated as stale and auto-cleared by `archlens check`. *(P1)*

**FR-LOCK-004** `archlens locks` must list all active domain locks with holder info and age. *(P1)*

**FR-LOCK-005** `archlens locks clear {domain}` must allow a human developer to manually release a lock. *(P1)*

---

### 4.9 Reporting (FR-REPORT)

**FR-REPORT-001** `archlens report` must generate a single Markdown document summarizing: all accepted ADRs in chronological order, their current status (accepted / superseded / deprecated), participant breakdown, and any outstanding drift events. *(P1)*

**FR-REPORT-002** `archlens report --format json` must output the same data as structured JSON for downstream tooling. *(P1)*

**FR-REPORT-003** `archlens report --onboarding` must generate a condensed onboarding document suitable for a new team member: top 10 most architecturally significant decisions, current dependency inventory, and known open drift events. *(P2)*

---

### 4.10 Configuration (FR-CONFIG)

**FR-CONFIG-001** All ArchLens configuration must live in `.archlens/config.json` at the project root. *(P0)*

**FR-CONFIG-002** The configuration schema must support the following top-level fields: *(P0)*

```json
{
  "llm": {
    "provider": "ollama | claude | openai | groq",
    "model": "string",
    "api_key": "string (or env var reference: $ENV_VAR_NAME)",
    "base_url": "string (for custom endpoints)"
  },
  "detection": {
    "watch_paths": ["string"],
    "ignore_paths": ["string"],
    "disabled_signal_types": ["string"]
  },
  "adr": {
    "output_dir": "string (default: docs/decisions)",
    "prompt_template": "string (path to custom template file)"
  },
  "locks": {
    "ttl_hours": "number (default: 4)"
  },
  "mcp": {
    "socket_path": "string",
    "port": "number (optional, for TCP mode)"
  }
}
```

**FR-CONFIG-003** API keys in config must support environment variable references (`$ANTHROPIC_API_KEY`) so secrets are never committed to git. *(P0)*

**FR-CONFIG-004** `archlens config set {key} {value}` must be a valid way to modify any config field from the CLI. *(P1)*

---

## 5. Non-Functional Requirements

### 5.1 Performance (NFR-PERF)

**NFR-PERF-001** The post-commit hook must complete (including LLM call) within 30 seconds for 95% of commits on a standard broadband connection using a cloud LLM provider. Commits must not be blocked during the LLM call — the hook must run the LLM capture asynchronously and return exit 0 immediately, queuing the capture for background completion. *(P0)*

**NFR-PERF-002** `archlens check` (drift detection, no LLM call) must complete within 10 seconds on a codebase of up to 500,000 lines of code. *(P0)*

**NFR-PERF-003** MCP tool responses must return within 2 seconds for `query_decisions` and `list_drift_events`. `get_impact_preview` (which involves an LLM call) must return within 15 seconds. *(P0)*

**NFR-PERF-004** The SQLite store must handle an ADR index of up to 10,000 entries without query degradation. *(P1)*

**NFR-PERF-005** Tree-sitter parsing must process files at a minimum of 1MB/s on a standard developer laptop (Apple M-series or equivalent x86). *(P0)*

### 5.2 Reliability (NFR-REL)

**NFR-REL-001** ArchLens must never cause a git operation to fail due to its own error. All hooks must catch exceptions internally and exit 0 on unexpected failure, logging the error to `.archlens/error.log`. *(P0)*

**NFR-REL-002** The system must handle LLM provider unavailability gracefully — stub ADRs are saved, the developer is notified, and normal git workflow is uninterrupted. *(P0)*

**NFR-REL-003** SQLite operations must use WAL (Write-Ahead Logging) mode to prevent corruption on concurrent access. *(P0)*

**NFR-REL-004** All file writes (ADR Markdown, JSON sidecar, SQLite) must be atomic — using temp-file-then-rename semantics — so a crash mid-write never produces a corrupt or partial file. *(P0)*

**NFR-REL-005** ArchLens must operate correctly on repositories with up to 10 years of git history and 100,000 commits. *(P1)*

### 5.3 Usability (NFR-USE)

**NFR-USE-001** `npx archlens init` in a fresh project must produce a working installation in under 60 seconds on a standard broadband connection. *(P0)*

**NFR-USE-002** A developer who has never heard of ADRs must be able to get value from ArchLens without reading any documentation beyond the README quickstart. The tool must be self-explanatory in its output and prompts. *(P0)*

**NFR-USE-003** All CLI error messages must include: what went wrong, why it went wrong (if determinable), and what the developer should do next. No stack traces in standard output — only in `--verbose` mode or `.archlens/error.log`. *(P0)*

**NFR-USE-004** All interactive terminal flows (`archlens resolve`, `archlens capture --manual`) must be keyboard-navigable and must work in standard terminal emulators (iTerm2, Windows Terminal, GNOME Terminal) without special configuration. *(P0)*

**NFR-USE-005** ArchLens must print a clear warning and continue gracefully when run in a git repository where hooks are managed by another tool (Husky, Lefthook, pre-commit), providing instructions for manual hook integration. *(P1)*

### 5.4 Maintainability (NFR-MAINT)

**NFR-MAINT-001** The codebase must maintain a minimum of 80% unit test coverage on all core modules (Interceptor, ADR Engine, Drift Detector, MCP Server). *(P1)*

**NFR-MAINT-002** Each subsystem (Interceptor, ADR Engine, Drift Detector, MCP Server, CLI) must be independently testable via a published internal API, with no direct coupling to other subsystems except through defined interfaces. *(P0)*

**NFR-MAINT-003** Adding support for a new programming language to the Drift Detector must require changes to only one file: the language grammar registry. No changes to core Drift Detector logic. *(P1)*

**NFR-MAINT-004** Adding support for a new LLM provider must require changes to only one file: the LLM adapter registry. *(P1)*

**NFR-MAINT-005** All public APIs (CLI commands, MCP tools, internal module interfaces) must be documented in code via JSDoc. *(P1)*

### 5.5 Portability (NFR-PORT)

**NFR-PORT-001** ArchLens must produce identical output (ADR content, drift events, MCP responses) across macOS, Linux, and Windows 11 (WSL2). *(P0)*

**NFR-PORT-002** File paths in ADRs and config must always use POSIX-style separators internally, with OS-specific translation at I/O boundaries. *(P0)*

**NFR-PORT-003** The npm package must ship pre-built binaries for: `darwin-arm64`, `darwin-x64`, `linux-x64`, `linux-arm64`, `win32-x64` (via WSL2 compatibility layer). *(P1)*

### 5.6 Privacy and Compliance (NFR-PRIV)

**NFR-PRIV-001** ArchLens must not transmit any codebase content, ADR content, or developer identity information to any external service except the configured LLM provider, and only when explicitly triggered by the developer's workflow. *(P0)*

**NFR-PRIV-002** There must be no telemetry, analytics, error reporting, or usage tracking of any kind by default. Any opt-in telemetry (if added in a future version) must be explicitly documented and require affirmative opt-in, not opt-out. *(P0)*

**NFR-PRIV-003** When using a cloud LLM provider, the content sent to the LLM is limited to: the structural diff, commit message, and ADR context. Full file contents must never be sent unless explicitly enabled by the developer via config. *(P0)*

### 5.7 Extensibility (NFR-EXT)

**NFR-EXT-001** The plugin architecture must allow third-party contributors to add: new language tree-sitter parsers, new LLM provider adapters, new output formats for `archlens report`, and new signal detectors — all without modifying the ArchLens core package. *(P2)*

**NFR-EXT-002** The ADR schema must be versioned (`schema_version` field in frontmatter). The system must handle ADRs from older schema versions gracefully, applying migrations transparently. *(P1)*

---

## 6. System Architecture

### 6.1 High-Level Architecture

ArchLens follows a **pipeline architecture** with five stages. Each stage is a discrete module with a defined input/output contract. Stages communicate via typed event objects, not shared mutable state.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            ArchLens Pipeline                              │
│                                                                           │
│  ┌─────────────┐    ChangeSignal    ┌─────────────┐    ADRDraft          │
│  │             │ ──────────────────▶│             │ ────────────────┐    │
│  │ Interceptor │                    │  ADR Engine │                 │    │
│  │             │◀── MCP/git hooks   │             │                 ▼    │
│  └─────────────┘                    └─────────────┘         ┌───────────┐│
│                                                              │  Storage  ││
│  ┌─────────────┐    DriftEvent      ┌─────────────┐         │  Manager  ││
│  │             │ ──────────────────▶│             │ ◀───────│           ││
│  │   Drift     │                    │   Event     │         │ SQLite +  ││
│  │  Detector   │◀── StructSnapshot  │   Router    │         │ Filesystem││
│  └─────────────┘                    └─────────────┘         └───────────┘│
│                                           │                               │
│                              ┌────────────┼────────────┐                 │
│                              ▼            ▼            ▼                 │
│                         ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│                         │   CLI   │ │   MCP   │ │  CI/CD  │            │
│                         │ Output  │ │ Server  │ │  Hook   │            │
│                         └─────────┘ └─────────┘ └─────────┘            │
└──────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Module Breakdown

#### 6.2.1 Interceptor Module (`src/interceptor/`)

**Responsibility:** Detect structural changes from two sources — git commits (via hooks) and AI agent tool calls (via MCP bridge) — and emit typed `ChangeSignal` events.

**Key classes:**
- `GitHookInterceptor` — parses git diff output, applies signal detection heuristics, emits `ChangeSignal`
- `MCPBridgeInterceptor` — wraps MCP tool call observation, detects structural write operations
- `SignalClassifier` — applies configurable rules to determine if a change crosses an architectural threshold
- `ManifestParser` — language-specific parsers for dependency manifest formats

**Input:** Raw git diff output OR MCP tool call event stream
**Output:** `ChangeSignal[]`

#### 6.2.2 ADR Engine (`src/adr-engine/`)

**Responsibility:** Transform a `ChangeSignal` into a structured, LLM-enriched ADR and persist it.

**Key classes:**
- `PromptBuilder` — constructs the LLM prompt from `ChangeSignal` + recent ADR context
- `LLMAdapter` — pluggable adapter interface with implementations for Ollama, Claude, OpenAI, Groq
- `ADRFormatter` — transforms LLM output into valid ADR Markdown + JSON sidecar
- `ADRWriter` — handles atomic file writes to `/docs/decisions/`

**Input:** `ChangeSignal`
**Output:** `ADRDraft` (persisted to disk + indexed in SQLite)

#### 6.2.3 Drift Detector (`src/drift-detector/`)

**Responsibility:** Build structural snapshots of the codebase and compare against the ADR index to produce typed drift events.

**Key classes:**
- `SnapshotBuilder` — uses tree-sitter to build `StructuralSnapshot` from source files
- `ADRIndexReader` — reads and deserializes the ADR index from SQLite
- `DriftAnalyzer` — compares `StructuralSnapshot` against `ADRIndex`, produces `DriftEvent[]`
- `LanguageRegistry` — maps file extensions to tree-sitter grammar modules

**Input:** Current filesystem state + SQLite ADR index
**Output:** `DriftEvent[]`

#### 6.2.4 Storage Manager (`src/storage/`)

**Responsibility:** Single source of truth for all persistence operations. No other module writes to disk or SQLite directly.

**Key classes:**
- `SQLiteStore` — all database operations, WAL mode, prepared statements
- `FileStore` — atomic file writes for ADR Markdown and JSON sidecars
- `LockStore` — reads and writes domain lock files in `.archlens/locks/`
- `MigrationRunner` — applies schema migrations on startup

**Input:** Write/read requests from all other modules
**Output:** Confirmation, query results, or typed errors

#### 6.2.5 MCP Server (`src/mcp-server/`)

**Responsibility:** Implement the MCP 2025-03 protocol over a Unix socket or TCP port, exposing ArchLens capabilities as MCP tools.

**Key classes:**
- `MCPServer` — protocol implementation, connection handling, tool dispatch
- `ToolHandlers` — one handler class per MCP tool
- `SemanticSearch` — FTS5 (MVP) / vector search (v1.0) over the ADR index
- `ImpactAnalyzer` — diff parsing + ADR correlation for `get_impact_preview`

**Input:** MCP protocol messages from AI agent clients
**Output:** MCP protocol responses

#### 6.2.6 Merge Driver (`src/merge-driver/`)

**Responsibility:** Implement the `archlens merge-index` command invoked by git during merge operations.

**Key classes:**
- `IndexMerger` — unions two `index.json` files, detects ID conflicts, assigns sequential IDs
- `FileRenamer` — renames draft ADR files to sequential IDs after merge
- `ConflictDetector` — identifies ADRs that make mutually exclusive structural claims

**Input:** Three `index.json` file paths (base, ours, theirs)
**Output:** Merged `index.json` + renamed ADR files + `structural_conflict` events if applicable

#### 6.2.7 CLI (`src/cli/`)

**Responsibility:** User-facing terminal interface built with `ink`.

**Commands:**

| Command | Description |
|---|---|
| `archlens init` | Initialize ArchLens in a project |
| `archlens log` | List all ADRs |
| `archlens show {id}` | Display a single ADR |
| `archlens check` | Run drift detection |
| `archlens check --ci` | CI-mode drift detection |
| `archlens resolve {id} {id}` | Interactive conflict resolution |
| `archlens capture --manual` | Manual ADR authoring |
| `archlens serve` | Start MCP server |
| `archlens report` | Generate architecture summary |
| `archlens locks` | List active domain locks |
| `archlens locks clear {domain}` | Release a domain lock |
| `archlens config set {key} {value}` | Modify configuration |
| `archlens merge-index {base} {ours} {theirs}` | Git merge driver (internal) |

### 6.3 Dependency Graph

```
CLI
 └── Interceptor
 └── ADR Engine
      └── LLM Adapter
      └── ADR Formatter
      └── Storage Manager
 └── Drift Detector
      └── Language Registry (tree-sitter)
      └── Storage Manager
 └── MCP Server
      └── Storage Manager
      └── Semantic Search
 └── Merge Driver
      └── Storage Manager
```

No circular dependencies. `Storage Manager` is the only shared dependency across modules. All other inter-module communication goes through typed event objects passed via function calls, not shared state.

### 6.4 Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Language | TypeScript 5.x | MCP SDK is TS-first; large OSS contributor pool; strong typing for complex data models |
| Runtime | Node.js 20 LTS | Stable, widely installed on developer machines; good native addon support for SQLite and tree-sitter |
| CLI framework | ink 5.x | React for terminals — enables rich interactive flows without a web UI |
| Structural parsing | node-tree-sitter + language grammars | Multi-language, battle-tested in Neovim/Zed/Helix; WASM grammars require no native compilation |
| Local database | better-sqlite3 | Synchronous API is correct for hook contexts; WAL mode for concurrency; FTS5 built-in |
| Vector search (v1.0) | sqlite-vec | Keeps everything in one file; no Postgres/Chroma dependency |
| MCP protocol | @modelcontextprotocol/sdk | Official SDK, correct implementation of spec |
| Dep analysis | dependency-cruiser | Battle-tested import graph analysis; supports JS/TS/CJS/ESM |
| LLM providers | Configurable: Ollama / Anthropic SDK / OpenAI SDK / Groq SDK | No lock-in; local-first default |
| Build | tsup | Fast ESM + CJS dual output; minimal config |
| Test | vitest | Fast, TS-native, good mocking primitives |
| Linting | biome | Fast, opinionated, zero config for OSS |

---

## 7. Data Architecture

### 7.1 SQLite Schema

```sql
-- Core ADR records
CREATE TABLE decisions (
  id              TEXT PRIMARY KEY,  -- "ADR-007" or "ADR-draft-{hash}"
  draft_id        TEXT UNIQUE,       -- content hash, always present
  title           TEXT NOT NULL,
  status          TEXT NOT NULL CHECK(status IN ('draft','accepted','superseded','deprecated')),
  created_at      TEXT NOT NULL,     -- ISO-8601
  merged_at       TEXT,              -- set when sequential ID assigned
  tags            TEXT,              -- JSON array
  supersedes      TEXT,              -- JSON array of ADR IDs
  participants    TEXT NOT NULL,     -- JSON array of {name, role}
  body_md_path    TEXT NOT NULL,     -- relative path to .md file
  body_json_path  TEXT NOT NULL,     -- relative path to .json sidecar
  schema_version  INTEGER NOT NULL DEFAULT 1
);

-- Full-text search index over ADR content (MVP)
CREATE VIRTUAL TABLE decisions_fts USING fts5(
  id UNINDEXED,
  title,
  body_text,
  tags,
  content='decisions'
);

-- Structural snapshots for drift detection
CREATE TABLE structural_snapshots (
  id              TEXT PRIMARY KEY,  -- UUID
  commit_sha      TEXT,
  captured_at     TEXT NOT NULL,
  module_graph    TEXT NOT NULL,     -- JSON: {module: [imports]}
  dep_manifest    TEXT NOT NULL,     -- JSON: {name: version}
  patterns        TEXT NOT NULL,     -- JSON: {pattern_name: [locations]}
  api_contracts   TEXT NOT NULL,     -- JSON: {contract_id: fingerprint}
  language_stats  TEXT NOT NULL      -- JSON: {lang: file_count}
);

-- Drift events
CREATE TABLE drift_events (
  id              TEXT PRIMARY KEY,
  detected_at     TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  severity        TEXT NOT NULL CHECK(severity IN ('info','warning','error')),
  adr_id          TEXT REFERENCES decisions(id),
  description     TEXT NOT NULL,
  affected_paths  TEXT NOT NULL,     -- JSON array
  resolved        INTEGER DEFAULT 0,
  resolved_at     TEXT
);

-- Domain locks (mirrored from filesystem for querying)
CREATE TABLE domain_locks (
  domain          TEXT PRIMARY KEY,
  holder_agent    TEXT NOT NULL,
  session_id      TEXT NOT NULL,
  acquired_at     TEXT NOT NULL,
  expires_at      TEXT NOT NULL
);

-- Schema migrations tracking
CREATE TABLE schema_migrations (
  version         INTEGER PRIMARY KEY,
  applied_at      TEXT NOT NULL
);
```

### 7.2 File System Layout

```
{project-root}/
├── .archlens/
│   ├── config.json           # User configuration
│   ├── store.db              # SQLite database
│   ├── store.db-wal          # SQLite WAL file (auto-managed)
│   ├── error.log             # Non-blocking error log
│   ├── capture.queue         # Async capture job queue (JSONL)
│   └── locks/
│       ├── domain-auth.lock
│       └── domain-data-layer.lock
├── docs/
│   └── decisions/
│       ├── index.json        # Master ADR index (custom merge driver)
│       ├── ADR-001-redis-session-storage.md
│       ├── ADR-001-redis-session-storage.json
│       ├── ADR-002-singleton-auth.md
│       ├── ADR-002-singleton-auth.json
│       └── ADR-draft-a3f9bc-new-decision.md  # pre-merge drafts
└── .gitattributes             # contains merge driver config
```

### 7.3 ADR Markdown Format

```markdown
---
id: ADR-007
draft-id: a3f9bc2d
title: Use Redis for session storage
status: accepted
date: 2026-04-25T14:32:00Z
schema_version: 1
participants:
  - name: Priya Sharma
    role: author
  - name: Kiran Mehta
    role: reviewer
  - name: claude-code
    role: ai-agent
supersedes: []
tags:
  - dependency
  - session
  - data-layer
---

## Context

The application previously used in-memory session storage, which caused session loss on any process restart and prevented horizontal scaling beyond a single instance.

## Decision

We will use Redis 7.x as the session store, accessed via the `ioredis` client library.

## Rationale

Redis provides persistence across restarts, supports horizontal scaling via clustering, and the `ioredis` client has the broadest test coverage and active maintenance of the available clients.

## Tradeoffs

Accepting: an additional infrastructure dependency (Redis must be running locally for development and in production).

Rejecting: `connect-memcached` (no built-in persistence), `connect-pg-simple` (PostgreSQL not yet in stack — would add second DB dependency).

## Consequences

- Local development setup must include Redis (added to `docker-compose.yml`)
- Deployment environments must provision a Redis instance
- Session serialization format is now JSON (not binary) for Redis compatibility
```

---

## 8. External Interface Requirements

### 8.1 Git Interface

**EIF-GIT-001** ArchLens hooks must use the standard git hook invocation contract — no assumptions about the hook runner (Husky, Lefthook, raw git hooks). Each hook script must be a self-contained executable.

**EIF-GIT-002** The post-commit hook must read the diff via `git diff HEAD~1 HEAD --name-status` and `git show HEAD` (commit message, author, co-authors).

**EIF-GIT-003** The pre-push hook must invoke `archlens check` and relay its exit code to git.

**EIF-GIT-004** The post-merge hook must invoke `archlens check` for structural conflict detection.

**EIF-GIT-005** The merge driver must conform to the git merge driver contract: called with `%O %A %B` (base, ours, theirs) and must write the merged result to the `%A` path.

### 8.2 MCP Protocol Interface

**EIF-MCP-001** The MCP server must implement the MCP 2025-03 specification: initialization handshake, tool listing, and tool call protocol.

**EIF-MCP-002** All MCP tool inputs and outputs must be JSON-serializable and conform to the JSON Schema definitions registered in the `tools/list` response.

**EIF-MCP-003** The MCP server must set `serverInfo.name` to `"archlens"` and `serverInfo.version` to the current package version in the initialize response.

### 8.3 LLM Provider Interface

All LLM providers are accessed through a common `LLMAdapter` interface:

```typescript
interface LLMAdapter {
  complete(prompt: LLMPrompt): Promise<LLMResponse>;
  isAvailable(): Promise<boolean>;
  providerName: string;
}

interface LLMPrompt {
  system: string;
  user: string;
  max_tokens: number;
  temperature: number;
}

interface LLMResponse {
  content: string;
  input_tokens: number;
  output_tokens: number;
  provider: string;
  model: string;
}
```

### 8.4 CI/CD Interface

**EIF-CI-001** `archlens check --ci` must write drift events to stdout as a JSON array and write GitHub Actions annotation strings to stderr.

**EIF-CI-002** Exit codes: `0` = no error-severity drift, `1` = one or more error-severity drift events, `2` = ArchLens internal error (should not block CI).

**EIF-CI-003** The published npm package must include a ready-to-use GitHub Actions workflow file at `.github/workflows/archlens.yml` that teams can copy into their repos.

---

## 9. Collaboration and Concurrency Model

*(Full detail documented in the ArchLens design document. Summary below for SRS traceability.)*

### 9.1 Real-Time Pair Programming

Single git session. Both authors captured via `Co-authored-by:` git trailer. No special handling required beyond FR-COLLAB-005.

### 9.2 Async Branch-Based Collaboration

Governed by FR-COLLAB-001 through FR-COLLAB-006 and the custom merge driver (FR-MERGE-*). ADRs are append-only, never edited. Draft IDs prevent collision. Sequential IDs assigned at merge time in deterministic chronological order.

### 9.3 Multi-Agent Parallelism

Governed by FR-LOCK-001 through FR-LOCK-005. Domain locks are file-based (visible in `git status`), time-bounded (configurable TTL), and cleared automatically on commit. The MCP server enforces lock checks before returning `get_impact_preview` results.

### 9.4 Concurrency in SQLite

All SQLite access uses WAL mode (FR-REL-003). The Storage Manager serializes all writes through a single connection with prepared statements. Read operations are concurrent via WAL's reader/writer separation.

---

## 10. Security Requirements

**SEC-001** ArchLens must never execute arbitrary code from ADR content, LLM responses, or config files. All LLM output must be treated as untrusted string data and parsed through a sanitizing ADR formatter before being written to disk. *(P0)*

**SEC-002** API keys in config must be loaded from environment variables at runtime. The config file may store a reference like `$ANTHROPIC_API_KEY`, but must never store the resolved value. ArchLens must warn if a key appears to be a literal secret rather than an env var reference. *(P0)*

**SEC-003** The MCP server socket must be scoped to the local user's socket directory. TCP mode must bind to `127.0.0.1` only. No network exposure. *(P0)*

**SEC-004** ArchLens must not store full file contents in SQLite — only structural metadata (AST summaries, import graphs, dependency names/versions). The SQLite store must be safe to commit to a public repo in terms of information exposure. *(P0)*

**SEC-005** When constructing LLM prompts, ArchLens must strip any content that matches common secret patterns (API keys, passwords, private keys, tokens) from the diff before sending. A configurable secret scanning pattern list must be applied. *(P1)*

**SEC-006** Domain lock files must include a session ID derived from the local machine's hostname and process ID. Lock files from a different machine must be flagged as suspect when detected in a shared repo. *(P1)*

---

## 11. Deployment Strategies

ArchLens is a developer tool, not a service. "Deployment" means distribution, installation, and adoption patterns — not infrastructure provisioning. The following strategies address each adoption scenario.

---

### 11.1 Individual Developer — Zero-Config Local

**Target:** Solo developer, greenfield or existing project, no team coordination needed.

**Distribution:** npm global install or npx (no install).

```bash
# Zero-install, try immediately
npx archlens@latest init

# Or permanent global install
npm install -g archlens
archlens init
```

**LLM backend:** Ollama running locally (bundled in quickstart docs). Zero cloud credentials, fully offline.

```bash
# Ollama setup (one-time)
brew install ollama
ollama pull llama3.2
archlens config set llm.provider ollama
archlens config set llm.model llama3.2
```

**Upgrade path:** `npm update -g archlens`. Version pinning per project via `package.json` `devDependencies` for teams that want reproducibility.

**Rollback:** `npm install -g archlens@{version}`. The `.archlens/store.db` is forward-compatible via schema migrations; rollbacks to prior versions will use the `--legacy` flag to skip unrecognized schema fields.

---

### 11.2 Team Adoption — Git-Committed Config

**Target:** 2–10 person engineering team. Wants consistent ArchLens behavior across all machines. ADRs live in the repo.

**Strategy:** Commit `.archlens/config.json` (without secrets) and `.gitattributes` to the repo. Each developer runs `archlens init` on clone, which installs local hooks without requiring remote coordination.

```bash
# Initial setup (run once by team lead)
archlens init
git add .archlens/config.json .gitattributes
git commit -m "chore: add ArchLens configuration"
git push

# Each team member on clone
git clone {repo}
cd {repo}
archlens init   # installs local hooks, reads committed config
```

**LLM backend:** Team decides — cloud (Claude/OpenAI with shared API key via `.env`) or local (Ollama on each machine). Recommended: `.env.example` in repo with `ANTHROPIC_API_KEY=` placeholder.

**Onboarding new developers:** `npx archlens init` + copy `.env.example` to `.env` and fill in key. Under 5 minutes.

**Config propagation:** Changes to `.archlens/config.json` propagate via normal git pull. No coordination required.

---

### 11.3 CI/CD Enforcement — GitHub Actions

**Target:** Any team wanting drift detection enforced on every PR, not just on developer machines.

**Strategy:** Add ArchLens as a CI step that runs `archlens check --ci`. This is a read-only operation — no LLM calls, no writes. It runs entirely from the committed ADR index and the checked-out code.

```yaml
# .github/workflows/archlens.yml
name: ArchLens Drift Check

on:
  pull_request:
    branches: [main, develop]

jobs:
  drift-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # full history needed for ADR index

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install ArchLens
        run: npm install -g archlens@${{ env.ARCHLENS_VERSION }}
        env:
          ARCHLENS_VERSION: '1.0.0'  # pin for reproducibility

      - name: Run drift check
        run: archlens check --ci
        # exits 1 on error-severity drift, annotates PR with findings
```

**Branch protection:** Configure GitHub to require the `drift-check` job to pass before merging. This enforces that no PR can merge structural changes without either an ADR or a `archlens resolve` call.

**No LLM needed in CI:** `archlens check --ci` is purely analytical — it reads the existing ADR index and the codebase structure. No LLM call. No API key needed in CI.

**Customizing CI severity:** Teams can use `--warn-only` during gradual adoption to surface drift without blocking PRs, then promote to blocking once ADR coverage reaches a target threshold.

```yaml
      - name: Run drift check (non-blocking during migration)
        run: archlens check --ci --warn-only
```

---

### 11.4 Open Source Project — Contributor Workflow

**Target:** Open source maintainer wanting incoming PRs to include ADRs for structural changes.

**Strategy:** Combine CI enforcement (11.3) with a PR template that links to ArchLens docs, and a `CONTRIBUTING.md` section on ADR authoring.

**PR template addition:**
```markdown
## Architectural changes

If this PR introduces a structural change (new dependency, new module, pattern change, schema change):
- [ ] I ran `archlens capture` or ArchLens auto-generated an ADR
- [ ] The ADR is included in this PR: `docs/decisions/ADR-draft-{hash}-{slug}.md`
- [ ] `archlens check` passes locally
```

**Maintainer workflow for external contributors without ArchLens:** The CI step will catch missing ADRs on `error`-severity drift and annotate the PR. The maintainer can then run `archlens capture --manual` to author an ADR on behalf of the contributor if needed.

---

### 11.5 Enterprise / Air-Gapped Environments

**Target:** Teams with no internet access, strict data governance, or private LLM deployments.

**LLM configuration:** Point to any OpenAI-compatible endpoint (Ollama, vLLM, LM Studio, private Azure OpenAI deployment):

```json
{
  "llm": {
    "provider": "openai",
    "model": "llama-3.1-70b",
    "base_url": "https://internal-llm.corp.example.com/v1",
    "api_key": "$INTERNAL_LLM_API_KEY"
  }
}
```

**Package distribution:** In air-gapped environments, ArchLens can be pre-packaged and distributed via an internal npm registry (Artifactory, Verdaccio, AWS CodeArtifact). The npm publish workflow will support a `--registry` flag.

```bash
# Internal registry install
npm install -g archlens --registry https://npm.internal.corp.example.com
```

**No outbound traffic:** With a local LLM, ArchLens makes zero outbound network calls. All processing is local. Suitable for SOC 2, HIPAA, and air-gapped environments.

**Audit logging:** For compliance, `.archlens/error.log` can be configured to emit structured JSON logs suitable for ingestion into internal SIEM systems. This is a v1.0 feature.

---

### 11.6 Self-Hosted MCP Server (Team Shared Instance)

**Target:** Large team (10+) wanting a shared ArchLens MCP server so all developers query a single, centralized ADR index rather than each maintaining their own local SQLite store.

**Architecture:**

```
┌────────────────────────────────────────────────────────┐
│                  Shared Infrastructure                   │
│                                                         │
│   ArchLens MCP Server (Docker container)               │
│     └── Reads from: shared git repo (cloned locally)   │
│     └── SQLite store on shared volume                  │
│     └── Exposed on: tcp://archlens.internal:4242        │
└────────────────────────────────────────────────────────┘
         ↑ MCP queries from all developer machines
```

**Docker deployment:**

```dockerfile
FROM node:20-alpine
RUN npm install -g archlens
WORKDIR /repo
COPY . .
RUN archlens init --no-hooks   # skip git hooks on server
EXPOSE 4242
CMD ["archlens", "serve", "--port", "4242", "--host", "0.0.0.0"]
```

```yaml
# docker-compose.yml
services:
  archlens:
    build: .
    ports:
      - "4242:4242"
    volumes:
      - archlens-data:/repo/.archlens
    restart: unless-stopped
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}

volumes:
  archlens-data:
```

**Developer `.mcp.json` in this mode:**

```json
{
  "mcpServers": {
    "archlens": {
      "url": "tcp://archlens.internal:4242"
    }
  }
}
```

**Sync strategy:** The shared server runs `git pull` on a cron (every 5 minutes) to pick up new ADRs committed by developers. A webhook from the git server can trigger immediate pulls on push.

**Note:** This deployment mode is post-MVP. It requires the MCP server to support TCP transport and shared SQLite access patterns tested under concurrent load.

---

### 11.7 Version Management and Upgrade Strategy

**Semantic versioning:** ArchLens follows strict semver. Breaking changes to the ADR schema, CLI interface, or MCP tool signatures are major version bumps.

**Schema migrations:** SQLite schema changes are handled by `MigrationRunner` on startup. Migrations are append-only — no destructive schema changes in patch or minor versions.

**ADR schema versioning:** The `schema_version` field in ADR frontmatter allows the tool to handle ADRs written by older versions. Old ADRs are never modified during upgrades.

**Deprecation policy:** Features deprecated in a minor version will be removed no earlier than the next major version, with a minimum 6-month notice period in the changelog.

**Rollback procedure:**

```bash
# Rollback to specific version
npm install -g archlens@1.2.3

# Check for schema compatibility
archlens check --schema-version

# If schema is ahead of binary, run in legacy mode
archlens check --legacy
```

---

## 12. Testing Requirements

### 12.1 Unit Testing

All core modules must have unit tests covering: happy path, error conditions, edge cases (empty input, malformed input, concurrent access). Minimum 80% line coverage enforced in CI.

Key test scenarios:

- `SignalClassifier` must correctly classify all signal types and correctly reject noise
- `ADRFormatter` must produce valid frontmatter YAML for all combinations of participants, tags, and supersedes references
- `DriftAnalyzer` must produce correct typed events for each drift type
- `IndexMerger` must produce identical output regardless of the order of the two branches being merged
- `SQLiteStore` must handle concurrent reads and writes without corruption under a 10-thread stress test

### 12.2 Integration Testing

End-to-end tests must cover the full pipeline using a real temporary git repository:

- Commit adding a new npm dependency → ADR created with correct content
- Two branches with conflicting ADRs merged → `structural_conflict` event emitted
- `archlens check` run against a codebase with removed dependency → `dependency_removed` warning emitted
- MCP tool call `get_impact_preview` with a diff containing a new service boundary → correct impact summary returned

### 12.3 Compatibility Testing

- All CLI commands tested on macOS 14, Ubuntu 22.04, and Windows 11 (WSL2) in CI
- ADR output validated for compatibility with `adr-tools` CLI
- MCP server tested against Claude Code and at least one other MCP client (Cursor or Aider)

### 12.4 Performance Testing

- `archlens check` benchmarked on a synthetic 500,000-line TypeScript codebase — must complete in under 10 seconds
- SQLite FTS5 query benchmarked against a 10,000-ADR index — must return in under 500ms
- Post-commit hook benchmarked end-to-end including async LLM call queue — hook must return in under 1 second regardless of LLM latency

---

## 13. Constraints and Assumptions

### 13.1 Constraints

- ArchLens is a read-only observer of source code. It must never modify, delete, or reformat source files.
- The tool must not require root or administrator privileges on any supported platform.
- The npm package size (excluding optional language grammar packages) must not exceed 15MB to keep install time fast.
- ArchLens must not introduce any runtime dependencies that have known security advisories at the time of release.

### 13.2 Assumptions

- Developers have git 2.30+ installed and are working in a git repository.
- At MVP, teams are assumed to use one of the three supported languages (JS/TS, Python, Go) for drift detection.
- The LLM provider (cloud or local) is capable of producing structured prose output from a well-defined prompt without fine-tuning.
- ADRs are authored in English at MVP. Internationalization is a post-v1.0 concern.
- Teams using the CI enforcement strategy have a GitHub Actions-compatible CI environment. GitLab CI and CircleCI templates are v1.0 deliverables.

### 13.3 Known Limitations at MVP

- Drift detection is structural, not semantic. If a developer manually reimplements the same pattern in a different file, ArchLens may not detect the pattern as "present."
- LLM-generated ADRs will occasionally miss nuance in the rationale. The tool is designed to make imperfect documentation normal; a stub ADR that needs one sentence of human editing is infinitely better than no ADR.
- The MCP bridge (real-time observation of AI agent tool calls) requires the agent to connect to ArchLens as an MCP server. Agents that do not support MCP are supported via git hooks only — ADRs are captured post-commit rather than in real time.

---

## 14. Glossary

| Term | Definition |
|---|---|
| ADR | Architecture Decision Record. A structured document capturing a single significant architectural decision. |
| Architectural Domain | A logical grouping of code with shared architectural concerns — e.g., "auth," "data-layer," "api-contracts." Used for domain locking. |
| Content Hash | A SHA-256 hash of an ADR's content, used as its identity before a sequential ID is assigned at merge time. |
| Drift | The state where the live codebase has diverged from what the ADR index describes as the intended architecture. |
| Domain Lock | A file-based mechanism preventing concurrent AI agents from making structural changes to the same architectural domain. |
| FTS5 | SQLite's built-in full-text search module, used for ADR querying at MVP. |
| MCP | Model Context Protocol. Anthropic's open protocol for connecting AI agents to external data and tool sources. |
| Structural Change | A code change that crosses an architectural threshold: new external dependency, new service boundary, new design pattern, API contract modification, or schema change. |
| Structural Conflict | A state where two ADRs in the same index make mutually exclusive architectural claims. |
| Supersession ADR | An ADR that explicitly replaces one or more prior ADRs, preserving the history of the original decision while recording the new one. |
| tree-sitter | A fast, multi-language parser generator used for AST-based structural analysis of source code. |
| WAL | Write-Ahead Logging. SQLite's concurrency-safe write mode used by ArchLens. |

---

## 15. Appendices

### Appendix A: Supported Dependency Manifest Formats

| Format | Language/Ecosystem | MVP | v1.0 |
|---|---|---|---|
| `package.json` | Node.js / JavaScript | ✓ | ✓ |
| `go.mod` | Go | ✓ | ✓ |
| `pyproject.toml` | Python | ✓ | ✓ |
| `Cargo.toml` | Rust | ✓ | ✓ |
| `requirements.txt` | Python | — | ✓ |
| `Pipfile` | Python | — | ✓ |
| `pom.xml` | Java/Maven | — | ✓ |
| `build.gradle` | Java/Kotlin/Gradle | — | ✓ |
| `Gemfile` | Ruby | — | ✓ |
| `go.sum` | Go (lockfile) | — | ✓ |
| `Cargo.lock` | Rust (lockfile) | — | ✓ |

### Appendix B: Supported Tree-Sitter Language Grammars

| Language | Grammar Package | MVP | v1.0 |
|---|---|---|---|
| JavaScript | `tree-sitter-javascript` | ✓ | ✓ |
| TypeScript | `tree-sitter-typescript` | ✓ | ✓ |
| Python | `tree-sitter-python` | ✓ | ✓ |
| Go | `tree-sitter-go` | ✓ | ✓ |
| Rust | `tree-sitter-rust` | — | ✓ |
| Java | `tree-sitter-java` | — | ✓ |
| Ruby | `tree-sitter-ruby` | — | ✓ |
| C/C++ | `tree-sitter-c` / `tree-sitter-cpp` | — | ✓ |

### Appendix C: MCP Tool JSON Schemas

**`query_decisions` input schema:**
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Natural language question about architectural decisions"
    },
    "limit": {
      "type": "integer",
      "default": 5,
      "description": "Maximum number of ADRs to return"
    },
    "status_filter": {
      "type": "array",
      "items": { "enum": ["draft", "accepted", "superseded", "deprecated"] },
      "description": "Filter by ADR status. Defaults to ['accepted']"
    }
  },
  "required": ["query"]
}
```

**`get_impact_preview` input schema:**
```json
{
  "type": "object",
  "properties": {
    "diff": {
      "type": "string",
      "description": "Unified diff of the proposed change"
    },
    "context": {
      "type": "string",
      "description": "Optional: description of intent from the agent"
    }
  },
  "required": ["diff"]
}
```

### Appendix D: Related Projects and Prior Art

| Project | What it does | How ArchLens differs |
|---|---|---|
| adr-tools | CLI for manually creating ADR files | ArchLens auto-generates ADRs from code changes; adr-tools requires manual authoring |
| SpecKit / GitHub Kiro | Generates specs and tasks from natural language | Works greenfield only; doesn't capture decisions from existing code; no drift detection |
| Architecture Haiku | ADR generation tool | No git integration, no drift detection, no MCP interface, no collision-free merge strategy |
| Backstage | Developer portal with software catalog | Full platform, not a composable tool; requires infrastructure; no ADR automation |
| Cursor / Claude Code | AI coding agents | ArchLens is a layer on top of these; not a replacement |

### Appendix E: Changelog

| Version | Date | Changes |
|---|---|---|
| 1.0.0 | 2026-04-25 | Initial SRS draft |

---

*ArchLens SRS v1.0.0 — Licensed MIT — github.com/archlens/archlens*