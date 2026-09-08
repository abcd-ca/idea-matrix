// The commit a build was made from, for the fingerprint shown in the app and
// reported by the MCP server. Vercel and GitHub Actions put it in the
// environment; a local build asks git, and says so if the tree has changes.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

export function buildCommit() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  if (process.env.GITHUB_SHA) {
    // On a pull request GITHUB_SHA is a throwaway merge commit; the workflow
    // checks out the branch head instead, so report that.
    if (process.env.GITHUB_EVENT_NAME === "pull_request" && process.env.GITHUB_EVENT_PATH) {
      try {
        const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
        if (event.pull_request?.head?.sha) return event.pull_request.head.sha;
      } catch {
        // fall through to GITHUB_SHA
      }
    }
    return process.env.GITHUB_SHA;
  }
  try {
    const sha = execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    const dirty = execSync("git status --porcelain", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    return dirty ? `${sha}-dirty` : sha;
  } catch {
    return "unknown";
  }
}
