// Build fingerprint for the static export.
//
//   node scripts/fingerprint.mjs               after `next build`: hash every file in out/
//                                              and write out/build.json
//   node scripts/fingerprint.mjs verify <url>  download a running site and check that
//                                              every file matches its build.json
//
// The fingerprint is the SHA-256 of a sha256sum-style manifest: one line per
// file, "<sha256>  <path>", sorted by path, build.json itself excluded. Anyone
// can recompute it from a copy of the files with nothing but Node, and CI
// prints the same value for the same commit.

import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCommit } from "../../../scripts/build-commit.mjs";

const BUILD_FILE = "build.json";
const OUT_DIR = fileURLToPath(new URL("../out/", import.meta.url));
const ROOT_PACKAGE = fileURLToPath(new URL("../../../package.json", import.meta.url));

const sha256 = (data) => createHash("sha256").update(data).digest("hex");

/** Same manifest text as `sha256sum`, so the fingerprint can be checked by hand. */
export function manifestText(files) {
  return Object.keys(files)
    .sort()
    .map((path) => `${files[path]}  ${path}\n`)
    .join("");
}

export const fingerprintOf = (files) => sha256(manifestText(files));

async function walk(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = {};
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      Object.assign(files, await walk(full, base));
    } else if (entry.isFile()) {
      const path = relative(base, full).split(sep).join("/");
      if (path === BUILD_FILE) continue;
      files[path] = sha256(await readFile(full));
    }
  }
  return files;
}

async function stamp() {
  const { version } = JSON.parse(await readFile(ROOT_PACKAGE, "utf8"));
  const commit = buildCommit();
  const files = await walk(OUT_DIR);
  const fingerprint = fingerprintOf(files);
  const info = {
    app: "idea-matrix",
    version,
    commit,
    fingerprint,
    builtAt: new Date().toISOString(),
    fileCount: Object.keys(files).length,
    files,
  };
  await writeFile(join(OUT_DIR, BUILD_FILE), `${JSON.stringify(info, null, 2)}\n`);
  await writeFile(join(OUT_DIR, "build.sha256"), manifestText(files));
  console.log(`build fingerprint ${fingerprint} (commit ${commit}, ${info.fileCount} files)`);
  if (process.env.GITHUB_OUTPUT) {
    await writeFile(process.env.GITHUB_OUTPUT, `fingerprint=${fingerprint}\n`, { flag: "a" });
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    await writeFile(
      process.env.GITHUB_STEP_SUMMARY,
      `### Web app build fingerprint\n\n\`${fingerprint}\`\n\nCommit \`${commit}\`, version ${version}, ${info.fileCount} files. The app shows the same value under Settings → This build.\n`,
      { flag: "a" },
    );
  }
}

/** Where a file in the export is served from, given trailingSlash: true. */
export function servedPath(path) {
  if (path === "index.html") return "/";
  if (path.endsWith("/index.html")) return `/${path.slice(0, -"index.html".length)}`;
  return `/${path}`;
}

async function verify(site) {
  if (!site) throw new Error("Usage: fingerprint.mjs verify <url>");
  const base = site.replace(/\/+$/, "");
  const get = async (path) => {
    const res = await fetch(`${base}${path}`, { cache: "no-store", redirect: "follow" });
    return new Uint8Array(await res.arrayBuffer());
  };
  const info = JSON.parse(new TextDecoder().decode(await get(`/${BUILD_FILE}`)));
  const paths = Object.keys(info.files).sort();
  const served = {};
  const mismatches = [];
  for (const path of paths) {
    served[path] = sha256(await get(servedPath(path)));
    if (served[path] !== info.files[path]) mismatches.push(path);
  }
  const actual = fingerprintOf(served);
  const claimed = fingerprintOf(info.files);
  console.log(`site        ${base}`);
  console.log(`version     ${info.version}`);
  console.log(`commit      ${info.commit}`);
  console.log(`fingerprint ${info.fingerprint} (build.json says)`);
  console.log(`            ${claimed} (recomputed from its file list)`);
  console.log(`            ${actual} (recomputed from the ${paths.length} files the site serves)`);
  if (claimed !== info.fingerprint) {
    console.log("build.json is inconsistent with itself.");
    return 1;
  }
  if (mismatches.length > 0) {
    console.log(`${mismatches.length} file(s) differ from build.json:`);
    for (const path of mismatches) console.log(`  ${path}`);
    return 1;
  }
  console.log("Every served file matches. Compare the fingerprint with the one GitHub shows for that commit.");
  return 0;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const [command, arg] = process.argv.slice(2);
  const run = command === "verify" ? verify(arg) : stamp();
  run.then((code) => process.exit(code ?? 0)).catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
