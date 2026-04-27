import { z } from "zod";

export const signalTypes = [
  "dependency_added",
  "dependency_removed",
  "new_module",
  "api_contract_changed",
  "schema_changed",
  "import_graph_changed",
] as const;

export const LLMProviderSchema = z.enum(["ollama", "claude", "openai", "groq"]);

const DetectionConfigSchema = z.object({
  watch_paths: z.array(z.string()).default(["src", "lib", "pkg"]),
  ignore_paths: z.array(z.string()).default(["node_modules", "dist", ".git", "coverage"]),
  disabled_signal_types: z.array(z.enum(signalTypes)).default([]),
});

const AdrConfigSchema = z.object({
  output_dir: z.string().default("docs/decisions"),
  prompt_template: z.string().optional(),
});

const LocksConfigSchema = z.object({
  ttl_hours: z.number().int().positive().default(4),
});

const McpConfigSchema = z.object({
  socket_path: z.string().optional(),
  port: z.number().int().positive().optional(),
});

const LlmConfigSchema = z.object({
  provider: LLMProviderSchema.default("ollama"),
  model: z.string().min(1).default("llama3.2"),
  api_key: z.string().optional(),
  base_url: z.string().url().optional(),
});

export const ArchLensConfigSchema = z.object({
  llm: LlmConfigSchema.default({}),
  detection: DetectionConfigSchema.default({}),
  adr: AdrConfigSchema.default({}),
  locks: LocksConfigSchema.default({}),
  mcp: McpConfigSchema.default({}),
});

export type ArchLensConfig = z.infer<typeof ArchLensConfigSchema>;
export type LLMProvider = z.infer<typeof LLMProviderSchema>;
