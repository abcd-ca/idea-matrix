import { renameDocument, sampleDocument, serializeDocument, updateIdea } from "@idea-matrix/core";
import {
  expect,
  expectSaved,
  openIdea,
  readMatrixFile,
  setUpWithExample,
  statusArea,
  test,
  writeFileText,
} from "./helpers";

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

test("watcher: a change from outside arrives while this tab is mid-edit, and both edits are kept", async ({ page }) => {
  const rink = sampleDocument().ideas.find((i) => i.id === "sample-rink")!;
  await setUpWithExample(page);
  await expectSaved(page);
  await openIdea(page, rink.name);

  // Score the idea from outside (the phone, or the MCP server), then type
  // here straight away, before the watcher has looked. Whichever runs first,
  // the tab's save finding the file moved on or the watcher merging the file
  // into the unsaved edit, the merge is field by field against what this
  // tab last saw, so the score and the text both survive.
  const current = await readMatrixFile(page);
  await writeFileText(page, serializeDocument(updateIdea(current, rink.id, { scores: { reach: 5 } })));
  const typed = "Typed while the file changed underneath";
  await page.getByLabel("Description").fill(typed);

  await expect
    .poll(
      async () => {
        const idea = (await readMatrixFile(page)).ideas.find((i) => i.id === rink.id)!;
        return { reach: idea.scores.reach, description: idea.description };
      },
      { timeout: WATCH_TIMEOUT_MS },
    )
    .toEqual({ reach: 5, description: typed });
  await expect(page.getByRole("radiogroup", { name: "Reach" }).getByRole("radio", { name: "5" })).toBeChecked();
  await expect(page.getByLabel("Description")).toHaveValue(typed);
  await expectSaved(page);
  await expect(statusArea(page).getByText(/Also open somewhere else/)).toBeVisible();
});
