---
id: ADR-draft-24a60153ca89
draft-id: 24a60153ca89
title: Implement Git-Based Change Detection
status: draft
date: '2026-04-26T20:51:24.653Z'
participants:
  - name: ArchLens Team
    role: author
supersedes: []
tags:
  - drift-detection
  - git
  - signals
schema_version: 1
---

## Context
ArchLens needs to detect when code changes violate architectural decisions. Git diffs provide granular change information.

## Decision
Analyze git diffs to extract architectural signals and compare against baseline snapshots to detect drift.

## Rationale
Git integration is natural for developers and captures exact changes that may violate decisions.

## Tradeoffs
Limited to files tracked in git, requires parsing git diffs, and needs baseline snapshots.

## Consequences
Drift detection is integrated into the development workflow via git hooks and CI/CD pipelines.
