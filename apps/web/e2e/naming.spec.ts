import { expect, expectSaved, openIdea, readMatrixFile, setUpWithExample, test } from "./helpers";

test("naming: the matrix name and an idea name can be cleared completely, then retyped", async ({ page }) => {
  await setUpWithExample(page);

  // The matrix name, in Settings. Clearing it leaves the field empty rather
  // than clinging to one letter; the document keeps its last real name until
  // a new one is typed.
  await page.getByRole("link", { name: "Settings" }).click();
  const matrixName = page.getByLabel("Shown at the top of the matrix");
  await expect(matrixName).toHaveValue("Example ideas");
  await matrixName.fill("");
  await expect(matrixName).toHaveValue("");
  await matrixName.fill("Weekend projects");
  // Settings has no save indicator; the file is the proof.
  await expect.poll(async () => (await readMatrixFile(page)).name, { timeout: 10_000 }).toBe("Weekend projects");
  // Left blank and abandoned, the field falls back to the committed name.
  await matrixName.fill("");
  await matrixName.blur();
  await expect(matrixName).toHaveValue("Weekend projects");

  // An idea's name, on its detail screen, behaves the same way.
  await page.getByRole("link", { name: "Matrix", exact: true }).click();
  await openIdea(page, "Backyard rink monitor");
  const ideaName = page.getByRole("textbox", { name: "Idea name" });
  await ideaName.fill("");
  await expect(ideaName).toHaveValue("");
  await ideaName.fill("Rink monitor");
  await expectSaved(page);
  await expect.poll(async () => (await readMatrixFile(page)).ideas.find((i) => i.name === "Rink monitor")).toBeTruthy();
  await ideaName.fill("");
  await ideaName.blur();
  await expect(ideaName).toHaveValue("Rink monitor");
});
