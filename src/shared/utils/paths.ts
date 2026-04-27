import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { ConfigError } from "../errors/index.js";

export function findProjectRoot(startDir = process.cwd()): string | null {
  let current = resolve(startDir);
  while (true) {
    if (existsSync(resolve(current, ".git"))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

export function resolveProjectRoot(startDir = process.cwd()): string {
  const projectRoot = findProjectRoot(startDir);
  if (projectRoot) {
    return projectRoot;
  }

  throw new ConfigError("Could not find a git repository from the current working directory.");
}

export function normalizePath(value: string): string {
  return value.replace(/\\/g, "/");
}
