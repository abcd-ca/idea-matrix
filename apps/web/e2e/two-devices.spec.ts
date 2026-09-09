import { parseDocument, sampleDocument } from "@idea-matrix/core";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { DriveStandIn, GOOGLE_HOSTS } from "./drive-stand-in";
import { FILE_NAME, closeTour, expect, openIdea, statusArea, test } from "./helpers";

/**
 * One Drive file open on two devices. Each device is its own browser
 * context, so they share nothing in the browser; the stand-in Drive in the
 * test process is the only thing between them, exactly as Drive is between
 * a computer and a phone.
 *
 * DriveTarget looks every 10 s while visible, on a 3 s tick, so a change made
 * elsewhere lands within about 13 s. The timeout leaves room for a slow
 * machine.
 */
const SYNC_TIMEOUT_MS = 30_000;
const SAUNA = sampleDocument().ideas.find((i) => i.id === "sample-sauna")!;

test.use({ allowedHosts: GOOGLE_HOSTS });

interface Device {
  context: BrowserContext;
  page: Page;
  /** Requests to hosts other than the app's own server and the stand-in's. */
  elsewhere: string[];
}

async function newDevice(browser: Browser, drive: DriveStandIn, baseURL: string): Promise<Device> {
  const context = await browser.newContext();
  await drive.install(context);
  const elsewhere: string[] = [];
  context.on("request", (request) => {
    const url = request.url();
    if (!url.startsWith(baseURL) && !GOOGLE_HOSTS.some((host) => url.startsWith(host))) elsewhere.push(url);
  });
  return { context, page: await context.newPage(), elsewhere };
}

/** The wizard as far as the "where" step with Google Drive chosen. */
async function chooseDrive(page: Page): Promise<void> {
  await page.goto("/setup/");
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("radio", { name: /Google Drive/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
}

/** Device one: create the file in a new folder and fill it with the example matrix. */
async function createInDrive(page: Page): Promise<void> {
  await chooseDrive(page);
  await page.getByRole("button", { name: "Create in Drive…" }).click();
  await expect(page.getByRole("heading", { name: "What should go in it?" })).toBeVisible();
  await page.getByRole("button", { name: "Open my matrix" }).click();
  await expect(page.getByRole("heading", { name: "Example ideas" })).toBeVisible();
  await closeTour(page);
}

/** Device two: open the file that is already there, through the stand-in picker. */
async function openFromDrive(page: Page, file: { id: string; name: string }): Promise<void> {
  await chooseDrive(page);
  await page.evaluate((doc) => {
    (window as unknown as { __ideamatrixPick: unknown }).__ideamatrixPick = doc;
  }, file);
  await page.getByRole("button", { name: "Open from Drive…" }).click();
  // An existing file opens without the first-run tour.
  await expect(page.getByRole("heading", { name: "Example ideas" })).toBeVisible();
}

test("two devices on one Drive file: each sees the other's change, and edits to one idea from both sides are kept", async ({
  browser,
  baseURL,
}) => {
  const drive = new DriveStandIn();
  const desk = await newDevice(browser, drive, baseURL!);
  const phone = await newDevice(browser, drive, baseURL!);

  await createInDrive(desk.page);
  const file = drive.fileNamed(FILE_NAME)!;
  expect(file).toBeDefined();
  expect(parseDocument(drive.read(file.id)).name).toBe("Example ideas");
  await openFromDrive(phone.page, file);

  // Both devices open the same idea. The desk types a description; the
  // phone, without waiting, scores Reach. Whichever save lands second finds
  // the file moved on, reads it and merges field by field, so both edits end
  // up in the file and, once each watcher has looked, on both screens.
  await openIdea(desk.page, SAUNA.name);
  await openIdea(phone.page, SAUNA.name);
  const description = "Typed at the desk while the phone was scoring";
  await desk.page.getByLabel("Description").fill(description);
  await phone.page.getByRole("radiogroup", { name: "Reach" }).getByRole("radio", { name: "5" }).click();

  await expect
    .poll(
      () => {
        const idea = parseDocument(drive.read(file.id)).ideas.find((i) => i.id === SAUNA.id)!;
        return { description: idea.description, reach: idea.scores.reach };
      },
      { timeout: SYNC_TIMEOUT_MS },
    )
    .toEqual({ description, reach: 5 });
  await expect(desk.page.getByRole("radiogroup", { name: "Reach" }).getByRole("radio", { name: "5" })).toBeChecked({
    timeout: SYNC_TIMEOUT_MS,
  });
  await expect(phone.page.getByLabel("Description")).toHaveValue(description, { timeout: SYNC_TIMEOUT_MS });

  // Each device knows the other is there, in one quiet line of the status area.
  await expect(statusArea(desk.page).getByText(/Also open somewhere else/)).toBeVisible();
  await expect(statusArea(phone.page).getByText(/Also open somewhere else/)).toBeVisible();

  // A change made while the other device sits idle arrives on its own.
  await desk.page.getByRole("link", { name: "Matrix", exact: true }).click();
  await phone.page.getByRole("link", { name: "Settings" }).click();
  await phone.page.getByLabel("Shown at the top of the matrix").fill("Renamed on the phone");
  await expect(desk.page.getByRole("heading", { name: "Renamed on the phone" })).toBeVisible({
    timeout: SYNC_TIMEOUT_MS,
  });

  // Nothing reached anywhere but the app's server and the stand-in, and the stand-in saw nothing it did not expect.
  expect(drive.unexpected).toEqual([]);
  expect(desk.elsewhere).toEqual([]);
  expect(phone.elsewhere).toEqual([]);
  await desk.context.close();
  await phone.context.close();
});
