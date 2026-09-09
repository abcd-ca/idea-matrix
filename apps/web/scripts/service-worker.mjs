// The service worker for the static export.
//
//   node scripts/service-worker.mjs      after `next build` and before fingerprint.mjs:
//                                        copies src/service-worker.js to out/sw.js with
//                                        this build's commit and file list filled in
//
// The worker precaches every file of the build (see src/service-worker.js for
// what it does with them), so it needs the list, and the list is only known
// once Next has written out/. The list is sorted and the cache name is the
// commit, so two builds of one commit produce the same worker, and the
// fingerprint, computed afterwards, covers it like any other file.

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCommit } from "../../../scripts/build-commit.mjs";
import { servedPath } from "./fingerprint.mjs";

export const WORKER_FILE = "sw.js";
const SOURCE = fileURLToPath(new URL("../src/service-worker.js", import.meta.url));
const OUT_DIR = fileURLToPath(new URL("../out/", import.meta.url));
const BUILD_LINE = /^\/\* BUILD \*\/.*$/m;

/**
 * Files in the export the worker leaves out of its cache: its own script and
 * the fingerprint files, which must always come from the network, and the
 * link-preview and social images, which the app never requests and which
 * would only make the first install heavier.
 */
export function isPrecached(path) {
  if (path === WORKER_FILE || path === "build.json" || path === "build.sha256") return false;
  if (path === "social-preview.png") return false;
  if (/^(opengraph|twitter)-image/.test(path)) return false;
  return true;
}

/** The URLs to precache, from the export's file list, sorted so the output is stable. */
export function precachePaths(files) {
  return files.filter(isPrecached).map(servedPath).sort();
}

/** The worker source with its BUILD line replaced. */
export function renderWorker(source, build) {
  if (!BUILD_LINE.test(source)) throw new Error("service-worker.js has no BUILD line to fill in");
  return source.replace(BUILD_LINE, `/* BUILD */ const BUILD = ${JSON.stringify(build)};`);
}

async function walk(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full, base)));
    else if (entry.isFile()) files.push(relative(base, full).split(sep).join("/"));
  }
  return files;
}

async function write() {
  const commit = buildCommit();
  const precache = precachePaths(await walk(OUT_DIR));
  const worker = renderWorker(await readFile(SOURCE, "utf8"), { cache: `idea-matrix-${commit}`, precache });
  await writeFile(join(OUT_DIR, WORKER_FILE), worker);
  console.log(`service worker ${WORKER_FILE}: ${precache.length} files precached (commit ${commit})`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  write().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
