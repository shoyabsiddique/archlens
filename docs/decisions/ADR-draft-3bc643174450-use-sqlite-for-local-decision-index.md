---
id: ADR-draft-3bc643174450
draft-id: 3bc643174450
title: Use SQLite for Local Decision Index
status: draft
date: '2026-04-26T20:51:24.555Z'
participants:
  - name: ArchLens Team
    role: author
supersedes: []
tags:
  - storage
  - local-first
  - database
schema_version: 1
---

## Context
ArchLens needs to store architectural decisions and metadata locally for fast queries without external dependencies.

## Decision
Use SQLite with a single project-local database file for persistent storage of ADRs and drift events.

## Rationale
SQLite is embedded, requires no server setup, supports full-text search, and is ideal for local-first applications.

## Tradeoffs
Writes are serialized, schema migrations are needed, and there's no built-in replication.

## Consequences
Projects have zero external database dependencies while maintaining powerful search and query capabilities.
