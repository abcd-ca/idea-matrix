// The commit a build was made from, for the fingerprint shown in the app and
// reported by the MCP server. Vercel and GitHub Actions put it in the
// environment; a local build asks git, and says so if the tree has changes.
import { execSync } from "node:child_process";

export function buildCommit() {
  const fromEnv = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA;
  if (fromEnv) return fromEnv;
  try {
    const sha = execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    const dirty = execSync("git status --porcelain", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    return dirty ? `${sha}-dirty` : sha;
  } catch {
    return "unknown";
  }
}
