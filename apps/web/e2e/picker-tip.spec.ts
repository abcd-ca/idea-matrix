import { DriveStandIn, GOOGLE_HOSTS } from "./drive-stand-in";
import { expect, test } from "./helpers";

/**
 * The line the app floats beside Google's picker, saying that a folder opens
 * on the second tap. The stand-in picker has no dialog to measure, so the
 * app waits about a second for one and then shows the line at the top of
 * the screen; the stand-in is told to stay open long enough for that.
 */
test.use({ allowedHosts: GOOGLE_HOSTS });

test("the folder tip shows while Google's picker is open and goes when it closes", async ({ page, context }) => {
  const drive = new DriveStandIn();
  await drive.install(context);
  await page.goto("/setup/");
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("radio", { name: /Google Drive/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.evaluate(() => {
    (window as unknown as { __ideamatrixPickDelay: number }).__ideamatrixPickDelay = 4000;
  });
  await page.getByRole("button", { name: "Open from Drive…" }).click();

  const tip = page.getByRole("note").filter({ hasText: "To open a folder, tap or click it twice." });
  await expect(tip).toBeVisible({ timeout: 5000 });
  await expect(tip).toBeHidden({ timeout: 10_000 });
  // Nothing was picked, so the wizard is still on the "where" step's file choice.
  await expect(page.getByRole("button", { name: "Open from Drive…" })).toBeVisible();
});
