import { sampleDocument } from "@idea-matrix/core";
import { FILE_NAME, closeTour, expect, readMatrixFile, test, tourDialog, installOpfsPickers } from "./helpers";

test("first run: setup screens, the example matrix, the tour, and a reload without setup", async ({ page }) => {
  await installOpfsPickers(page);

  // Nothing remembered: the matrix screen sends a first visit to setup.
  await page.goto("/");
  await expect(page).toHaveURL(/\/setup\/$/);
  await expect(page.getByRole("heading", { name: "Score your project ideas" })).toBeVisible();
  await page.getByRole("button", { name: "Get started" }).click();

  // Where: this computer, which the stubbed picker makes available.
  await expect(page.getByRole("heading", { name: "Where do you want to keep your ideas?" })).toBeVisible();
  const local = page.getByRole("radio", { name: /This computer/ });
  await expect(local).toBeEnabled();
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  await local.click();
  await expect(local).toBeChecked();
  await page.getByRole("button", { name: "Continue" }).click();

  // Which file: create a new one.
  await expect(
    page.getByRole("heading", { name: "Open a matrix you already have, or create a new one?" }),
  ).toBeVisible();
  await expect(page.getByText("Keeping your ideas on this computer.")).toBeVisible();
  await page.getByRole("button", { name: "Create a file…" }).click();

  // Start with: the example is preselected.
  await expect(page.getByRole("heading", { name: "What should go in it?" })).toBeVisible();
  await expect(page.getByText(`${FILE_NAME} is saved on this computer.`)).toBeVisible();
  await expect(page.getByRole("radio", { name: /An example matrix/ })).toBeChecked();
  await page.getByRole("button", { name: "Open my matrix" }).click();

  // The matrix, with the tour on top of it.
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Example ideas" })).toBeVisible();
  await expect(tourDialog(page)).toBeVisible();
  await expect(tourDialog(page)).toContainText("1 of 6");
  await closeTour(page);

  // Eight active ideas in the table, one parked in the menu.
  const sample = sampleDocument();
  const active = sample.ideas.filter((i) => i.stage !== "Parked");
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(active.length + 1);
  for (const idea of active) await expect(page.getByRole("row", { name: idea.name })).toBeVisible();
  await expect(page.getByRole("link", { name: "Parked (1)" })).toBeVisible();

  // The file holds the example, written through core's serializer.
  const written = await readMatrixFile(page);
  expect(written.name).toBe("Example ideas");
  expect(written.ideas.map((i) => i.id)).toEqual(sample.ideas.map((i) => i.id));

  // A reload comes back from the file: no setup, no second tour.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Example ideas" })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(active.length + 1);
  await expect(tourDialog(page)).toHaveCount(0);
});
