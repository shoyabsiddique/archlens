/**
 * Agent Instruction Generator
 * Generates instruction content for AI agents to query ArchLens MCP server
 */

import type { SupportedAgent } from "../shared/types/agents.js";

export function generateAgentInstructions(agent: SupportedAgent): string {
  const baseInstructions = `# ArchLens Integration Instructions

You are working with a project that uses ArchLens for architectural decision management.

## Core Directive

**Before making or explaining any architectural changes, structural modifications, or design decisions:**

1. Query the ArchLens MCP server to understand established architectural decisions
2. Use \`query_decisions\` to find relevant architectural decisions and constraints
3. Use \`get_impact_preview\` to analyze proposed changes against existing decisions
4. Reference the decisions in your explanations and recommendations

## Available MCP Tools

### query_decisions
Search and retrieve Architecture Decision Records (ADRs) using natural language.

**Usage:**
- "What storage solutions have we decided on?"
- "How should we handle authentication?"
- "What are our database technology decisions?"

**Returns:** Matching ADRs with context, decision details, and consequences

### get_impact_preview
Analyze proposed code changes to determine architectural impact.

**Usage:**
- Provide a unified diff of proposed changes
- Includes optional context about the change intent
- Returns assessment of architectural alignment

**Returns:** Architectural impact analysis with severity levels

## Guidelines

✅ **DO:**
- Query ArchLens decisions before proposing architectural changes
- Reference specific ADR IDs when explaining decisions
- Use impact analysis for code restructuring suggestions
- Respect status of decisions (draft vs. accepted vs. superseded)

❌ **DON'T:**
- Suggest changes that violate established architectural decisions without noting the violation
- Propose technology changes without checking prior decisions
- Make structural changes recommendations without impact analysis

## Example Workflow

1. **User asks:** "Should we add a caching layer?"
2. **You should:**
   - Query: "cache, performance, data storage"
   - Check if caching decisions exist
   - Review any constraints or rationale
   - Suggest options aligned with decisions
   - Reference the ADR IDs that guided your suggestion

3. **User proposes code change:**
   - Analyze the diff with \`get_impact_preview\`
   - Report any architectural concerns
   - Suggest modifications if needed

## Project Context

This project uses ArchLens MCP server running locally to expose architectural intelligence to AI assistants. All architectural decisions are tracked in the \`.archlens/archlens.db\` SQLite database and documented in \`docs/decisions/\`.

For more information, run: \`archlens --help\`
`;

  const agentSpecificAddons: Record<SupportedAgent, string> = {
    "github-copilot": `\n## GitHub Copilot Specific Notes

- These instructions will be automatically used in the GitHub Copilot chat interface
- Use the context window efficiently when querying MCP tools
- Reference ADRs by ID (e.g., ADR-001, ADR-draft-xxxxx) in your completions
- When suggesting code changes, explain architectural alignment
`,
    claude: `\n## Claude Specific Notes

- Leverage Claude's strong reasoning abilities to deeply analyze architectural decisions
- When querying decisions, provide clear summaries of how they impact recommendations
- Use Claude's ability to reference multiple ADRs when suggesting integrated changes
- Provide detailed consequences analysis alongside recommendations
`,
    gpt4: `\n## GPT-4 Specific Notes

- Use structured queries to get precise architectural decision information
- Reference decision IDs when explaining architectural constraints
- Utilize GPT-4's reasoning to connect multiple architectural decisions
- Provide clear trade-off analysis when suggesting alternatives
`,
    antigravity: `\n## Antigravity Specific Notes

- Antigravity's distributed reasoning can help find connections between decisions
- Use decision queries to identify architectural patterns
- Leverage natural language processing for complex decision searches
- Reference decision chains and their consequences
`,
    qwen: `\n## Qwen Specific Notes

- Qwen's multilingual capabilities can help document decisions in various languages
- Use precise Chinese queries if needed when searching decisions
- Reference architectural decisions clearly for cross-team communication
- Provide structured analysis of decision impact
`,
    custom: `\n## Custom Agent Notes

- Configure this template for your specific agent's needs
- Adjust MCP query patterns based on agent capabilities
- Reference your agent's documentation for optimal integration
- Test MCP tool calls in your specific environment
`,
  };

  return baseInstructions + agentSpecificAddons[agent];
}
