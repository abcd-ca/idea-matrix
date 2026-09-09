import { renameDocument, serializeDocument } from "@idea-matrix/core";
import { expect, expectSaved, readMatrixFile, setUpWithExample, test, writeFileText } from "./helpers";

// LocalTarget looks every 3 s (its watchInterval) on a 3 s tick, so a change
// lands within about 6 s. The timeout leaves room for a slow machine.
const WATCH_TIMEOUT_MS = 20_000;

test("watcher: a change written to the file from outside shows up in the open tab", async ({ page }) => {
  await setUpWithExample(page);
  await expectSaved(page);

  // Rename the matrix the way another tab or the MCP server would: through
  // core's serializer, written by a second handle to the same file.
  const current = await readMatrixFile(page);
  const renamed = renameDocument(current, "Renamed elsewhere");
  await writeFileText(page, serializeDocument(renamed));

  await expect(page.getByRole("heading", { name: "Renamed elsewhere" })).toBeVisible({ timeout: WATCH_TIMEOUT_MS });
  await expect(page.getByRole("heading", { name: "Example ideas" })).toHaveCount(0);

  // The tab took the file as it is, and did not mark it dirty and write its old copy back.
  await expectSaved(page);
  expect(await readMatrixFile(page)).toEqual(renamed);
});
