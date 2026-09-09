import { expect, type Locator, type Page } from "@playwright/test";

export * from "../helpers";

/** The page never scrolls sideways: the document is no wider than the viewport. */
export async function expectNoHorizontalOverflow(page: Page, where: string): Promise<void> {
  const width = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(width.document, `${where}: document width against the viewport`).toBeLessThanOrEqual(width.viewport);
}

/**
 * Where an element sits against the viewport, in CSS pixels. Polled by
 * expectInsideViewport so a popover that is still being positioned settles
 * before it is judged; the whole object is printed when it does not fit.
 */
async function placement(locator: Locator) {
  const box = await locator.boundingBox();
  const viewport = await locator.page().evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));
  if (!box) return { box: null, viewport, inside: false };
  const inside =
    box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height;
  return { box, viewport, inside };
}

/** The element's bounding box lies fully inside the viewport: nothing clipped at any edge. */
export async function expectInsideViewport(locator: Locator, what: string): Promise<void> {
  await expect(locator, what).toBeVisible();
  await expect
    .poll(() => placement(locator), { message: `${what} inside the viewport` })
    .toMatchObject({ inside: true });
}

/** Open an idea from the phone's card list by tapping its card. */
export async function openIdeaCard(page: Page, name: string): Promise<void> {
  await page.getByRole("listitem").filter({ hasText: name }).getByRole("button").tap();
  await expect(page.getByRole("textbox", { name: "Idea name" })).toHaveValue(name);
}

/**
 * Every text field on the page with its computed font size. Checkboxes and
 * radios are left out: they have no text to zoom in on.
 */
export async function formControlFontSizes(page: Page): Promise<{ control: string; fontSize: number }[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>("input, textarea, select"))
      .filter((el) => !(el instanceof HTMLInputElement && ["checkbox", "radio", "hidden"].includes(el.type)))
      .map((el) => ({
        control: el.id || el.getAttribute("aria-label") || el.getAttribute("name") || el.tagName.toLowerCase(),
        fontSize: parseFloat(getComputedStyle(el).fontSize),
      })),
  );
}
