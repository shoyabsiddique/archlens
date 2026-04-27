# ArchLens

> Architectural decision intelligence for AI-assisted development

[![Node.js](https://img.shields.io/badge/Node.js->=20.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

ArchLens is an intelligent architectural decision management system that helps development teams capture, track, and analyze architectural decisions in their codebase. It integrates with AI language models via the Model Context Protocol (MCP) to provide architectural insights and drift detection.

## ✨ Features

- **📋 Architecture Decision Records (ADR)** - Capture and manage architectural decisions with full lifecycle support
- **🔍 Drift Detection** - Automatically detect when code deviates from established architectural decisions
- **🤖 AI Integration** - Connect with language models (OpenAI, etc.) via MCP for intelligent decision queries and impact analysis
- **⚡ CLI Interface** - Powerful command-line tools for developers and CI/CD pipelines
- **💾 Persistent Storage** - SQLite-based storage for decisions, drift events, and project snapshots
- **🔧 Configuration Management** - Project-specific settings with LLM provider configuration

## 🚀 Quick Start

### Installation

```bash
npm install -g archlens
```

Or use with `npx`:

```bash
npx archlens --help
```

### Initialize Your Project

```bash
cd your-project
archlens init
```

This creates:
- `.archlens/config.json` - Project configuration
- `.archlens/archlens.db` - SQLite database
- `docs/decisions/` - Directory for ADR files
- `.mcp.json` - Project-scoped MCP config for Claude Code and compatible clients
- `.vscode/mcp.json` - Workspace MCP config for VS Code / Copilot
- `.cursor/mcp.json` - Workspace MCP config for Cursor

### Capture an Architectural Decision

```bash
archlens capture
```

You'll be prompted to enter:
- **Title**: Brief decision description
- **Context**: Why this decision is needed
- **Decision**: What you decided
- **Consequences**: Implications of this decision

Your ADR will be:
- Saved as a markdown file in `docs/decisions/`
- Indexed in the database
- Ready for drift detection and AI queries

### Check for Architectural Drift

```bash
archlens check
```

Detects changes that deviate from your architectural decisions and reports them with severity levels.

## 📖 Documentation

### Available Commands

| Command | Purpose |
|---------|---------|
| `archlens init` | Initialize ArchLens in a project |
| `archlens capture` | Record a new architectural decision |
| `archlens check` | Detect architectural drift |
| `archlens import` | Import existing ADR files |
| `archlens show <id>` | Display decision details |
| `archlens log` | View decision history |
| `archlens resolve <id>` | Mark drift as resolved |
| `archlens serve` | Start MCP server for AI integration |

### Configuration

Create or edit `.archlens/config.json`:

```json
{
  "llm": {
    "provider": "openai",
    "model": "gpt-5.4"
  },
  "detection": {
    "watch_paths": ["src", "lib", "pkg"],
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

**LLM Configuration**:
- Set `LLM_API_KEY` environment variable with your OpenAI API key
- Supports compatible endpoints for local models

## 🤖 MCP Server Integration

ArchLens provides a Model Context Protocol (MCP) server that exposes architectural intelligence to AI assistants.

### Start the MCP Server

```bash
archlens serve
```

When you run `archlens init`, ArchLens also writes project-scoped MCP configuration files so compatible clients can discover the server automatically from the repository.

The server provides three main tools:

### 1. **query_decisions** - Search Architectural Decisions

Query your ADRs using natural language:

```
"What decisions relate to microservices architecture?"
"Show me all accepted decisions about database schema"
"Find decisions about authentication and security"
```

**Returns**:
- Matching decisions with ID, title, status, date, and tags
- Optional filtering by status (draft, accepted, superseded, deprecated)
- Summaries of decision context and rationale

### 2. **get_impact_preview** - Analyze Code Change Impact

Analyze a proposed code diff to understand architectural implications:

```
Input: Unified diff of proposed changes
Output: 
  - Detected architectural signals (dependency changes, schema changes, etc.)
  - Affected file paths
  - Related ADRs that might be impacted
```

**Use Cases**:
- Before making significant structural changes
- Understanding what ADRs are affected by a PR
- Teaching new developers about architectural constraints

### 3. **list_drift_events** - Monitor Architectural Violations

View unresolved architectural drift events:

```
Input: Optional severity filter (info, warning, error)
Output:
  - List of drift events with descriptions
  - Affected file paths
  - Severity levels
```

**Use Cases**:
- CI/CD pipeline integration
- Architecture governance
- Identifying areas that need refactoring

### Example: Using with Claude

In VS Code with GitHub Copilot:

```
@archlens What architectural decisions relate to our API design?
@archlens What's the impact of moving this service to a separate module?
@archlens List any architectural drift we need to address
```

The MCP server automatically provides context from your local ADRs to the AI assistant.

## 🏗️ Architecture

ArchLens is modular and organized into several key components:

```
src/
├── cli/              # Command-line interface
│   └── commands/     # Individual command implementations
├── mcp-server/       # MCP protocol server
│   ├── server.ts     # MCP tool registration
│   └── impact-analyzer.ts  # Code diff analysis
├── adr-engine/       # ADR parsing and formatting
├── drift-detector/   # Architectural drift detection
├── storage/          # Data persistence
│   ├── sqlite-store.ts
│   └── migrations/
└── shared/           # Shared utilities and types
    ├── types/        # TypeScript type definitions
    └── utils/        # Helper functions
```

### Key Design Principles

- **Type-Safe**: Full TypeScript support with strict mode
- **Modular**: Independent components with clear interfaces
- **Persistent**: SQLite-based storage with migrations
- **Extensible**: Easy to add new detection signals or tools
- **AI-Ready**: MCP protocol for seamless LLM integration

## 🔌 Programmatic API

Use ArchLens as a library in your Node.js projects:

```typescript
import {
  loadConfig,
  createArchLensMcpServer,
  analyzeDrift,
  buildStructuralSnapshot,
  SQLiteStore,
} from "archlens";

// Load project configuration
const config = loadConfig("/path/to/project");

// Create MCP server instance
const server = createArchLensMcpServer("/path/to/project");

// Analyze drift
const driftEvents = analyzeDrift("/path/to/project");

// Build baseline snapshot
const snapshot = buildStructuralSnapshot("/path/to/project");

// Access decision store
const store = new SQLiteStore("/path/to/project");
const decisions = store.listADRs();
store.close();
```

## 📊 Workflow Examples

### Example 1: Team Decision Capture

```bash
# Developer captures a decision about authentication strategy
$ archlens capture
? Title: Implement JWT-based authentication
? Context: Need secure, stateless authentication for microservices
? Decision: Use JWT tokens with refresh token rotation
? Consequences: Requires token validation on each request, increased complexity

# Decision is stored and indexed
✓ Created ADR-001-jwt-authentication.md
```

### Example 2: Drift Detection in CI/CD

```bash
# CI/CD pipeline checks for architectural violations
$ archlens check

⚠ DRIFT DETECTED:
  - Direct database access in API handler (expected via service layer)
  - Synchronous RPC call in critical path (should use async messaging)

Severity: warning
Affected paths: src/handlers/user.ts, src/services/profile.ts
```

### Example 3: AI-Assisted Code Review

With ArchLens MCP server running and connected to Claude:

```
Developer: @archlens What architectural constraints should I be aware of when 
           implementing the new notification system?

Claude: Based on your architectural decisions:
  - ADR-003: Microservice Communication Pattern
  - ADR-007: Event-Driven Architecture
  
The notification system should use async messaging and avoid direct 
service-to-service calls. Here's an implementation plan...
```

## 🧪 Development

### Build

```bash
npm run build
```

### Test

```bash
npm run test          # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

### Lint and Format

```bash
npm run lint         # Check code quality
npm run lint:fix     # Auto-fix issues
npm run format       # Format code
npm run typecheck    # TypeScript type checking
```

### Development Server

```bash
npm run dev          # Run CLI in development mode
npm run build:watch  # Watch and rebuild
```

## 📋 Supported ADR Format

ArchLens supports markdown files with YAML front matter:

```markdown
---
id: ADR-001
title: Use JWT for Authentication
status: accepted
date: 2026-04-25
participants:
  - Alice (Tech Lead)
  - Bob (Backend Engineer)
tags:
  - security
  - authentication
---

## Context

We need a secure way to authenticate users across our microservices...

## Decision

We will use JWT tokens with the following properties...

## Consequences

Positive:
- Stateless authentication
- Easy horizontal scaling

Negative:
- Token revocation is complex
- Token size in headers
```

## 🔐 Security Considerations

- **Configuration**: Store LLM API keys in environment variables, not in config files
- **Database**: SQLite database file is stored in `.archlens/` directory
- **Git**: ArchLens respects `.gitignore` and standard Git configurations
- **No Logs**: Sensitive information is not logged to output

## 🌍 System Requirements

- **Node.js**: 20.0.0 or higher (LTS versions: 20, 22, 24)
- **Operating System**: Windows, macOS, Linux
- **Git**: 2.0 or later
- **Disk Space**: Minimal (< 50MB including database)
- **Memory**: < 512MB for typical projects

## 📦 Dependencies

Core dependencies:
- `@modelcontextprotocol/sdk` - MCP protocol support
- `better-sqlite3` - SQLite database
- `commander` - CLI framework
- `zod` - Type-safe configuration validation
- `chalk` - Terminal colors
- `execa` - Git command execution

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass: `npm run test`
5. Ensure code quality: `npm run lint`
6. Submit a pull request

## 📝 License

MIT © 2026 ArchLens Contributors

## 🙋 Support

- **Documentation**: See `docs/` directory
- **Issues**: GitHub Issues
- **Questions**: GitHub Discussions
- **MCP Specification**: https://spec.modelcontextprotocol.io/

## 🗺️ Roadmap

- [ ] Web UI for decision browsing
- [ ] Decision templates
- [ ] Custom drift detection rules
- [ ] Decision versioning
- [ ] Dependency analysis integration
- [ ] Architecture visualization
- [ ] Team collaboration features
- [ ] Decision impact scoring

## 👥 Authors

ArchLens is developed and maintained by the Architecture Intelligence team.

---

**Made with ❤️ for better architectural decisions in AI-assisted development**
