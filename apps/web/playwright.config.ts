import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against the static export in out/, served by
 * scripts/serve-out.mjs. Chromium only: the local-file target needs the File
 * System Access API, and the tests stand in for its dialogs with handles from
 * the origin private file system (see e2e/helpers.ts). The package is pinned
 * to 1.62 in package.json: 1.63's Chromium (153.0.8010) aborts with SIGTRAP
 * when one of those handles is read back out of IndexedDB after a reload.
 *
 * Two projects, each with its own specs rather than every spec on both:
 *
 * - "chromium" is the desktop browser and runs the specs directly under e2e/.
 *   Those assert on the table, its rows, the six-step tour and the centred
 *   dialogs, none of which exist below Tailwind's md breakpoint.
 * - "phone" is Chromium again, with a phone viewport and touch emulation, and
 *   runs only e2e/phone/. The app's phone presentation depends on the
 *   viewport width (cards instead of the table, the five-step tour,
 *   top-anchored dialogs) and on the pointer type (form controls at 16px so
 *   focus never zooms the page), not on the browser engine, and the OPFS
 *   stand-in still needs the File System Access API, which only Chromium has.
 *   The phone specs walk the same flows as the desktop ones, so nothing is
 *   lost by not running the desktop specs there, and none of their
 *   layout-specific assertions has to be forked with test.skip.
 */
const PORT = 3100;

/**
 * An iPhone 14 in portrait as Chromium sees it: the 390 × 664 viewport is the
 * screen minus the browser's own bars, which is what the layout has to fit.
 * isMobile turns on the meta viewport and touch-style scrolling; hasTouch
 * makes `(pointer: coarse)` match, the rule the 16px form-control CSS keys
 * on. Chromium's own user agent stays: the app feature-detects and never
 * reads it, so a Safari string would only mislead anyone reading a trace.
 */
const PHONE = {
  browserName: "chromium",
  viewport: { width: 390, height: 664 },
  screen: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
} as const;

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
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: /[\\/]phone[\\/]/ },
    { name: "phone", use: PHONE, testMatch: /[\\/]phone[\\/].*\.spec\.ts$/ },
  ],
  webServer: {
    command: `node scripts/serve-out.mjs ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
  },
});
