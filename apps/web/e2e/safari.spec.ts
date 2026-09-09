import { expect, test, withoutLocalFileApi } from "./helpers";

test("without the File System Access API: this computer is off with an explanation, Google Drive is offered", async ({
  page,
}) => {
  await withoutLocalFileApi(page);
  await page.goto("/setup/");
  await page.getByRole("button", { name: "Get started" }).click();
  await expect(page.getByRole("heading", { name: "Where do you want to keep your ideas?" })).toBeVisible();

  // The explanation, and the option it explains. (Next's route announcer is an alert too.)
  const alert = page.getByRole("alert").filter({ hasText: "“This computer” needs Chrome or Edge" });
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("Your browser can’t save changes back to a file on disk, so this option is off.");
  await expect(page.getByRole("radio", { name: /This computer/ })).toBeDisabled();
  await expect(page.getByRole("radio", { name: /^Dropbox/ })).toBeDisabled();

  // Google Drive works in any browser, and its file screen is next.
  const drive = page.getByRole("radio", { name: /Google Drive/ });
  await expect(drive).toBeEnabled();
  await drive.click();
  await expect(drive).toBeChecked();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Keeping your ideas in Google Drive.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open from Drive…" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create in Drive…" })).toBeVisible();
  // Nothing from Google loads until one of those is clicked; the shared fixture checks no request left the machine.
});
