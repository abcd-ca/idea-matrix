// CHANGELOG.md helpers.
//
//   node scripts/changelog.mjs section [version]   print that version's section
//                                                  (default: the current one), no
//                                                  heading; exit 1 if there is none
//
// bump-version.mjs uses startSection() to begin the next section from the
// commits since the previous release.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const PATH = `${root}CHANGELOG.md`;

/** The body of the `## <version> (...)` section, or null. */
export function sectionFor(text, version) {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.startsWith(`## ${version} `) || line === `## ${version}`);
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) {
      end = i;
      break;
    }
  }
  return lines.slice(start + 1, end).join("\n").trim();
}

/** Prepend a section for `version` listing the commits since tag v<previous>, unless one exists. */
export function startSection(previous, version) {
  const text = readFileSync(PATH, "utf8");
  if (sectionFor(text, version) !== null) return false;
  const hasTag = execSync(`git tag -l v${previous}`, { cwd: root }).toString().trim() !== "";
  const range = hasTag ? `v${previous}..HEAD` : "HEAD";
  const subjects = execSync(`git log --format=%s --no-merges ${range}`, { cwd: root })
    .toString()
    .split("\n")
    .filter((line) => line.trim());
  const date = new Date().toISOString().slice(0, 10);
  const section = `## ${version} (${date})\n\n${subjects.map((line) => `- ${line}`).join("\n") || "- "}\n\n`;
  const at = text.indexOf("\n## ");
  const updated = at === -1 ? `${text.trimEnd()}\n\n${section}` : `${text.slice(0, at + 1)}${section}${text.slice(at + 1)}`;
  writeFileSync(PATH, updated);
  return true;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const [command, arg] = process.argv.slice(2);
  if (command !== "section") {
    console.error("Usage: node scripts/changelog.mjs section [version]");
    process.exit(1);
  }
  const version = arg ?? JSON.parse(readFileSync(`${root}package.json`, "utf8")).version;
  const body = sectionFor(readFileSync(PATH, "utf8"), version);
  if (body === null) {
    console.error(`CHANGELOG.md has no section for ${version}. Run npm run bump, which starts one, and fill it in.`);
    process.exit(1);
  }
  process.stdout.write(`${body}\n`);
}
