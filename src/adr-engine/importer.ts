import { resolve } from "node:path";
import { globSync } from "glob";

import { SQLiteStore } from "../storage/sqlite-store.js";
import { parseADRMarkdown } from "./parser.js";

export function importADRs(projectRoot: string): number {
  const store = new SQLiteStore(projectRoot);
  const matches = globSync("docs/decisions/**/*.md", {
    cwd: projectRoot,
    nodir: true,
    windowsPathsNoEscape: true,
  });

  let imported = 0;
  for (const relativePath of matches) {
    const adr = parseADRMarkdown(resolve(projectRoot, relativePath));
    store.insertADR(adr);
    imported += 1;
  }

  store.close();
  return imported;
}
