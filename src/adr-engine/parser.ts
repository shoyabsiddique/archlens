import { readFileSync } from "node:fs";

import yaml from "js-yaml";

import { ValidationError } from "../shared/errors/index.js";
import type { ADR, ADRBody, ADRFrontmatter } from "../shared/types/adr.js";
import { normalizePath } from "../shared/utils/paths.js";

function extractSection(markdown: string, heading: string): string {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`## ${escapedHeading}\\s*([\\s\\S]*?)(?=\\n## |$)`);
  const match = markdown.match(pattern);
  return match?.[1]?.trim() ?? "";
}

export function parseADRMarkdown(filePath: string): ADR {
  const raw = readFileSync(filePath, "utf8");
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new ValidationError(`ADR file ${filePath} is missing frontmatter.`);
  }

  const frontmatterRaw = match[1];
  const bodyRaw = match[2];
  if (frontmatterRaw === undefined || bodyRaw === undefined) {
    throw new ValidationError(`ADR file ${filePath} is malformed.`);
  }

  const parsed = yaml.load(frontmatterRaw);
  if (!parsed || typeof parsed !== "object") {
    throw new ValidationError(`ADR file ${filePath} has invalid frontmatter.`);
  }

  const frontmatter = parsed as Partial<ADRFrontmatter>;
  const body: ADRBody = {
    context: extractSection(bodyRaw, "Context"),
    decision: extractSection(bodyRaw, "Decision"),
    rationale: extractSection(bodyRaw, "Rationale"),
    tradeoffs: extractSection(bodyRaw, "Tradeoffs"),
    consequences: extractSection(bodyRaw, "Consequences"),
  };

  if (!frontmatter.id || !frontmatter["draft-id"] || !frontmatter.title) {
    throw new ValidationError(`ADR file ${filePath} is missing required metadata.`);
  }

  return {
    id: frontmatter.id,
    draftId: frontmatter["draft-id"],
    title: frontmatter.title,
    status: frontmatter.status ?? "draft",
    date: frontmatter.date ?? new Date().toISOString(),
    participants: frontmatter.participants ?? [],
    supersedes: frontmatter.supersedes ?? [],
    tags: frontmatter.tags ?? [],
    body,
    bodyMdPath: normalizePath(filePath),
    schemaVersion: frontmatter.schema_version ?? 1,
  };
}
