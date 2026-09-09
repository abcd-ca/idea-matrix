import type { Page } from "@playwright/test";
import { PREFERENCES_KEY } from "../src/lib/preferences";
import { expect, installOpfsPickers, setUpWithExample, test } from "./helpers";

/** Whether the page is in the dark palette right now. */
const isDark = (page: Page) => page.evaluate(() => document.documentElement.classList.contains("dark"));

/** The stored preferences record, parsed, or null when there is none. */
function storedPreferences(page: Page): Promise<Record<string, unknown> | null> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  }, PREFERENCES_KEY);
}

const themeSelect = (page: Page) => page.getByLabel("Theme");

test("with nothing stored the app follows the system, and switches when the system does", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await installOpfsPickers(page);
  await page.goto("/setup/");
  await expect(page.getByRole("heading", { name: "Score your project ideas" })).toBeVisible();
  expect(await isDark(page)).toBe(true);
  // Following the system is the default, so nothing about the theme is stored.
  expect((await storedPreferences(page))?.theme).toBeUndefined();

  await page.emulateMedia({ colorScheme: "light" });
  await expect.poll(() => isDark(page)).toBe(false);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect.poll(() => isDark(page)).toBe(true);
});

test("a chosen theme wins over the system, is stored on the device and is in place before first paint", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await setUpWithExample(page);
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

  const select = themeSelect(page);
  await expect(select).toHaveValue("system");
  await expect(select.locator("option")).toHaveText(["Same as the system", "Light", "Dark"]);

  await select.selectOption("dark");
  await expect.poll(() => isDark(page)).toBe(true);
  expect(await storedPreferences(page)).toMatchObject({ theme: "dark" });
  // The system changing its mind no longer matters.
  await page.emulateMedia({ colorScheme: "dark" });
  await page.emulateMedia({ colorScheme: "light" });
  expect(await isDark(page)).toBe(true);

  // The inline script sets the class from the record before React runs: the
  // very first thing the reloaded page reports is already dark.
  const firstPaint = page.waitForEvent("domcontentloaded").then(() => isDark(page));
  await page.reload();
  expect(await firstPaint).toBe(true);
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(themeSelect(page)).toHaveValue("dark");

  // And a chosen light stays light on a dark system.
  await page.emulateMedia({ colorScheme: "dark" });
  await themeSelect(page).selectOption("light");
  await expect.poll(() => isDark(page)).toBe(false);
  expect(await storedPreferences(page)).toMatchObject({ theme: "light" });

  // Back to following the system, which is dark right now.
  await themeSelect(page).selectOption("system");
  await expect.poll(() => isDark(page)).toBe(true);
  expect(await storedPreferences(page)).toMatchObject({ theme: "system" });
});

test("the tour reads in the dark palette too", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await setUpWithExample(page, { keepTour: true });
  const popover = page.locator(".driver-popover");
  await expect(popover).toBeVisible();
  // driver.js ships a white card; ours takes the app's dark popover colour.
  const background = await popover.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(background).not.toMatch(/rgb\(255, 255, 255\)/);
  await page.keyboard.press("Escape");
  await expect(popover).toBeHidden();
});
