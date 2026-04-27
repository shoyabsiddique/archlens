# Software Requirements Specification (SRS)
## ArchLens - Architectural Decision Intelligence for AI-Assisted Development

**Version:** 1.0  
**Date:** April 2026  
**Status:** Active  
**Author:** ArchLens Development Team  

---

## Table of Contents

1. [Introduction](#introduction)
2. [Overall Description](#overall-description)
3. [Functional Requirements](#functional-requirements)
4. [Non-Functional Requirements](#non-functional-requirements)
5. [External Interface Requirements](#external-interface-requirements)
6. [System Constraints](#system-constraints)
7. [Use Cases](#use-cases)
8. [Acceptance Criteria](#acceptance-criteria)

---

## 1. Introduction

### 1.1 Purpose

ArchLens is an architectural decision intelligence tool designed to assist developers and teams in managing, tracking, and analyzing architectural decisions within their codebase. It provides automated drift detection, decision recording, and integrates with AI language models to provide intelligent insights about architectural changes.

### 1.2 Scope

ArchLens encompasses the following capabilities:
- Architecture Decision Record (ADR) management and lifecycle
- Architectural drift detection and analysis
- Git-based change signal detection and analysis
- Model Context Protocol (MCP) server integration for AI tools
- CLI interface for command-line operations
- SQLite-based persistence for decisions and snapshots
- Configuration management for project-specific settings

### 1.3 Document Conventions

- **MUST**: Mandatory requirement that must be implemented
- **SHOULD**: Highly recommended requirement
- **MAY**: Optional enhancement
- **SHALL**: Formal obligation or specification

### 1.4 Intended Audience

- Development teams using ArchLens
- AI assistant integrations (via MCP)
- Architects and technical leads
- DevOps and CI/CD pipeline operators

---

## 2. Overall Description

### 2.1 Product Perspective

ArchLens operates as a standalone application with multiple interfaces:
- **CLI Tool**: Command-line interface for direct user interaction
- **MCP Server**: Integration point for AI language models and assistants
- **Library**: Programmatic API for embedding in other tools
- **Storage Backend**: SQLite database for persistence

### 2.2 Product Features

#### Core Features:
1. **ADR Management** - Create, import, parse, and manage Architecture Decision Records
2. **Drift Detection** - Automatically detect and report architectural drift in codebases
3. **Change Analysis** - Analyze Git changes and extract architectural signals
4. **MCP Integration** - Expose decision and drift analysis capabilities via MCP protocol
5. **Configuration Management** - Project-specific configuration with LLM provider support
6. **Persistence Layer** - Store and retrieve architectural data via SQL

#### Supporting Features:
- ADR formatting and validation
- Snapshot building for baseline architectural state
- Impact analysis for proposed changes
- Lock management for concurrent operations
- Comprehensive logging and error handling

### 2.3 User Characteristics

- **Technical Users**: Developers familiar with Git, command-line tools, and architecture patterns
- **AI Integration Users**: Applications integrating via MCP protocol
- **Team Leads**: Non-technical users reviewing architectural decisions through AI assistants
- **DevOps**: CI/CD pipeline integrations for automated drift checking

### 2.4 Operating Environment

- **Node.js Runtime**: Version 20.0.0 or higher
- **Platform**: Cross-platform (Windows, macOS, Linux)
- **Database**: SQLite 3.x
- **Version Control**: Git repositories
- **LLM Providers**: OpenAI or compatible endpoints

---

## 3. Functional Requirements

### 3.1 ADR Management (FR-ADR)

#### FR-ADR-1: ADR Creation and Initialization
- **Description**: System MUST support initializing ADR directories in projects
- **Precondition**: Valid project path with Git repository
- **Postcondition**: ADR directory structure created with appropriate configuration
- **Priority**: High

#### FR-ADR-2: ADR Import
- **Description**: System MUST import existing ADR files from project directories
- **Details**:
  - Support YAML front matter format
  - Parse markdown content
  - Extract metadata (status, participants, date)
  - Validate structure
- **Priority**: High

#### FR-ADR-3: ADR Parsing and Validation
- **Description**: System MUST parse and validate ADR content
- **Details**:
  - Extract front matter metadata
  - Validate required fields (title, status, date, participants)
  - Parse markdown body
  - Support multiple ADR formats
- **Priority**: High

#### FR-ADR-4: ADR Formatting
- **Description**: System MUST format ADRs according to standards
- **Details**:
  - Generate consistent file naming
  - Format metadata in YAML
  - Include proper markdown structure
  - Support custom formatting rules
- **Priority**: Medium

#### FR-ADR-5: ADR Storage and Retrieval
- **Description**: System MUST persist and retrieve ADR data
- **Details**:
  - Store in SQLite database
  - Index ADRs by ID, status, date
  - Support full-text search
  - Maintain versioning
- **Priority**: High

### 3.2 Drift Detection (FR-DRIFT)

#### FR-DRIFT-1: Structural Snapshot Building
- **Description**: System MUST create baseline snapshots of codebase structure
- **Details**:
  - Hash directory structures
  - Record file paths and types
  - Track dependencies
  - Generate timestamp-based snapshots
- **Priority**: High

#### FR-DRIFT-2: Architectural Drift Detection
- **Description**: System MUST detect deviations from architectural decisions
- **Details**:
  - Compare current state to baseline
  - Identify unauthorized changes
  - Classify drift types (structure, dependency, pattern)
  - Generate drift events
- **Priority**: High

#### FR-DRIFT-3: Drift Event Recording
- **Description**: System MUST record and persist drift events
- **Details**:
  - Store in SQLite database
  - Include severity levels
  - Link to affected ADRs
  - Timestamp all events
- **Priority**: High

#### FR-DRIFT-4: Change Signal Detection
- **Description**: System MUST analyze Git commits for architectural signals
- **Details**:
  - Detect file additions/deletions/modifications
  - Identify affected directories
  - Extract commit metadata
  - Classify change types
- **Priority**: Medium

### 3.3 CLI Interface (FR-CLI)

#### FR-CLI-1: Command Structure
- **Description**: System MUST provide comprehensive CLI commands
- **Commands MUST include**:
  - `init` - Initialize ADR project
  - `capture` - Capture architectural decisions
  - `check` - Check for architectural drift
  - `import` - Import ADRs from files
  - `show` - Display decision details
  - `log` - View decision history
  - `resolve` - Mark drift as resolved
  - `serve` - Start MCP server
- **Priority**: High

#### FR-CLI-2: Command Error Handling
- **Description**: System MUST provide clear error messages and exit codes
- **Details**:
  - Validate input parameters
  - Provide helpful error context
  - Return appropriate exit codes (0 for success, non-zero for errors)
  - Log detailed error information
- **Priority**: High

#### FR-CLI-3: Output Formatting
- **Description**: System MUST format CLI output for readability
- **Details**:
  - Support JSON output format
  - Color-coded terminal output
  - Formatted tables for lists
  - Structured error messages
- **Priority**: Medium

#### FR-CLI-4: Interactive Prompts
- **Description**: System SHOULD support interactive user input
- **Details**:
  - Prompt for required fields
  - Validate input before processing
  - Allow defaults
- **Priority**: Medium

### 3.4 MCP Server Integration (FR-MCP)

#### FR-MCP-1: MCP Protocol Implementation
- **Description**: System MUST implement Model Context Protocol specification
- **Details**:
  - Support JSON-RPC 2.0 communication
  - Implement resource endpoints
  - Support tool invocation
- **Priority**: High

#### FR-MCP-2: Decision Query Tool
- **Description**: System MUST provide decision querying via MCP
- **Details**:
  - Query decisions by ID, status, date range
  - Full-text search across decisions
  - Return structured decision data
  - Support filtering and sorting
- **Priority**: High

#### FR-MCP-3: Drift Analysis Tool
- **Description**: System MUST expose drift analysis via MCP
- **Details**:
  - List unresolved drift events
  - Get drift event details
  - Return severity and impact information
- **Priority**: High

#### FR-MCP-4: Impact Preview Tool
- **Description**: System MUST provide impact analysis for code changes
- **Details**:
  - Accept proposed diffs
  - Analyze architectural impact
  - Provide impact summary
  - Link to affected decisions
- **Priority**: High

### 3.5 Configuration Management (FR-CONFIG)

#### FR-CONFIG-1: Configuration File Support
- **Description**: System MUST support `.archlens/config.json` files
- **Details**:
  - Load project-specific settings
  - Support LLM provider configuration
  - Configure detection paths
  - Set ADR output directory
- **Priority**: High

#### FR-CONFIG-2: Default Configuration
- **Description**: System MUST provide sensible defaults
- **Details**:
  - Default watch paths: src, lib, pkg
  - Default ignore paths: node_modules, dist, .git, coverage
  - Default LLM provider: OpenAI
  - Default ADR output: docs/decisions
- **Priority**: High

#### FR-CONFIG-3: Configuration Validation
- **Description**: System MUST validate configuration values
- **Details**:
  - Validate provider selection
  - Check path existence
  - Validate LLM model strings
  - Provide validation error messages
- **Priority**: Medium

### 3.6 Storage and Persistence (FR-STORAGE)

#### FR-STORAGE-1: SQLite Database
- **Description**: System MUST use SQLite for persistence
- **Details**:
  - Support migration-based schema
  - Implement schema versioning
  - Create indexes for performance
  - Support ACID transactions
- **Priority**: High

#### FR-STORAGE-2: Data Migration System
- **Description**: System MUST support database schema migrations
- **Details**:
  - Track applied migrations
  - Support incremental upgrades
  - Preserve data integrity
  - Allow rollback capability (documented)
- **Priority**: High

#### FR-STORAGE-3: File-Based Storage
- **Description**: System MUST support file-based ADR storage
- **Details**:
  - Read/write ADR markdown files
  - Maintain file structure
  - Sync with database
  - Preserve formatting
- **Priority**: Medium

---

## 4. Non-Functional Requirements

### 4.1 Performance (NFR-PERF)

#### NFR-PERF-1: Drift Detection Speed
- System MUST complete drift detection on repositories with up to 10,000 files in under 30 seconds
- Database queries MUST return results in under 500ms for typical datasets

#### NFR-PERF-2: CLI Responsiveness
- CLI commands MUST execute initialization in under 5 seconds
- List operations MUST complete in under 3 seconds for typical datasets

#### NFR-PERF-3: Memory Usage
- System MUST operate within 512MB RAM for typical projects
- Large projects (>50,000 files) SHOULD not exceed 2GB RAM

### 4.2 Reliability (NFR-REL)

#### NFR-REL-1: Data Integrity
- All database operations MUST maintain ACID properties
- No data loss on application crash

#### NFR-REL-2: Error Recovery
- System MUST gracefully handle network failures
- Database locks MUST be managed with TTL (4 hours default)

#### NFR-REL-3: Availability
- System MUST support 24/7 operation
- MCP server MUST maintain connections for minimum 8 hours

### 4.3 Security (NFR-SEC)

#### NFR-SEC-1: Data Protection
- ADR data stored in database MUST be readable only by authorized users
- Configuration files SHOULD not contain sensitive keys

#### NFR-SEC-2: LLM Provider Security
- LLM API keys MUST be configurable via environment variables
- System MUST not log sensitive credentials

#### NFR-SEC-3: Git Operations
- Git operations MUST respect system-level Git configuration
- No automatic force-push or destructive operations

### 4.4 Usability (NFR-USE)

#### NFR-USE-1: CLI Usability
- All commands MUST support `--help` flag
- Error messages MUST be human-readable and actionable
- SHOULD provide command suggestions for typos

#### NFR-USE-2: Documentation
- All public APIs MUST have TypeScript type definitions
- CLI commands MUST have built-in help text

#### NFR-USE-3: Accessibility
- Color output MUST not be the only indicator (use symbols/text)
- SHOULD support NO_COLOR environment variable

### 4.5 Maintainability (NFR-MAINT)

#### NFR-MAINT-1: Code Quality
- TypeScript MUST use strict mode
- Code coverage SHOULD be maintained above 70%
- MUST pass biome linting checks

#### NFR-MAINT-2: Documentation
- All public functions MUST have JSDoc comments
- README SHOULD document all major features
- SHOULD include architecture diagrams

#### NFR-MAINT-3: Testing
- All public APIs MUST have unit tests
- Integration tests MUST cover major workflows
- CLI commands MUST have integration tests

### 4.6 Compatibility (NFR-COMPAT)

#### NFR-COMPAT-1: Node.js Versions
- System MUST support Node.js 20.0.0 and later
- SHOULD support LTS versions (20, 22, 24, etc.)

#### NFR-COMPAT-2: Operating Systems
- MUST work on Windows, macOS, and Linux
- SHOULD handle platform-specific path differences

#### NFR-COMPAT-3: LLM Provider Compatibility
- MUST support OpenAI API format
- SHOULD support compatible endpoints (local models)

#### NFR-COMPAT-4: Git Compatibility
- MUST support Git 2.0 and later
- SHOULD handle various Git configurations

---

## 5. External Interface Requirements

### 5.1 User Interfaces

#### CLI Interface
- Text-based command-line interface
- Interactive prompts and confirmations
- Color-coded output
- Progress indicators for long operations

### 5.2 Software Interfaces

#### Node.js Module API
- Exported functions for programmatic use
- TypeScript type definitions
- Zod schema validation

#### MCP Server Interface
- JSON-RPC 2.0 protocol
- Standard MCP resource endpoints
- Tool definitions for decision queries and drift analysis

### 5.3 Hardware Interfaces
- Standard disk I/O for file operations
- Standard network I/O for LLM API calls
- Standard Git operations via system Git binary

### 5.4 Communication Interfaces
- Git protocol (local repository operations)
- HTTP/HTTPS (LLM provider communication)
- stdio (MCP server communication)

---

## 6. System Constraints

### 6.1 Technical Constraints

#### TC-1: Node.js Runtime
- System MUST run on Node.js 20.0.0 or higher
- MUST be compatible with CommonJS and ES modules

#### TC-2: Database
- MUST use SQLite 3.x
- No external database server requirements
- File-based storage in project directory

#### TC-3: Git Requirements
- System Git binary MUST be available on PATH
- Requires Git 2.0 or later

#### TC-4: Dependencies
- Limited to production dependencies specified in package.json
- TypeScript compilation to JavaScript for distribution

### 6.2 Operational Constraints

#### OC-1: File System
- ADR files MUST be readable/writable in docs/decisions directory
- SQLite database MUST reside in .archlens directory

#### OC-2: Environment
- System MUST work with standard shell environments (bash, PowerShell, zsh)
- LLM API keys must be configured via environment variables or config

#### OC-3: Network
- Network connectivity required for LLM API calls
- No network requirement for core drift detection

### 6.3 Regulatory Constraints

#### RC-1: Licensing
- Project MUST maintain MIT license
- All dependencies MUST have compatible licenses

---

## 7. Use Cases

### UC-1: Initialize ArchLens in New Project

**Actor**: Developer  
**Precondition**: Git repository exists  
**Main Flow**:
1. Developer runs `archlens init`
2. System creates .archlens directory
3. System creates docs/decisions directory
4. System generates default config.json
5. System initializes SQLite database

**Postcondition**: Project ready for ADR management

### UC-2: Capture Architectural Decision

**Actor**: Developer  
**Precondition**: ArchLens initialized in project  
**Main Flow**:
1. Developer runs `archlens capture`
2. System prompts for decision details (title, context, decision, consequences)
3. System creates ADR file
4. System stores in database
5. System reports creation confirmation

**Postcondition**: New ADR recorded and indexed

### UC-3: Check for Architectural Drift

**Actor**: CI/CD Pipeline or Developer  
**Precondition**: ArchLens initialized, ADRs captured  
**Main Flow**:
1. System runs `archlens check`
2. System analyzes current codebase structure
3. System compares against decision constraints
4. System identifies violations
5. System reports drift events

**Postcondition**: Drift report generated (can fail build if violations exist)

### UC-4: Query Decisions via MCP

**Actor**: AI Assistant  
**Precondition**: MCP server running, decisions exist  
**Main Flow**:
1. Assistant calls decision query tool
2. System searches decision database
3. System returns matching decisions
4. Assistant uses in context

**Postcondition**: Assistant has decision context

### UC-5: Analyze Impact of Proposed Change

**Actor**: AI Assistant or Developer  
**Precondition**: MCP server running, ADRs exist  
**Main Flow**:
1. User proposes code diff
2. System analyzes diff against ADRs
3. System identifies affected decisions
4. System predicts impact
5. System returns impact analysis

**Postcondition**: Impact assessment provided to user

---

## 8. Acceptance Criteria

### AC-BUILD: Build and Deployment
- [ ] `npm run build` completes successfully with no errors
- [ ] Generated `dist/` directory contains all necessary files
- [ ] Generated CLI executable works: `./dist/cli/index.js --version`
- [ ] Package can be published to npm registry

### AC-TEST: Testing
- [ ] `npm run test` passes all unit and integration tests
- [ ] Code coverage reaches minimum 70%
- [ ] `npm run test:coverage` report includes all major modules
- [ ] No failing or skipped critical tests

### AC-LINT: Code Quality
- [ ] `npm run lint` passes all checks
- [ ] `npm run typecheck` shows no TypeScript errors
- [ ] No unused imports or variables
- [ ] Code follows biome formatting rules

### AC-CLI: CLI Functionality
- [ ] `archlens init` creates project structure
- [ ] `archlens capture` records decisions
- [ ] `archlens check` detects drift
- [ ] `archlens import` imports existing ADRs
- [ ] `archlens show` displays decision details
- [ ] All commands respond with proper exit codes
- [ ] All commands provide helpful error messages

### AC-MCP: MCP Server
- [ ] `archlens serve` starts without errors
- [ ] MCP server responds to connection requests
- [ ] Decision query tool returns results
- [ ] Drift analysis tool lists events
- [ ] Impact preview tool analyzes diffs

### AC-DATA: Data Persistence
- [ ] ADRs persist in SQLite database
- [ ] Drift events persist between runs
- [ ] Configuration loads correctly
- [ ] No data corruption on application crash

### AC-PERFORMANCE: Performance Targets
- [ ] Drift detection completes in < 30 seconds for 10K files
- [ ] Database queries return in < 500ms
- [ ] CLI commands start in < 5 seconds
- [ ] Memory usage stays under 512MB for typical projects

### AC-DOCUMENTATION: Documentation
- [ ] TypeScript types are exported correctly
- [ ] Public APIs have JSDoc documentation
- [ ] README.md documents key features
- [ ] CLI help text is complete and clear

### AC-COMPATIBILITY: System Compatibility
- [ ] Works on Windows, macOS, Linux
- [ ] Compatible with Node.js 20+
- [ ] Works with Git 2.0+
- [ ] Handles both forward and backward slashes in paths

---

## Appendix A: Glossary

| Term | Definition |
|------|-----------|
| **ADR** | Architecture Decision Record - a document capturing an important architectural decision |
| **Drift** | Deviation from established architectural decisions in the codebase |
| **Signal** | A change detected in Git commits that may indicate architectural significance |
| **Snapshot** | A point-in-time record of the codebase structure |
| **MCP** | Model Context Protocol - protocol for AI assistant integration |
| **LLM** | Large Language Model - AI model provider (e.g., OpenAI) |

---

## Appendix B: Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | April 2026 | Development Team | Initial SRS creation |

---

## Appendix C: Related Documents

- Architecture Decision Records (docs/decisions/)
- System Design Document (TBD)
- Test Plan (TBD)
- User Guide (TBD)
- API Reference (TBD)
