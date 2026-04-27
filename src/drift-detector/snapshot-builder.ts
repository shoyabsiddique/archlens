import { existsSync, readFileSync } from "node:fs";
import { basename, extname, relative, resolve } from "node:path";

import { globSync } from "glob";

import type { StructuralSnapshot } from "../shared/types/snapshot.js";
import { hashContent } from "../shared/utils/hash.js";
import { normalizePath } from "../shared/utils/paths.js";

const sourceRoots = ["src", "lib", "pkg"];
const sourceExtensions = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);

export function buildStructuralSnapshot(projectRoot: string): StructuralSnapshot {
  const depManifest = readDependencyManifest(projectRoot);
  const sourceFiles = findSourceFiles(projectRoot);
  const moduleGraph = buildModuleGraph(projectRoot, sourceFiles);
  const patterns = {
    modules: sourceFiles.map((filePath) => normalizePath(relative(projectRoot, filePath))),
  };
  const languageStats = collectLanguageStats(sourceFiles);
  const capturedAt = new Date().toISOString();

  return {
    id: hashContent(
      JSON.stringify({
        depManifest,
        moduleGraph,
        patterns,
        languageStats,
      }),
    ),
    capturedAt,
    moduleGraph,
    depManifest,
    patterns,
    apiContracts: {},
    languageStats,
  };
}

function readDependencyManifest(projectRoot: string): Record<string, string> {
  const packageJsonPath = resolve(projectRoot, "package.json");
  if (!existsSync(packageJsonPath)) {
    return {};
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  return {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
  };
}

function findSourceFiles(projectRoot: string): string[] {
  return sourceRoots.flatMap((root) =>
    globSync(`${root}/**/*`, {
      cwd: projectRoot,
      nodir: true,
      absolute: true,
      windowsPathsNoEscape: true,
    }).filter((filePath) => sourceExtensions.has(extname(filePath))),
  );
}

function buildModuleGraph(projectRoot: string, sourceFiles: string[]): Record<string, string[]> {
  return Object.fromEntries(
    sourceFiles.map((filePath) => {
      const relativePath = normalizePath(relative(projectRoot, filePath));
      const content = readFileSync(filePath, "utf8");
      return [relativePath, extractImports(content)];
    }),
  );
}

function extractImports(content: string): string[] {
  const matches = content.matchAll(
    /(?:import\s.+?\sfrom\s+["'](.+?)["'])|(?:require\(\s*["'](.+?)["']\s*\))/g,
  );

  return [...new Set([...matches].flatMap((match) => [match[1], match[2]]).filter(isString))];
}

function collectLanguageStats(sourceFiles: string[]): Record<string, number> {
  const stats: Record<string, number> = {};

  for (const filePath of sourceFiles) {
    const extension = extname(filePath).slice(1) || basename(filePath);
    stats[extension] = (stats[extension] ?? 0) + 1;
  }

  return stats;
}

function isString(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}
