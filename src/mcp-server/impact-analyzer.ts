import type { ADR } from "../shared/types/adr.js";

export interface ImpactPreview {
  [key: string]: unknown;
  summary: string;
  signalTypes: string[];
  affectedPaths: string[];
  relatedDecisionIds: string[];
}

export function getImpactPreview(diff: string, decisions: ADR[]): ImpactPreview {
  const affectedPaths = extractAffectedPaths(diff);
  const signalTypes = inferSignalTypes(diff, affectedPaths);
  const relatedDecisions = findRelatedDecisions(diff, affectedPaths, decisions);

  const summaryParts = [
    signalTypes.length > 0
      ? `Detected likely structural signals: ${signalTypes.join(", ")}.`
      : "No strong structural signal detected from the supplied diff.",
    affectedPaths.length > 0
      ? `Affected paths: ${affectedPaths.slice(0, 5).join(", ")}.`
      : "No changed file paths were extracted from the diff.",
    relatedDecisions.length > 0
      ? `Potentially relevant ADRs: ${relatedDecisions.map((decision) => decision.id).join(", ")}.`
      : "No closely related ADRs were found in the local index.",
  ];

  return {
    summary: summaryParts.join(" "),
    signalTypes,
    affectedPaths,
    relatedDecisionIds: relatedDecisions.map((decision) => decision.id),
  };
}

function extractAffectedPaths(diff: string): string[] {
  const matches = diff.matchAll(/^\+\+\+ b\/(.+)$/gm);
  return [
    ...new Set(
      [...matches]
        .map((match) => match[1])
        .filter((path): path is string => typeof path === "string" && path.length > 0),
    ),
  ];
}

function inferSignalTypes(diff: string, affectedPaths: string[]): string[] {
  const signals = new Set<string>();

  if (affectedPaths.some((path) => path.endsWith("package.json"))) {
    signals.add("dependency_change");
  }

  if (affectedPaths.some((path) => /^(src|lib|pkg)\//.test(path))) {
    signals.add("module_change");
  }

  if (affectedPaths.some((path) => /(openapi|graphql|proto|schema|migration)/i.test(path))) {
    signals.add("contract_or_schema_change");
  }

  if (/^\+import\s.+$/m.test(diff) || /^-import\s.+$/m.test(diff)) {
    signals.add("import_graph_change");
  }

  return [...signals];
}

function findRelatedDecisions(diff: string, affectedPaths: string[], decisions: ADR[]): ADR[] {
  const diffLower = diff.toLowerCase();

  return decisions
    .filter((decision) => {
      const searchableText = [
        decision.title,
        decision.tags.join(" "),
        decision.body.context,
        decision.body.decision,
        decision.body.rationale,
      ]
        .join(" ")
        .toLowerCase();

      const pathHit = affectedPaths.some((path) => searchableText.includes(path.toLowerCase()));
      const tagHit = decision.tags.some((tag) => diffLower.includes(tag.toLowerCase()));

      return pathHit || tagHit;
    })
    .slice(0, 5);
}
