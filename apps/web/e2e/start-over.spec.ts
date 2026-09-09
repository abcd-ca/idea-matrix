import { sampleDocument } from "@idea-matrix/core";
import { appLocalStorageKeys, indexedDbState } from "./device-storage";
import { FILE_NAME, expect, readMatrixFile, setUpWithExample, test } from "./helpers";

const NOTE =
  "Disconnects this device from your ideas file but does not delete it. You can reconnect to the file later. This can be useful when using a shared computer.";

test("start over on this device: the dialog, Cancel, then a clean slate with the file left alone", async ({ page }) => {
  await setUpWithExample(page);
  // Two more things a visit leaves in local storage: the scores toggle and a language choice.
  await page.evaluate(() => {
    localStorage.setItem("ideamatrix.showScores", "1");
    localStorage.setItem("ideamatrix.preferences", JSON.stringify({ language: "en-CA" }));
  });

  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByText(NOTE)).toBeVisible();
  await page.getByRole("button", { name: "Start over on this device" }).click();
  const dialog = page.getByRole("dialog", { name: "Start over on this device?" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Your matrix file stays exactly where it is");

  // Cancel: still on Settings with the file open, and everything still remembered.
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/settings\/$/);
  await expect(page.getByLabel("Shown at the top of the matrix")).toHaveValue("Example ideas");
  expect(await appLocalStorageKeys(page)).toEqual(["ideamatrix.preferences", "ideamatrix.showScores"]);
  const before = await indexedDbState(page);
  expect(before.keys).toEqual(["ideamatrix.cache", "ideamatrix.fileHandle", "ideamatrix.target"]);
  expect(before.cache?.fileName).toBe(FILE_NAME);

  // Confirm: the welcome screen, as a newcomer sees it.
  await page.getByRole("button", { name: "Start over on this device" }).click();
  await dialog.getByRole("button", { name: "Start over", exact: true }).click();
  await expect(page).toHaveURL(/\/setup\/$/);
  await expect(page.getByRole("heading", { name: "Score your project ideas" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Get started" })).toBeVisible();

  // Nothing remembered: the matrix screen sends the visit back to setup, and
  // the device holds no key of the app's beyond an empty cache.
  await page.goto("/");
  await expect(page).toHaveURL(/\/setup\/$/);
  expect(await appLocalStorageKeys(page)).toEqual([]);
  const after = await indexedDbState(page);
  expect(after.keys.filter((key) => key !== "ideamatrix.cache")).toEqual([]);
  expect(after.cache?.doc ?? null).toBeNull();
  expect(after.cache?.fileName ?? null).toBeNull();
  expect(after.cache?.tourPending ?? false).toBe(false);

  // The file itself is untouched, with the example's ideas.
  const written = await readMatrixFile(page);
  expect(written.name).toBe("Example ideas");
  expect(written.ideas.map((i) => i.id)).toEqual(sampleDocument().ideas.map((i) => i.id));
});
