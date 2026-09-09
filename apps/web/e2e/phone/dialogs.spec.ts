import {
  expect,
  expectInsideViewport,
  expectNoHorizontalOverflow,
  openIdeaCard,
  readMatrixFile,
  setUpWithExample,
  test,
} from "./helpers";

const NAME = "Sourdough starter tracker";
const REASON = "Two bakers I asked already keep a note on the fridge and are happy with it.";

test("phone dialogs: the park dialog sits on screen, parks with a reason, and shows up under Parked", async ({
  page,
}) => {
  await setUpWithExample(page);
  await openIdeaCard(page, NAME);
  await expectNoHorizontalOverflow(page, "idea detail");

  await page.getByRole("button", { name: "Park this idea…" }).tap();
  const dialog = page.getByRole("dialog", { name: `Park “${NAME}”` });
  await expectInsideViewport(dialog, "park dialog");
  const reason = dialog.getByLabel("Parked because");
  const park = dialog.getByRole("button", { name: "Park idea" });
  await expect(reason).toBeInViewport();
  await expect(park).toBeInViewport();
  await expect(park).toBeDisabled();

  await reason.fill(REASON);
  await park.tap();

  // The Parked screen, as cards, with the idea on it and the reason in the file.
  await expect(page).toHaveURL(/\/parked\/$/);
  await expect(page.getByRole("heading", { name: "Parked ideas" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Parked (2)" })).toBeVisible();
  const card = page.getByRole("listitem").filter({ hasText: NAME }).getByRole("button");
  await expect(card).toBeVisible();
  await expect(card).toContainText("Parked");
  await expect
    .poll(async () => (await readMatrixFile(page)).ideas.find((i) => i.name === NAME)?.parkedReason, {
      timeout: 5_000,
    })
    .toBe(REASON);
});

test("phone dialogs: the evidence dialog sits on screen and scrolls inside itself", async ({ page }) => {
  await setUpWithExample(page);
  await openIdeaCard(page, "Backyard rink monitor");
  await page.getByRole("button", { name: "Add" }).tap();

  const dialog = page.getByRole("dialog", { name: "Add a conversation" });
  await expectInsideViewport(dialog, "evidence dialog");
  await expect(dialog.getByLabel("Who")).toBeInViewport();

  // The taller dialog scrolls within its box rather than moving the page: its
  // last button can be brought into view while the page stays where it was.
  const pageScroll = await page.evaluate(() => window.scrollY);
  const add = dialog.getByRole("button", { name: "Add conversation" });
  await add.scrollIntoViewIfNeeded();
  await expect(add).toBeInViewport();
  await expectInsideViewport(dialog, "evidence dialog after scrolling to its footer");
  expect(await page.evaluate(() => window.scrollY), "page scroll while the dialog scrolls").toBe(pageScroll);
  await dialog.getByRole("button", { name: "Cancel" }).tap();
  await expect(dialog).toBeHidden();
});
