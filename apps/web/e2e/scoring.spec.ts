import { confidenceGateMessage, potential, sampleDocument, score } from "@idea-matrix/core";
import { expect, expectSaved, openIdea, readMatrixFile, setUpWithExample, test } from "./helpers";

// The sample idea with no evidence at all: Confidence starts at 1 and is capped at 2.
const RINK = sampleDocument().ideas.find((i) => i.id === "sample-rink")!;

test("scoring: a score change autosaves, and evidence unlocks Confidence up to the gate", async ({ page }) => {
  await setUpWithExample(page);
  await openIdea(page, RINK.name);

  const reach = page.getByRole("radiogroup", { name: "Reach" });
  const confidence = page.getByRole("radiogroup", { name: "Confidence" });

  // The numbers start where the sample data put them.
  await expect(reach.getByRole("radio", { name: String(RINK.scores.reach) })).toBeChecked();
  await expect(confidence.getByRole("radio", { name: "1" })).toBeChecked();
  const before = potential(RINK.scores)!;
  await expect(page.getByText(String(before), { exact: true })).toBeVisible();

  // Change one score: Potential follows, and the file has it within a couple of seconds.
  await reach.getByRole("radio", { name: "5" }).click();
  const after = potential({ ...RINK.scores, reach: 5 })!;
  expect(after).not.toBe(before);
  await expect(page.getByText(String(after), { exact: true })).toBeVisible();
  await expectSaved(page);
  await expect
    .poll(async () => (await readMatrixFile(page)).ideas.find((i) => i.id === RINK.id)?.scores.reach, {
      timeout: 5_000,
    })
    .toBe(5);

  // Without evidence, Confidence stops at 2 and says why.
  for (const level of ["3", "4", "5"]) await expect(confidence.getByRole("radio", { name: level })).toBeDisabled();
  await expect(page.getByText(confidenceGateMessage(2), { exact: true })).toBeVisible();

  // One conversation with "what they do now" and no commitment.
  await page.getByRole("button", { name: "Add" }).click();
  const dialog = page.getByRole("dialog", { name: "Add a conversation" });
  await dialog.getByLabel("Who").fill("Strata council chair");
  await dialog
    .getByLabel("What do they currently do about this problem?")
    .fill("Checks the ice by hand three times a night with a flashlight.");
  await dialog.getByRole("button", { name: "Add conversation" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Evidence log · 1")).toBeVisible();

  // Now 3 and 4 are open; 5 still needs a commitment.
  await expect(confidence.getByRole("radio", { name: "3" })).toBeEnabled();
  await expect(confidence.getByRole("radio", { name: "4" })).toBeEnabled();
  await expect(confidence.getByRole("radio", { name: "5" })).toBeDisabled();
  await expect(confidence.getByRole("radio", { name: "5" })).toHaveAttribute("title", confidenceGateMessage(4));
  await expect(page.getByText(confidenceGateMessage(4), { exact: true })).toBeVisible();

  await confidence.getByRole("radio", { name: "4" }).click();
  await expect(confidence.getByRole("radio", { name: "4" })).toBeChecked();
  await expect(page.getByText(String(score(after, 4)), { exact: true })).toBeVisible();

  // The file, parsed with core, carries the score, the evidence and the new Confidence.
  await expectSaved(page);
  await expect
    .poll(
      async () => {
        const idea = (await readMatrixFile(page)).ideas.find((i) => i.id === RINK.id)!;
        return { confidence: idea.confidence, reach: idea.scores.reach, evidence: idea.evidence.length };
      },
      { timeout: 5_000 },
    )
    .toEqual({ confidence: 4, reach: 5, evidence: 1 });
  const saved = (await readMatrixFile(page)).ideas.find((i) => i.id === RINK.id)!;
  expect(saved.evidence[0]).toMatchObject({
    who: "Strata council chair",
    whatTheyDoNow: "Checks the ice by hand three times a night with a flashlight.",
    commitment: "",
  });
});
