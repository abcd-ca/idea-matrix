import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { isPrecached, precachePaths, renderWorker, WORKER_FILE } from "../scripts/service-worker.mjs";

const SOURCE = new URL("../src/service-worker.js", import.meta.url);

describe("the precache list", () => {
  it("leaves out the worker, the fingerprint files and the preview images", () => {
    for (const path of [WORKER_FILE, "build.json", "build.sha256", "social-preview.png"]) {
      expect(isPrecached(path), path).toBe(false);
    }
    expect(isPrecached("opengraph-image-abc123.png")).toBe(false);
    expect(isPrecached("twitter-image-abc123.png")).toBe(false);
    expect(isPrecached("opengraph-image.alt.txt")).toBe(false);
  });

  it("keeps every other file, as the URL it is served from, sorted", () => {
    const files = ["setup/index.html", "index.html", "_next/static/chunks/main.js", "icons/icon-192.png", "sw.js"];
    expect(precachePaths(files)).toEqual(["/", "/_next/static/chunks/main.js", "/icons/icon-192.png", "/setup/"]);
  });

  it("is the same list whatever order the files came in", () => {
    const files = ["b/index.html", "a.css", "index.html"];
    expect(precachePaths(files)).toEqual(precachePaths([...files].reverse()));
  });
});

describe("the worker source", () => {
  it("has one BUILD line, which the build fills in", async () => {
    const source = await readFile(SOURCE, "utf8");
    expect(source.match(/^\/\* BUILD \*\//gm)).toHaveLength(1);
    const build = { cache: "idea-matrix-abc", precache: ["/", "/setup/"] };
    const rendered = renderWorker(source, build);
    expect(rendered).toContain(`/* BUILD */ const BUILD = ${JSON.stringify(build)};`);
    expect(rendered).not.toContain("idea-matrix-dev");
  });

  it("refuses a source without the line", () => {
    expect(() => renderWorker("self.addEventListener('fetch', () => {});", { cache: "x", precache: [] })).toThrow();
  });

  it("never touches build.json or another origin", async () => {
    const source = await readFile(SOURCE, "utf8");
    expect(source).toContain('"/build.json"');
    expect(source).toContain("url.origin !== self.location.origin");
  });
});
