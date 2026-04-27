# Agent Instructions Feature

## Overview

ArchLens can generate AI agent instruction files during project initialization. These files guide supported assistants to consult the ArchLens MCP server before making architectural recommendations or structural changes.

## Supported Agents

- **GitHub Copilot** - `.github/copilot-instructions.md`
- **Claude** - `CLAUDE.md`
- **GPT-4** - `.agents/gpt4/AGENTS.md`
- **Antigravity** - `.agents/antigravity/AGENTS.md`
- **Qwen** - `.agents/qwen/AGENTS.md`
- **Custom** - `.agents/custom/AGENTS.md`

## Initialization

### Interactive Mode

When you run `archlens init` without `--agents`, ArchLens prompts you to choose which assistants to configure.

```bash
archlens init
```

### CLI Mode

You can also configure agents directly:

```bash
archlens init --agents github-copilot,claude,gpt4
archlens init --agents claude
archlens init --agents github-copilot,qwen --dry-run
```

## Generated Content

Each generated instruction file includes:

1. A core directive to consult ArchLens before architectural changes
2. Guidance for `query_decisions`
3. Guidance for `get_impact_preview`
4. Recommended workflows for architectural questions
5. Agent-specific notes

## Example Result

After running `archlens init --agents github-copilot,claude,qwen`, the project can include:

- `.github/copilot-instructions.md`
- `CLAUDE.md`
- `.agents/qwen/AGENTS.md`

Alongside the normal ArchLens files:

- `.archlens/config.json`
- `.archlens/archlens.db`
- `docs/decisions/.gitkeep`
- Git hooks for capture and import automation

## Behavior

- Existing instruction files are not overwritten
- Running `init` multiple times is safe
- Additional agents can be added later with another `archlens init --agents ...`

## Implementation

The feature is implemented across:

- `src/shared/types/agents.ts`
- `src/cli/agent-instructions.ts`
- `src/cli/commands/init.ts`
- `src/cli/project.ts`
- `tests/unit/cli/agent-instructions.test.ts`
- `tests/unit/cli/init.test.ts`

## Testing

Run the relevant checks with:

```bash
npm run test -- tests/unit/cli/agent-instructions.test.ts tests/unit/cli/init.test.ts
```
