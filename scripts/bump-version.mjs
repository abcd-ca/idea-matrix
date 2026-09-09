// Set the version everywhere it lives, in one go:
//
//   npm run bump -- patch      0.1.0 -> 0.1.1
//   npm run bump -- minor      0.1.0 -> 0.2.0
//   npm run bump -- major      0.1.0 -> 1.0.0
//   npm run bump -- 1.2.3      exactly that
//
// It also starts the next CHANGELOG.md section from the commits since the
// previous release; trim that by hand. Commit the result on a branch. When it
// reaches main, the Release workflow sees a version with no release yet, tags
// it and publishes the release with that section as the notes.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { startSection } from "./changelog.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const FILES = [
  "package.json",
  "apps/web/package.json",
  "packages/core/package.json",
  "packages/mcp/package.json",
  "packages/mcp/manifest.json",
];

const current = JSON.parse(readFileSync(`${root}package.json`, "utf8")).version;
const arg = process.argv[2];
const next = bump(current, arg);
if (!next) {
  console.error("Usage: npm run bump -- patch | minor | major | <x.y.z>");
  process.exit(1);
}

for (const file of FILES) {
  const path = root + file;
  const json = JSON.parse(readFileSync(path, "utf8"));
  if (json.version !== current) {
    console.error(`${file} is at ${json.version}, not ${current}; fix that by hand first.`);
    process.exit(1);
  }
  json.version = next;
  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`);
}
// The lockfile records each workspace's version too.
execSync("npm install --package-lock-only --ignore-scripts --no-audit --no-fund", { cwd: root, stdio: "inherit" });
startSection(current, next);
console.log(`${current} -> ${next} in ${FILES.length} files, package-lock.json and CHANGELOG.md`);

function bump(version, how) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!m) return null;
  const [major, minor, patch] = m.slice(1).map(Number);
  switch (how) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      return /^\d+\.\d+\.\d+$/.test(how ?? "") ? how : null;
  }
}
