import type { Page } from "@playwright/test";
import { PREFERENCES_KEY } from "../src/lib/preferences";
import { WHATS_NEW, WHATS_NEW_LIMIT, latestId, shownEntries } from "../src/lib/whats-new";
import { whatsnew } from "../src/locales/en-CA";
import { expect, installOpfsPickers, setUpWithExample, test } from "./helpers";

const LATEST = latestId(WHATS_NEW)!;
const OLDEST = WHATS_NEW[WHATS_NEW.length - 1].id;
const SHOWN = shownEntries(WHATS_NEW);
const titleOf = (id: string) => (whatsnew.entries as Record<string, { title: string }>)[id].title;

/** The stored preferences record, parsed, or null when there is none. */
function storedPreferences(page: Page): Promise<Record<string, unknown> | null> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  }, PREFERENCES_KEY);
}

/**
 * A device that already has a preferences record before the app first loads.
 * The script runs again on every navigation, so it only writes when there is
 * no record yet: what the app stores later must survive a reload.
 */
async function seedPreferences(page: Page, record: Record<string, unknown>): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(value));
    },
    { key: PREFERENCES_KEY, value: record },
  );
}

const bell = (page: Page) => page.getByRole("button", { name: /What's new/ });
const dot = (page: Page) => bell(page).locator('[data-slot="whats-new-dot"]');

test("first run: nothing is new to a newcomer, the marker is stored quietly and the bell shows no dot", async ({
  page,
}) => {
  await installOpfsPickers(page);
  await page.goto("/setup/");
  await expect(page.getByRole("heading", { name: "Score your project ideas" })).toBeVisible();

  // Stored as soon as the app finds nothing remembered, before any file exists.
  await expect.poll(() => storedPreferences(page)).toMatchObject({ whatsNewSeen: LATEST });

  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("radio", { name: /This computer/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create a file…" }).click();
  await page.getByRole("button", { name: "Open my matrix" }).click();
  await expect(page.getByRole("heading", { name: "Example ideas" })).toBeVisible();

  await expect(bell(page)).toHaveAccessibleName("What's new");
  await expect(dot(page)).toHaveCount(0);
  expect(await storedPreferences(page)).toMatchObject({ whatsNewSeen: LATEST });
});

test("returning user: the dot counts the unread entries, opening the bell lists them newest first and clears it for good", async ({
  page,
}) => {
  await seedPreferences(page, { whatsNewSeen: OLDEST });
  await setUpWithExample(page);

  // Everything newer than the oldest entry is unread, and the name says how many.
  const unread = WHATS_NEW.length - 1;
  await expect(bell(page)).toHaveAccessibleName(`What's new, ${unread} unread`);
  await expect(dot(page)).toHaveCount(1);
  expect(await storedPreferences(page)).toMatchObject({ whatsNewSeen: OLDEST });

  await bell(page).click();
  const popover = page.getByRole("dialog", { name: "What's new" });
  await expect(popover).toBeVisible();
  const items = popover.getByRole("listitem");
  await expect(items).toHaveCount(SHOWN.length);
  expect(SHOWN.length).toBeLessThanOrEqual(WHATS_NEW_LIMIT);
  for (const [i, entry] of SHOWN.entries()) {
    await expect(items.nth(i).getByRole("heading")).toHaveText(titleOf(entry.id));
  }
  // The newest entry says when it landed, in the app's language.
  await expect(items.first()).toContainText(/Sept?\.? \d{1,2}, 2026/);

  // Opening it is what marks everything seen.
  await expect(bell(page)).toHaveAccessibleName("What's new");
  await expect(dot(page)).toHaveCount(0);
  await expect.poll(() => storedPreferences(page)).toMatchObject({ whatsNewSeen: LATEST });

  await page.keyboard.press("Escape");
  await expect(popover).toBeHidden();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Example ideas" })).toBeVisible();
  await expect(bell(page)).toHaveAccessibleName("What's new");
  await expect(dot(page)).toHaveCount(0);
});

test("existing user from before the bell: a remembered file with no marker makes every entry unread once", async ({
  page,
}) => {
  await setUpWithExample(page);
  await expect(bell(page)).toHaveAccessibleName("What's new");

  // The record such a device has: preferences without a marker, and a file the app remembers.
  await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ language: "en-CA" })), PREFERENCES_KEY);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Example ideas" })).toBeVisible();
  await expect(bell(page)).toHaveAccessibleName(`What's new, ${SHOWN.length} unread`);
  // Left alone until the bell is opened: the file being remembered is what says this is not a first run.
  expect(await storedPreferences(page)).toEqual({ language: "en-CA" });

  await bell(page).click();
  await expect(page.getByRole("dialog", { name: "What's new" })).toBeVisible();
  await expect(bell(page)).toHaveAccessibleName("What's new");
  await expect.poll(() => storedPreferences(page)).toEqual({ language: "en-CA", whatsNewSeen: LATEST });
});

test("the bell speaks the device's language", async ({ page }) => {
  await seedPreferences(page, { language: "fr-CA", whatsNewSeen: OLDEST });
  await installOpfsPickers(page);
  await page.goto("/setup/");
  await page.getByRole("button", { name: "Commencer" }).click();
  await page.getByRole("radio", { name: /Cet ordinateur/ }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: /Créer un fichier/ }).click();
  await page.getByRole("button", { name: "Ouvrir ma matrice" }).click();
  // The example matrix seeds in the device's language too.
  await expect(page.getByRole("heading", { name: "Idées d'exemple" })).toBeVisible();

  const unread = WHATS_NEW.length - 1;
  const cloche = page.getByRole("button", { name: `Nouveautés, ${unread} non lues` });
  await expect(cloche).toBeVisible();
  await cloche.click();
  const popover = page.getByRole("dialog", { name: "Nouveautés" });
  await expect(popover).toBeVisible();
  await expect(popover.getByRole("listitem").first()).toContainText(/sept\.? 2026/);
});
