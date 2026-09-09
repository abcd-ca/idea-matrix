import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against the static export in out/, served by
 * scripts/serve-out.mjs. Chromium only: the local-file target needs the File
 * System Access API, and the tests stand in for its dialogs with handles from
 * the origin private file system (see e2e/helpers.ts). The package is pinned
 * to 1.62 in package.json: 1.63's Chromium (153.0.8010) aborts with SIGTRAP
 * when one of those handles is read back out of IndexedDB after a reload.
 */
const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `node scripts/serve-out.mjs ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
  },
});
