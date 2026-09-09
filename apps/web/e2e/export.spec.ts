import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { CSV_COLUMNS, exportCsv, exportMarkdown, parseDocument, serializeDocument } from "@idea-matrix/core";
import { expect, readMatrixFile, setUpWithExample, test } from "./helpers";

/** Pick a format from the Export menu and return the downloaded file's name and text. */
async function exportAs(page: Page, format: "JSON" | "Markdown" | "CSV") {
  await page.getByRole("button", { name: "Export" }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: format }).click();
  const download = await downloading;
  const text = await readFile(await download.path(), "utf8");
  return { name: download.suggestedFilename(), text, firstLine: text.split("\n")[0] };
}

test("export: JSON, Markdown and CSV each download with the expected first line", async ({ page }) => {
  await setUpWithExample(page);
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  const doc = await readMatrixFile(page);

  const json = await exportAs(page, "JSON");
  expect(json.name).toBe("example-ideas.ideamatrix.json");
  expect(json.firstLine).toBe("{");
  expect(parseDocument(json.text)).toEqual(doc);
  expect(json.text).toBe(serializeDocument(doc));

  const markdown = await exportAs(page, "Markdown");
  expect(markdown.name).toBe("example-ideas.md");
  expect(markdown.firstLine).toBe("# Example ideas");
  expect(markdown.text).toBe(exportMarkdown(doc));

  const csv = await exportAs(page, "CSV");
  expect(csv.name).toBe("example-ideas.csv");
  expect(csv.firstLine).toBe(CSV_COLUMNS.join(","));
  expect(csv.text).toBe(exportCsv(doc));
});
