import { resolve } from "node:path";
import { Command } from "commander";
import prompts from "prompts";

import { buildDraftADR } from "../../adr-engine/formatter.js";
import { writeADR } from "../../adr-engine/writer.js";
import { getCommitDetails, getParticipantList } from "../../shared/git.js";
import { logger } from "../../shared/utils/logger.js";
import { resolveProjectRoot } from "../../shared/utils/paths.js";
import { SQLiteStore } from "../../storage/sqlite-store.js";

interface CaptureOptions {
  manual?: boolean;
  title?: string;
  context?: string;
  decision?: string;
  rationale?: string;
  tradeoffs?: string;
  consequences?: string;
  tags?: string;
  fromCommit?: string;
}

function parseTags(input?: string): string[] {
  return (
    input
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean) ?? []
  );
}

export function createCaptureCommand(): Command {
  return new Command("capture")
    .description("Create ADR drafts manually or from a git commit")
    .option("--manual", "Create a manual ADR draft")
    .option("--from-commit <ref>", "Generate an ADR draft from a commit diff")
    .option("--title <title>", "ADR title")
    .option("--context <context>", "ADR context section")
    .option("--decision <decision>", "ADR decision section")
    .option("--rationale <rationale>", "ADR rationale section")
    .option("--tradeoffs <tradeoffs>", "ADR tradeoffs section")
    .option("--consequences <consequences>", "ADR consequences section")
    .option("--tags <tags>", "Comma-separated tags")
    .action(async (options: CaptureOptions) => {
      const projectRoot = resolveProjectRoot();
      const participants = await getParticipantList(projectRoot);

      const adr = options.fromCommit
        ? await createDraftFromCommit(projectRoot, options.fromCommit, participants)
        : buildDraftADR(await collectManualDraftInput(options, participants));

      const store = new SQLiteStore(projectRoot);
      const absolutePath = writeADR(projectRoot, adr);
      store.insertADR({
        ...adr,
        bodyMdPath: resolve(projectRoot, adr.bodyMdPath),
      });
      store.close();

      logger.info(`ADR written to ${absolutePath}`);
    });
}

async function collectManualDraftInput(
  options: CaptureOptions,
  participants: Awaited<ReturnType<typeof getParticipantList>>,
) {
  const initial = {
    title: options.title,
    context: options.context,
    decision: options.decision,
    rationale: options.rationale,
    tradeoffs: options.tradeoffs,
    consequences: options.consequences,
    tags: options.tags,
  };

  const needsPrompt =
    process.stdin.isTTY
    && process.stdout.isTTY
    && Object.values(initial).some((value) => value === undefined);

  if (needsPrompt) {
    const response = await prompts(
      [
        {
          type: initial.title ? null : "text",
          name: "title",
          message: "Title",
          validate: (value: string) => (value.trim().length > 0 ? true : "Title is required."),
        },
        {
          type: initial.context ? null : "text",
          name: "context",
          message: "Context",
          validate: (value: string) => (value.trim().length > 0 ? true : "Context is required."),
        },
        {
          type: initial.decision ? null : "text",
          name: "decision",
          message: "Decision",
          validate: (value: string) => (value.trim().length > 0 ? true : "Decision is required."),
        },
        {
          type: initial.rationale ? null : "text",
          name: "rationale",
          message: "Rationale",
          initial: "Rationale not yet documented.",
        },
        {
          type: initial.tradeoffs ? null : "text",
          name: "tradeoffs",
          message: "Tradeoffs",
          initial: "Tradeoffs not yet documented.",
        },
        {
          type: initial.consequences ? null : "text",
          name: "consequences",
          message: "Consequences",
          validate: (value: string) =>
            value.trim().length > 0 ? true : "Consequences are required.",
        },
        {
          type: initial.tags ? null : "text",
          name: "tags",
          message: "Tags (comma-separated)",
        },
      ],
      {
        onCancel: () => {
          throw new Error("ADR capture cancelled.");
        },
      },
    );

    return {
      title: (initial.title ?? response.title ?? "Untitled decision").trim(),
      context: (initial.context ?? response.context ?? "No context provided.").trim(),
      decision: (initial.decision ?? response.decision ?? "Decision not yet documented.").trim(),
      rationale: (initial.rationale ?? response.rationale ?? "Rationale not yet documented.").trim(),
      tradeoffs: (initial.tradeoffs ?? response.tradeoffs ?? "Tradeoffs not yet documented.").trim(),
      consequences: (initial.consequences ?? response.consequences ?? "Consequences not yet documented.").trim(),
      tags: parseTags(initial.tags ?? response.tags),
      participants,
    };
  }

  return {
    title: options.title ?? "Untitled decision",
    context: options.context ?? "No context provided.",
    decision: options.decision ?? "Decision not yet documented.",
    rationale: options.rationale ?? "Rationale not yet documented.",
    tradeoffs: options.tradeoffs ?? "Tradeoffs not yet documented.",
    consequences: options.consequences ?? "Consequences not yet documented.",
    tags: parseTags(options.tags),
    participants,
  };
}

async function createDraftFromCommit(
  projectRoot: string,
  commitRef: string,
  participants: Awaited<ReturnType<typeof getParticipantList>>,
) {
  const commit = await getCommitDetails(projectRoot, commitRef);
  const title = deriveTitleFromDiff(commit.diff, commit.message);

  return buildDraftADR({
    title,
    context: [
      `Commit: ${commit.sha}`,
      `Message: ${commit.message}`,
      "",
      "This ADR draft was generated from a structural-looking git diff.",
    ].join("\n"),
    decision: summarizeDecision(commit.diff),
    rationale: "The code change introduces or modifies project structure and should be documented.",
    tradeoffs:
      "This auto-generated draft may require human refinement for nuance and alternatives.",
    consequences: "Review the draft before accepting it as a permanent architectural record.",
    tags: inferTags(commit.diff),
    participants,
  });
}

function deriveTitleFromDiff(diff: string, fallback: string): string {
  if (diff.includes("package.json")) {
    return `Record dependency change from ${fallback}`;
  }
  if (diff.match(/^\+\+\+ b\/(src|lib|pkg)\/.+$/m)) {
    return `Record new module structure from ${fallback}`;
  }
  return `Record structural change from ${fallback}`;
}

function summarizeDecision(diff: string): string {
  if (diff.includes("package.json")) {
    return "Adopt the dependency changes reflected in package.json for the evolving application architecture.";
  }
  if (diff.match(/^\+\+\+ b\/(src|lib|pkg)\/.+$/m)) {
    return "Adopt the newly introduced source module structure reflected in the commit.";
  }
  return "Adopt the structural change represented in the referenced commit.";
}

function inferTags(diff: string): string[] {
  const tags = new Set<string>();
  if (diff.includes("package.json")) {
    tags.add("dependency");
  }
  if (diff.match(/^\+\+\+ b\/src\/.+$/m)) {
    tags.add("module");
  }
  return [...tags];
}
