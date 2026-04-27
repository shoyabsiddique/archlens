import yaml from "js-yaml";

import type {
  ADR,
  ADRBody,
  ADRDraft,
  ADRFrontmatter,
  ADRParticipant,
} from "../shared/types/adr.js";
import { hashContent, slugify } from "../shared/utils/hash.js";

export interface ManualADRInput {
  title: string;
  context: string;
  decision: string;
  rationale: string;
  tradeoffs: string;
  consequences: string;
  tags?: string[];
  participants?: ADRParticipant[];
  supersedes?: string[];
  date?: string;
}

export function buildDraftADR(input: ManualADRInput): ADRDraft {
  const body: ADRBody = {
    context: input.context,
    decision: input.decision,
    rationale: input.rationale,
    tradeoffs: input.tradeoffs,
    consequences: input.consequences,
  };
  const date = input.date ?? new Date().toISOString();
  const slug = slugify(input.title) || "decision";
  const contentBasis = JSON.stringify({
    title: input.title,
    body,
    date,
  });
  const draftId = hashContent(contentBasis);
  const id = `ADR-draft-${draftId}` as const;

  return {
    id,
    draftId,
    title: input.title,
    status: "draft",
    date,
    participants: input.participants ?? [],
    supersedes: input.supersedes ?? [],
    tags: input.tags ?? [],
    body,
    bodyMdPath: `docs/decisions/${id}-${slug}.md`,
    schemaVersion: 1,
  };
}

export function formatADRMarkdown(adr: ADR): string {
  const frontmatter: ADRFrontmatter = {
    id: adr.id,
    "draft-id": adr.draftId,
    title: adr.title,
    status: adr.status,
    date: adr.date,
    participants: adr.participants,
    supersedes: adr.supersedes,
    tags: adr.tags,
    schema_version: adr.schemaVersion,
  };

  return [
    "---",
    yaml.dump(frontmatter, { noRefs: true }).trimEnd(),
    "---",
    "",
    "## Context",
    adr.body.context,
    "",
    "## Decision",
    adr.body.decision,
    "",
    "## Rationale",
    adr.body.rationale,
    "",
    "## Tradeoffs",
    adr.body.tradeoffs,
    "",
    "## Consequences",
    adr.body.consequences,
    "",
  ].join("\n");
}
