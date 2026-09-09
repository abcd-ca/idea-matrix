import { expect, expectInsideViewport, expectNoHorizontalOverflow, setUpWithExample, test } from "./helpers";

test("phone settings: no sideways scroll, the file buttons wrap, the Export menu opens on screen", async ({ page }) => {
  await setUpWithExample(page);
  await page.getByRole("link", { name: "Settings" }).tap();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "settings");

  // The four buttons under "Where your ideas live" cannot fit on one line at
  // this width, so they wrap: every one inside the viewport, on more than one row.
  const where = page.locator("section").filter({ has: page.getByRole("heading", { name: "Where your ideas live" }) });
  const buttons = where.getByRole("button");
  await expect(buttons).toHaveCount(4);
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  const rows = new Set<number>();
  for (const button of await buttons.all()) {
    const box = await button.boundingBox();
    expect(box, "button box").not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewportWidth);
    rows.add(Math.round(box!.y));
  }
  expect(rows.size, "rows of buttons").toBeGreaterThan(1);

  // The Export menu opens, on screen, with its three formats.
  await page.getByRole("button", { name: "Export" }).tap();
  const menu = page.getByRole("menu");
  await expectInsideViewport(menu, "export menu");
  for (const format of ["JSON", "Markdown", "CSV"]) {
    await expect(menu.getByRole("menuitem", { name: format })).toBeVisible();
  }
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
});
