import { resolve } from "node:path";

import type { ADR } from "../shared/types/adr.js";
import { ensureDir, writeFileAtomic } from "../storage/file-store.js";
import { formatADRMarkdown } from "./formatter.js";

export function writeADR(projectRoot: string, adr: ADR): string {
  const fullPath = resolve(projectRoot, adr.bodyMdPath);
  ensureDir(resolve(projectRoot, "docs", "decisions"));
  writeFileAtomic(fullPath, formatADRMarkdown(adr));
  return fullPath;
}
