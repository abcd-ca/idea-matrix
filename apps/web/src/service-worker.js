// Idea Matrix's service worker.
//
// What it does: when it installs it downloads every file of this build of
// the app into one cache named after the build's commit, and from then on it
// answers requests for those files from that cache. That is what lets the
// app open and work with no connection, and what lets a browser install it
// as an app with its own window and icon.
//
// What it never does: touch a request to another origin (Google's scripts
// and the Drive API go straight to the network, as before), serve build.json
// from cache (the "This build" block must see the live file), or cache
// anything it did not download at install time. Every request it does not
// answer from the cache goes to the network unchanged.
//
// scripts/service-worker.mjs copies this file to out/sw.js after `next build`
// and rewrites the BUILD line below with the commit and the file list, so the
// worker is part of the export and the build fingerprint covers it. The file
// is plain JavaScript on purpose, short enough to read in one sitting.
//
// Updates: a newer build installs beside the old one and waits. The page
// (lib/app-update.ts) sees it waiting, offers a reload, and on "Reload" sends
// "skip-waiting"; the new worker then takes over, deletes the old cache, and
// the page reloads from the new one. Never switching silently means an open
// page never asks for a file its own build had and the new cache lacks.

/* BUILD */ const BUILD = { cache: "idea-matrix-dev", precache: [] };

/** Served from the network every time: the fingerprint file and the worker itself. */
const NEVER_CACHE = new Set(["/build.json", "/build.sha256", "/sw.js"]);

self.addEventListener("install", (event) => {
  event.waitUntil(precache());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(takeOver());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (NEVER_CACHE.has(url.pathname)) return;
  event.respondWith(fromCacheOrNetwork(request, url));
});

async function precache() {
  const cache = await caches.open(BUILD.cache);
  // "reload" bypasses the HTTP cache, so the copy kept is this build's bytes
  // and never a stale page the browser had lying around.
  await cache.addAll(BUILD.precache.map((path) => new Request(path, { cache: "reload" })));
}

async function takeOver() {
  const names = await caches.keys();
  await Promise.all(names.filter((name) => name !== BUILD.cache).map((name) => caches.delete(name)));
  // Control pages that are already open, including the very first visit, so
  // the app is offline-capable without a second load.
  await self.clients.claim();
}

async function fromCacheOrNetwork(request, url) {
  const cache = await caches.open(BUILD.cache);
  const key = request.mode === "navigate" ? pagePath(url.pathname) : url.pathname;
  const cached = await cache.match(key);
  if (cached) return cached;
  return fetch(request);
}

/** The export has trailing slashes: "/setup" and "/setup/" are the same page. A query string never changes the file. */
function pagePath(pathname) {
  if (pathname.endsWith("/") || /\.[a-z0-9]+$/i.test(pathname)) return pathname;
  return `${pathname}/`;
}
