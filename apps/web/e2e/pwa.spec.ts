import { expect, setUpWithExample, test } from "./helpers";

/**
 * The installable app: a manifest every page links to, and a service worker
 * that keeps the build's own files so the app opens with no connection. The
 * worker is generated into the export by scripts/service-worker.mjs, which
 * is why these run against out/ like everything else.
 */

test("every page links a manifest whose icons are served", async ({ page }) => {
  await page.goto("/setup/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBeTruthy();
  const response = await page.request.get(href!);
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.name).toBe("Idea Matrix");
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/");
  expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
  expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === "maskable")).toBe(true);
  for (const icon of manifest.icons as { src: string }[]) {
    const image = await page.request.get(icon.src);
    expect(image.ok(), icon.src).toBe(true);
    expect(image.headers()["content-type"]).toContain("image/png");
  }
});

test("the service worker takes over the page and the app opens offline", async ({ page, context }) => {
  await setUpWithExample(page);
  // ready resolves once the worker is active, which comes after its precache finished.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  const caches = await page.evaluate(() => window.caches.keys());
  expect(caches).toHaveLength(1);
  expect(caches[0]).toMatch(/^idea-matrix-/);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Example ideas" })).toBeVisible();
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Install as an app" })).toBeVisible();
  await context.setOffline(false);
});

test("build.json is never served from the cache", async ({ page }) => {
  await setUpWithExample(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  const cached = await page.evaluate(async () => {
    const names = await window.caches.keys();
    const cache = await window.caches.open(names[0]);
    return (await cache.match("/build.json")) !== undefined;
  });
  expect(cached).toBe(false);
});
