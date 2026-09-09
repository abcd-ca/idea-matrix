import type { Page } from "@playwright/test";
import { PREFERENCES_KEY } from "../../src/lib/preferences";
import { WHATS_NEW, WHATS_NEW_LIMIT, latestId, shownEntries } from "../../src/lib/whats-new";
import { whatsnew } from "../../src/locales/en-CA";
import {
  expect,
  expectInsideViewport,
  expectNoHorizontalOverflow,
  installOpfsPickers,
  setUpWithExample,
  test,
} from "./helpers";

const LATEST = latestId(WHATS_NEW)!;
const OLDEST = WHATS_NEW[WHATS_NEW.length - 1].id;
const SHOWN = shownEntries(WHATS_NEW);
const titleOf = (id: string) => (whatsnew.entries as Record<string, { title: string }>)[id].title;

function storedPreferences(page: Page): Promise<Record<string, unknown> | null> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  }, PREFERENCES_KEY);
}

const bell = (page: Page) => page.getByRole("button", { name: /What's new/ });
const dot = (page: Page) => bell(page).locator('[data-slot="whats-new-dot"]');

test("phone first run: the bell is in the header with no dot, and the marker is stored", async ({ page }) => {
  await installOpfsPickers(page);
  await page.goto("/setup/");
  await expect(page.getByRole("heading", { name: "Score your project ideas" })).toBeVisible();
  await expect.poll(() => storedPreferences(page)).toMatchObject({ whatsNewSeen: LATEST });

  await page.getByRole("button", { name: "Get started" }).tap();
  await page.getByRole("radio", { name: /This computer/ }).tap();
  await page.getByRole("button", { name: "Continue" }).tap();
  await page.getByRole("button", { name: "Create a file…" }).tap();
  await page.getByRole("button", { name: "Open my matrix" }).tap();
  await expect(page.getByRole("heading", { name: "Example ideas" })).toBeVisible();

  await expect(bell(page)).toBeInViewport();
  await expect(bell(page)).toHaveAccessibleName("What's new");
  await expect(dot(page)).toHaveCount(0);
  await expectNoHorizontalOverflow(page, "matrix with the bell");
});

test("phone returning user: the popover fits the screen without scrolling, and opening it clears the dot", async ({
  page,
}) => {
  // Seeded only when there is no record yet: the script runs again on reload,
  // and what the app stores in between must survive it.
  await page.addInitScript(
    ({ key, value }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(value));
    },
    { key: PREFERENCES_KEY, value: { whatsNewSeen: OLDEST } },
  );
  await setUpWithExample(page);

  const unread = WHATS_NEW.length - 1;
  await expect(bell(page)).toHaveAccessibleName(`What's new, ${unread} unread`);
  await expect(dot(page)).toHaveCount(1);

  await bell(page).tap();
  const popover = page.getByRole("dialog", { name: "What's new" });
  await expectInsideViewport(popover, "What's new popover");
  await expectNoHorizontalOverflow(page, "matrix with the popover open");

  const items = popover.getByRole("listitem");
  await expect(items).toHaveCount(SHOWN.length);
  expect(SHOWN.length).toBeLessThanOrEqual(WHATS_NEW_LIMIT);
  for (const [i, entry] of SHOWN.entries()) {
    await expect(items.nth(i).getByRole("heading")).toHaveText(titleOf(entry.id));
    await expect(items.nth(i)).toBeInViewport();
  }
  // Nothing scrolls: neither the list nor the popover has more than it shows.
  const list = popover.getByRole("list");
  const sizes = await list.evaluate((el) => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }));
  expect(sizes.scrollHeight, "list scroll height against its box").toBeLessThanOrEqual(sizes.clientHeight);
  const box = await popover.evaluate((el) => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }));
  expect(box.scrollHeight, "popover scroll height against its box").toBeLessThanOrEqual(box.clientHeight);

  await expect(bell(page)).toHaveAccessibleName("What's new");
  await expect(dot(page)).toHaveCount(0);
  await expect.poll(() => storedPreferences(page)).toMatchObject({ whatsNewSeen: LATEST });

  await page.reload();
  await expect(page.getByRole("heading", { name: "Example ideas" })).toBeVisible();
  await expect(bell(page)).toHaveAccessibleName("What's new");
  await expect(dot(page)).toHaveCount(0);
});
