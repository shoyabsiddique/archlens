# Agent Instructions Feature

## Overview

ArchLens now includes an **Agent Instructions Feature** that automatically generates and manages AI agent instruction files during project initialization. These instructions guide AI agents (GitHub Copilot, Claude, GPT-4, etc.) to query the ArchLens MCP server before making architectural decisions.

## Feature Details

### Supported Agents

The feature supports configuring instructions for the following agents:

- **GitHub Copilot** - `.github/copilot-instructions.md`
- **Claude** - `.agents/claude/.instructions.md`
- **GPT-4** - `.agents/gpt4/.instructions.md`
- **Antigravity** - `.agents/antigravity/.instructions.md`
- **Qwen** - `.agents/qwen/.instructions.md`
- **Custom** - `.agents/custom/.instructions.md`

### Initialization

#### Interactive Mode

When running `archlens init` without the `--agents` flag, you'll be prompted to select which agents to configure:

```bash
$ archlens init

? Which agents would you like to configure instructions for?
❯ ⊙ GitHub Copilot
  ⊙ Claude
  ⊙ GPT-4
  ⊙ Antigravity
  ⊙ Qwen
  ⊙ Custom Agent

[Use Space to select, Enter to confirm]
```

#### CLI Mode

You can also specify agents directly via command-line:

```bash
# Configure multiple agents
archlens init --agents github-copilot,claude,gpt4

# Configure a single agent
archlens init --agents claude

# Dry-run to see what would happen
archlens init --agents github-copilot,qwen --dry-run
```

### Instruction Content

Each generated instruction file contains:

1. **Core Directive** - Instructions to query the MCP server before making decisions
2. **MCP Tools Reference** - Explanation of `query_decisions` and `get_impact_preview` tools
3. **Guidelines** - Do's and don'ts for using ArchLens information
4. **Example Workflow** - Practical example of how to use the tools
5. **Project Context** - Information about the ArchLens setup
6. **Agent-Specific Notes** - Tailored guidance for each AI agent

### Example Instruction Content

```markdown
# ArchLens Integration Instructions

You are working with a project that uses ArchLens for architectural decision management.

## Core Directive

**Before making or explaining any architectural changes, structural modifications, or design decisions:**

1. Query the ArchLens MCP server to understand established architectural decisions
2. Use `query_decisions` to find relevant architectural decisions and constraints
3. Use `get_impact_preview` to analyze proposed changes against existing decisions
4. Reference the decisions in your explanations and recommendations

## Available MCP Tools

### query_decisions
Search and retrieve Architecture Decision Records (ADRs) using natural language...

### get_impact_preview
Analyze proposed code changes to determine architectural impact...

[... more content ...]
```

## Implementation Details

### Key Files Modified

1. **`src/shared/types/agents.ts`** - New file defining agent types and configurations
2. **`src/cli/agent-instructions.ts`** - New file for generating instruction content
3. **`src/cli/commands/init.ts`** - Updated to support interactive agent selection
4. **`src/cli/project.ts`** - Updated to create agent instruction files
5. **`package.json`** - Added `prompts` dependency for interactive prompts
6. **Tests** - Added comprehensive test coverage for the feature

### Architecture

```
archlens init command
├── Prompt user for agent selection
├── Pass selected agents to initializeProject
└── For each selected agent:
    ├── Resolve instruction file path
    ├── Create directory structure
    ├── Generate instruction content
    └── Write to file (non-overwriting)
```

## How It Works

### Step-by-Step Example

1. **Initialize ArchLens**:
   ```bash
   $ cd my-project
   $ archlens init
   ```

2. **Select Agents**:
   ```
   ? Which agents would you like to configure instructions for?
   ❯ GitHub Copilot
   ❯ Claude
   ```

3. **Instructions Created**:
   ```
   ✓ Initialized ArchLens
   ✓ Created agent instructions for GitHub Copilot at .github/copilot-instructions.md
   ✓ Created agent instructions for Claude at .agents/claude/.instructions.md
   ✓ Database ready for architectural decisions
   ```

4. **Result**:
   - `docs/decisions/` - Directory for ADR markdown files
   - `.archlens/store.db` - SQLite database for indexing
   - `.github/copilot-instructions.md` - GitHub Copilot instructions
   - `.agents/claude/.instructions.md` - Claude instructions
   - Git hooks for automatic ADR capture and importing

## Idempotency

The feature is **idempotent** - running init multiple times is safe:

- If instruction files already exist, they are **not overwritten**
- Subsequent runs log which files were skipped
- You can add new agents later by running `archlens init --agents agent-name`

## Testing

The feature includes comprehensive test coverage:

- **Agent instructions generation** - Tests all supported agents
- **Agent-specific guidance** - Verifies each agent gets tailored content
- **Project initialization** - Tests agent instruction creation during init
- **Directory creation** - Ensures nested directories are created correctly
- **Idempotency** - Verifies files aren't overwritten

Run tests with:
```bash
npm run test
```

## Usage Patterns

### Scenario 1: GitHub Copilot Users

```bash
archlens init --agents github-copilot
```

GitHub Copilot will automatically load `.github/copilot-instructions.md` and follow the guidance when coding.

### Scenario 2: Claude/GPT Integration

```bash
archlens init --agents claude,gpt4
```

Both Claude and GPT-4 instruction files are created, allowing them to query architectural decisions in their separate contexts.

### Scenario 3: Mixed AI Assistants

```bash
archlens init --agents github-copilot,claude,custom
```

All agents in your team's workflow get properly configured instructions.

## Benefits

✅ **Consistent Guidance** - All AI agents receive the same architectural wisdom  
✅ **Automatic Setup** - No manual instruction file creation needed  
✅ **Agent-Specific** - Tailored guidance for each AI platform  
✅ **MCP Integration** - Seamless connection to the ArchLens MCP server  
✅ **Safe** - Non-overwriting, idempotent, works with custom instructions  
✅ **Discoverable** - Clear example workflows for developers  

## Future Enhancements

Potential improvements for this feature:

- [ ] Custom instruction templates per organization
- [ ] Instruction update checks (when ArchLens updates)
- [ ] Agent-specific configuration options
- [ ] Integration with IDE settings (VS Code, JetBrains)
- [ ] Instruction validation and linting
- [ ] Version tracking for generated instructions
