import { expect, formControlFontSizes, installOpfsPickers, openIdeaCard, setUpWithExample, test } from "./helpers";

/**
 * iOS Safari zooms the page in when a field under 16px gets focus, and the
 * page stays zoomed. globals.css sets every input, select and textarea to
 * 1rem under `@media (pointer: coarse)`, which is what Playwright's hasTouch
 * makes match in Chromium; the first assertion confirms that, so a failure
 * further down is the CSS and not the emulation.
 */
const MIN_FONT_SIZE = 16;

async function expectNoZoomOnFocus(page: Parameters<typeof formControlFontSizes>[0], where: string, atLeast: number) {
  expect(await page.evaluate(() => window.matchMedia("(pointer: coarse)").matches), "coarse pointer emulated").toBe(
    true,
  );
  const controls = await formControlFontSizes(page);
  expect(controls.length, `${where}: form controls found`).toBeGreaterThanOrEqual(atLeast);
  expect(
    controls.filter((c) => c.fontSize < MIN_FONT_SIZE),
    `${where}: controls under ${MIN_FONT_SIZE}px`,
  ).toEqual([]);
}

test("phone zoom: every text field on the wizard, the idea, its dialogs and Settings is at least 16px", async ({
  page,
}) => {
  await installOpfsPickers(page);

  // The wizard's only text fields are on the Google Drive file screen
  // (folder name and file name). Nothing from Google loads until a button
  // there is pressed, and the shared fixture checks that nothing did.
  await page.goto("/setup/");
  await page.getByRole("button", { name: "Get started" }).tap();
  await page.getByRole("radio", { name: /Google Drive/ }).tap();
  await page.getByRole("button", { name: "Continue" }).tap();
  await expect(page.getByLabel("File name, without the extension")).toBeVisible();
  await expectNoZoomOnFocus(page, "wizard, Drive file screen", 2);

  // The idea: name, stage, description and riskiest assumption.
  await setUpWithExample(page);
  await openIdeaCard(page, "Backyard rink monitor");
  await expectNoZoomOnFocus(page, "idea detail", 4);

  // Its dialogs: the evidence entry and the parking reason.
  await page.getByRole("button", { name: "Add" }).tap();
  const evidence = page.getByRole("dialog", { name: "Add a conversation" });
  await expect(evidence.getByLabel("Who")).toBeVisible();
  await expectNoZoomOnFocus(page, "evidence dialog", 4 + 4);
  await evidence.getByRole("button", { name: "Cancel" }).tap();
  await expect(evidence).toBeHidden();
  await page.getByRole("button", { name: "Park this idea…" }).tap();
  const park = page.getByRole("dialog", { name: /^Park “/ });
  await expect(park.getByLabel("Parked because")).toBeVisible();
  await expectNoZoomOnFocus(page, "park dialog", 4 + 1);
  await park.getByRole("button", { name: "Cancel" }).tap();
  await expect(park).toBeHidden();

  // Settings: the matrix name.
  await page.getByRole("link", { name: "Settings" }).tap();
  await expect(page.getByLabel("Shown at the top of the matrix")).toBeVisible();
  await expectNoZoomOnFocus(page, "settings", 1);
});
