import { expect, expectSaved, readMatrixFile, setUpWithExample, statusArea, test } from "./helpers";

/**
 * Two tabs of one browser on the same file. The second tab is hidden from the
 * start (the page never sees itself as visible), and a hidden tab polls
 * nothing, so anything it learns can only have come over the same-device
 * channel from the tab that saved. The timeout is well under the watcher's
 * 3 s interval for the same reason.
 */
test("same device: a second tab learns of a save at once over the channel, even while hidden", async ({
  page,
  context,
}) => {
  await setUpWithExample(page);
  await expectSaved(page);

  const hidden = await context.newPage();
  await hidden.addInitScript(() => {
    Object.defineProperty(document, "visibilityState", { get: () => "hidden" });
    Object.defineProperty(document, "hidden", { get: () => true });
  });
  await hidden.goto("/");
  await expect(hidden.getByRole("heading", { name: "Example ideas" })).toBeVisible();
  await expect(hidden.getByText(/Also open somewhere else/)).toHaveCount(0);

  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByLabel("Shown at the top of the matrix").fill("Renamed in the first tab");
  await expect.poll(async () => (await readMatrixFile(page)).name, { timeout: 5_000 }).toBe("Renamed in the first tab");

  await expect(hidden.getByRole("heading", { name: "Renamed in the first tab" })).toBeVisible({ timeout: 2_000 });
  await expect(statusArea(hidden).getByText(/Also open somewhere else; last change just now/)).toBeVisible();
  // The first tab wrote the change itself, so it has seen nothing from elsewhere.
  await expect(page.getByText(/Also open somewhere else/)).toHaveCount(0);
  await hidden.close();
});
