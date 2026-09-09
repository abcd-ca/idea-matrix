import { expect, expectSaved, openIdea, readMatrixFile, setUpWithExample, test } from "./helpers";

const NAME = "Sourdough starter tracker";
const REASON = "Two bakers I asked already keep a note on the fridge and are happy with it.";

test("parking: park with a reason, find it under Parked, bring it back from the detail screen", async ({ page }) => {
  await setUpWithExample(page);
  await openIdea(page, NAME);

  // Park it. The button stays off until there is a reason.
  await page.getByRole("button", { name: "Park this idea…" }).click();
  const dialog = page.getByRole("dialog", { name: `Park “${NAME}”` });
  await expect(dialog.getByRole("button", { name: "Park idea" })).toBeDisabled();
  await dialog.getByLabel("Parked because").fill(REASON);
  await dialog.getByRole("button", { name: "Park idea" }).click();

  // It lands on the Parked screen, with the sample's parked idea beside it.
  await expect(page).toHaveURL(/\/parked\/$/);
  await expect(page.getByRole("heading", { name: "Parked ideas" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Parked (2)" })).toBeVisible();
  const row = page.getByRole("row", { name: NAME });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Parked");
  await expectSaved(page);
  await expect
    .poll(async () => (await readMatrixFile(page)).ideas.find((i) => i.name === NAME)?.parkedReason, {
      timeout: 5_000,
    })
    .toBe(REASON);

  // The detail screen shows the reason and offers the way back.
  await openIdea(page, NAME);
  await expect(page.getByText("Parked because")).toBeVisible();
  await expect(page.getByText(REASON)).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to parked" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Park this idea…" })).toHaveCount(0);

  // Unpark by choosing another stage.
  await page.getByLabel("Stage").selectOption("Exploring");
  await expect(page.getByText("Parked because")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Back to matrix" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Parked (1)" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Park this idea…" })).toBeVisible();

  await page.getByRole("link", { name: "Back to matrix" }).click();
  await expect(page.getByRole("heading", { name: "Example ideas" })).toBeVisible();
  await expect(page.getByRole("row", { name: NAME })).toContainText("Exploring");
  await expect
    .poll(async () => (await readMatrixFile(page)).ideas.find((i) => i.name === NAME)?.stage, { timeout: 5_000 })
    .toBe("Exploring");
});
