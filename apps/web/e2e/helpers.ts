import { expect, test as base, type Page } from "@playwright/test";
import { parseDocument, type MatrixDocument } from "@idea-matrix/core";

export { expect };

/**
 * Every test also checks the rule that nothing leaves the machine: the only
 * requests a page may make are to the server that serves it.
 */
export const test = base.extend<{ onlyLocalRequests: void }>({
  onlyLocalRequests: [
    async ({ page, baseURL }, use) => {
      const elsewhere: string[] = [];
      page.on("request", (request) => {
        if (baseURL && !request.url().startsWith(baseURL)) elsewhere.push(request.url());
      });
      await use();
      expect(elsewhere, "requests to other hosts").toEqual([]);
    },
    { auto: true },
  ],
});

/**
 * The app keeps its matrix in a file it reaches through the File System
 * Access API, and the dialogs that hand out those handles cannot be driven
 * from a test. The stand-in: replace the two picker functions with ones that
 * return a handle from the browser's origin private file system. That handle
 * is a real FileSystemFileHandle (createWritable, getFile, storable in
 * IndexedDB), so the rest of the app runs unchanged, and the test can read
 * the file back through another handle to the same name.
 */
export const FILE_NAME = "ideas.ideamatrix.json";

export async function installOpfsPickers(page: Page, fileName = FILE_NAME): Promise<void> {
  await page.addInitScript((name) => {
    const handle = async () => {
      const root = await navigator.storage.getDirectory();
      return root.getFileHandle(name, { create: true });
    };
    window.showSaveFilePicker = () => handle();
    window.showOpenFilePicker = async () => [await handle()];
  }, fileName);
}

/** A browser without the File System Access API, the way Safari and Firefox are today. */
export async function withoutLocalFileApi(page: Page): Promise<void> {
  await page.addInitScript(() => {
    for (const key of ["showOpenFilePicker", "showSaveFilePicker"] as const) {
      delete window[key];
      if (key in window) Object.defineProperty(window, key, { value: undefined, configurable: true });
    }
  });
}

export async function readFileText(page: Page, fileName = FILE_NAME): Promise<string> {
  return page.evaluate(async (name) => {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(name);
    return (await handle.getFile()).text();
  }, fileName);
}

export async function readMatrixFile(page: Page, fileName = FILE_NAME): Promise<MatrixDocument> {
  return parseDocument(await readFileText(page, fileName));
}

/** Write the file "from outside": a second handle to the same name, as another tab or the MCP server would. */
export async function writeFileText(page: Page, text: string, fileName = FILE_NAME): Promise<void> {
  await page.evaluate(
    async ({ name, content }) => {
      const root = await navigator.storage.getDirectory();
      const handle = await root.getFileHandle(name, { create: true });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
    },
    { name: fileName, content: text },
  );
}

/** The tour is a driver.js dialog named by its title. */
export function tourDialog(page: Page) {
  return page.getByRole("dialog", { name: "Score your project ideas" });
}

export async function closeTour(page: Page): Promise<void> {
  const tour = tourDialog(page);
  await expect(tour).toBeVisible();
  await tour.getByRole("button", { name: "Close" }).click();
  await expect(tour).toBeHidden();
}

/** Every edit is saved about a second later; the indicator beside the content says when. */
export async function expectSaved(page: Page): Promise<void> {
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: `Saved to ${FILE_NAME}` })
      .first(),
  ).toBeVisible({
    timeout: 10_000,
  });
}

/**
 * First run, all the way to the example matrix on screen with the tour
 * closed. Tests that are not about setup itself start here; a test about the
 * first-run tour itself asks for it to be left open.
 */
export async function setUpWithExample(page: Page, { keepTour = false } = {}): Promise<void> {
  await installOpfsPickers(page);
  await page.goto("/setup/");
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("radio", { name: /This computer/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create a file…" }).click();
  await expect(page.getByRole("heading", { name: "What should go in it?" })).toBeVisible();
  await page.getByRole("button", { name: "Open my matrix" }).click();
  await expect(page.getByRole("heading", { name: "Example ideas" })).toBeVisible();
  if (!keepTour) await closeTour(page);
}

/** Open an idea from the matrix table by its name. */
export async function openIdea(page: Page, name: string): Promise<void> {
  await page.getByRole("row", { name }).click();
  await expect(page.getByRole("textbox", { name: "Idea name" })).toHaveValue(name);
}
