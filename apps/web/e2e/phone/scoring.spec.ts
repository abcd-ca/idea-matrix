import { CRITERION_INFO, potential, sampleDocument } from "@idea-matrix/core";
import {
  expect,
  expectNoHorizontalOverflow,
  expectSaved,
  openIdeaCard,
  readMatrixFile,
  setUpWithExample,
  test,
} from "./helpers";

const RINK = sampleDocument().ideas.find((i) => i.id === "sample-rink")!;

test("phone scoring: the score pickers take a tap, the change saves, and the file has it", async ({ page }) => {
  await setUpWithExample(page);
  await openIdeaCard(page, RINK.name);
  await expectNoHorizontalOverflow(page, "idea detail");

  // Reach's five values all on screen once scrolled to, each big enough for a finger.
  const reach = page.getByRole("radiogroup", { name: "Reach" });
  await reach.scrollIntoViewIfNeeded();
  const values = reach.getByRole("radio");
  await expect(values).toHaveCount(5);
  for (const value of await values.all()) {
    await expect(value).toBeInViewport();
    const box = await value.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(40);
  }
  await expect(reach.getByRole("radio", { name: String(RINK.scores.reach) })).toBeChecked();

  // One tap changes Reach; the caption and Potential follow.
  const five = reach.getByRole("radio", { name: "5" });
  await five.tap();
  await expect(five).toBeChecked();
  await expect(page.getByText(`5 = ${CRITERION_INFO.reach.levels[5]}`, { exact: true })).toBeVisible();
  const after = potential({ ...RINK.scores, reach: 5 })!;
  await expect(page.getByText(String(after), { exact: true })).toBeVisible();

  // Saved, says the indicator, and the file agrees.
  await expectSaved(page);
  await expect
    .poll(async () => (await readMatrixFile(page)).ideas.find((i) => i.id === RINK.id)?.scores.reach, {
      timeout: 5_000,
    })
    .toBe(5);
});
