import { execa } from "execa";

import type { ADRParticipant } from "./types/adr.js";
import type { Author } from "./types/signals.js";

export async function getGitIdentity(projectRoot: string): Promise<Author> {
  const [{ stdout: name }, { stdout: email }] = await Promise.all([
    execa("git", ["config", "user.name"], { cwd: projectRoot }),
    execa("git", ["config", "user.email"], { cwd: projectRoot }),
  ]);

  return {
    name: name.trim() || "Unknown Author",
    email: email.trim() || "unknown@example.com",
    role: "author",
  };
}

export async function getParticipantList(projectRoot: string): Promise<ADRParticipant[]> {
  const author = await getGitIdentity(projectRoot);
  return [{ name: author.name, role: "author" }];
}

export async function getCommitDetails(
  projectRoot: string,
  commitRef: string,
): Promise<{ sha: string; message: string; diff: string; author: Author }> {
  const [{ stdout: sha }, { stdout: message }, { stdout: diff }, author] = await Promise.all([
    execa("git", ["rev-parse", commitRef], { cwd: projectRoot }),
    execa("git", ["show", "-s", "--format=%s", commitRef], { cwd: projectRoot }),
    execa("git", ["show", "--format=", "--unified=3", commitRef], { cwd: projectRoot }),
    getGitIdentity(projectRoot),
  ]);

  return {
    sha: sha.trim(),
    message: message.trim(),
    diff,
    author,
  };
}
