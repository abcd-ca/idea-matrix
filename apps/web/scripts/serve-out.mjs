// A small static server for the export in out/, for the end-to-end tests.
//
//   node scripts/serve-out.mjs [port]     default port 3100
//
// Next exports with trailingSlash on, so /setup/ is out/setup/index.html.
// A path without the slash is served from the same file, as any static host
// would. Nothing is cached, nothing is rewritten, and no dependency is needed.

import { createServer } from "node:http";
import { stat, readFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = resolve(fileURLToPath(new URL("../out/", import.meta.url)));
const port = Number(process.argv[2] ?? process.env.PORT ?? 3100);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
};

async function fileAt(path) {
  try {
    const info = await stat(path);
    return info.isFile() ? path : null;
  } catch {
    return null;
  }
}

/** The file for a URL path, or null. Directories resolve to their index.html. */
async function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  // Keep the request inside out/: normalise away any ".." before joining.
  const safe = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const full = resolve(OUT_DIR, `.${sep}${safe}`);
  if (full !== OUT_DIR && !full.startsWith(OUT_DIR + sep)) return null;
  if (decoded.endsWith("/")) return fileAt(join(full, "index.html"));
  return (await fileAt(full)) ?? (await fileAt(join(full, "index.html"))) ?? (await fileAt(`${full}.html`));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);
  const file = await resolveFile(url.pathname);
  if (!file) {
    const notFound = await fileAt(join(OUT_DIR, "404.html"));
    res.writeHead(404, { "content-type": TYPES[".html"], "cache-control": "no-store" });
    res.end(notFound ? await readFile(notFound) : "Not found");
    return;
  }
  const type = TYPES[extname(file)] ?? "application/octet-stream";
  res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
  res.end(await readFile(file));
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving ${OUT_DIR} at http://127.0.0.1:${port}/`);
});
