import type { Page } from "@playwright/test";
import { expect, expectInsideViewport, setUpWithExample, test, tourDialog } from "./helpers";

// The welcome step, then the four phone steps (tour.tsx: STEPS[0] + PHONE_STEPS).
const PHONE_TOUR = [
  "Score your project ideas",
  "Every idea has a stage",
  "Each card is one idea",
  "Confidence: how much evidence is behind those scores?",
  "Tap an idea to score it",
];

/**
 * Next through every step. driver.js hides the popover while it moves the
 * highlight and shows it again with the next step's title, so waiting for
 * that title is the wait; the bounding box is polled after that.
 */
async function walkThroughTour(page: Page): Promise<void> {
  for (const [index, title] of PHONE_TOUR.entries()) {
    const step = page.getByRole("dialog", { name: title });
    await expect(step).toBeVisible();
    await expect(step).toContainText(`${index + 1} of ${PHONE_TOUR.length}`);
    await expectInsideViewport(step, `step ${index + 1} popover`);
    const last = index === PHONE_TOUR.length - 1;
    const button = step.getByRole("button", { name: last ? "Done" : "Next" });
    await expectInsideViewport(button, `step ${index + 1} ${last ? "Done" : "Next"} button`);
    await button.click();
  }
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

test("phone tour: the first-run tour is five steps, each popover and its button inside the viewport", async ({
  page,
}) => {
  await setUpWithExample(page, { keepTour: true });
  await walkThroughTour(page);
});

test("phone tour: Help → Show me around replays it from the welcome step", async ({ page }) => {
  await setUpWithExample(page);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Help" }).tap();
  await page.getByRole("menuitem", { name: "Show me around" }).tap();
  await expect(tourDialog(page)).toContainText("1 of 5");
  await walkThroughTour(page);
});
