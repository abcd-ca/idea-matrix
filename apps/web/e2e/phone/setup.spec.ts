import { sampleDocument } from "@idea-matrix/core";
import {
  FILE_NAME,
  closeTour,
  expect,
  expectNoHorizontalOverflow,
  installOpfsPickers,
  readMatrixFile,
  test,
  tourDialog,
} from "./helpers";

test("phone setup: every wizard screen fits the width, the file is created, the matrix opens as cards", async ({
  page,
}) => {
  await installOpfsPickers(page);

  // The welcome, which once overflowed on phones: its button in view, no sideways scroll.
  await page.goto("/");
  await expect(page).toHaveURL(/\/setup\/$/);
  await expect(page.getByRole("heading", { name: "Score your project ideas" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "welcome");
  const start = page.getByRole("button", { name: "Get started" });
  await start.scrollIntoViewIfNeeded();
  await expect(start).toBeInViewport();
  await start.tap();

  // Where: this computer, which the stubbed picker makes available.
  await expect(page.getByRole("heading", { name: "Where do you want to keep your ideas?" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "where");
  const local = page.getByRole("radio", { name: /This computer/ });
  await local.tap();
  await expect(local).toBeChecked();
  await page.getByRole("button", { name: "Continue" }).tap();

  // Which file: create a new one.
  await expect(
    page.getByRole("heading", { name: "Open a matrix you already have, or create a new one?" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page, "file");
  await page.getByRole("button", { name: "Create a file…" }).tap();

  // Start with: the example is preselected.
  await expect(page.getByRole("heading", { name: "What should go in it?" })).toBeVisible();
  await expect(page.getByText(`${FILE_NAME} is saved on this computer.`)).toBeVisible();
  await expectNoHorizontalOverflow(page, "start with");
  await expect(page.getByRole("radio", { name: /An example matrix/ })).toBeChecked();
  await page.getByRole("button", { name: "Open my matrix" }).tap();

  // The matrix as cards, with the phone tour on top of it.
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Example ideas" })).toBeVisible();
  await expect(tourDialog(page)).toBeVisible();
  await expect(tourDialog(page)).toContainText("1 of 5");
  await closeTour(page);
  await expectNoHorizontalOverflow(page, "matrix");

  const sample = sampleDocument();
  const active = sample.ideas.filter((i) => i.stage !== "Parked");
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(page.getByRole("listitem")).toHaveCount(active.length);
  await expect(page.getByRole("link", { name: "Parked (1)" })).toBeVisible();

  // The file holds the example, written through core's serializer.
  const written = await readMatrixFile(page);
  expect(written.name).toBe("Example ideas");
  expect(written.ideas.map((i) => i.id)).toEqual(sample.ideas.map((i) => i.id));
});
