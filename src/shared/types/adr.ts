export type ADRStatus = "draft" | "accepted" | "superseded" | "deprecated";

export interface ADRParticipant {
  name: string;
  role: "author" | "reviewer" | "ai-agent";
}

export interface ADRBody {
  context: string;
  decision: string;
  rationale: string;
  tradeoffs: string;
  consequences: string;
}

export interface ADR {
  id: string;
  draftId: string;
  title: string;
  status: ADRStatus;
  date: string;
  participants: ADRParticipant[];
  supersedes: string[];
  tags: string[];
  body: ADRBody;
  bodyMdPath: string;
  schemaVersion: number;
}

export interface ADRDraft extends ADR {
  id: `ADR-draft-${string}`;
  status: "draft";
}

export interface ADRFrontmatter {
  id: string;
  "draft-id": string;
  title: string;
  status: ADRStatus;
  date: string;
  participants: ADRParticipant[];
  supersedes?: string[];
  tags?: string[];
  schema_version: number;
}
