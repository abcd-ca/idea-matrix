/**
 * The "a file on this computer" side of the File System Access API: dialogs,
 * permissions, reading and writing a FileSystemFileHandle. The handle itself
 * is remembered by `target.ts`.
 */

import { i18n } from "../i18n";

const PICKER_ID = "ideamatrix";

const fileTypes = (): FilePickerAcceptType[] => [
  { description: i18n.t("picker.fileType", { ns: "common" }), accept: { "application/json": [".json"] } },
];

const noLocalFileApi = () => new Error(i18n.t("errors.noLocalFileApi", { ns: "common" }));

/** Feature detection, never browser sniffing. */
export function supportsLocalFile(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.showOpenFilePicker === "function" &&
    typeof window.showSaveFilePicker === "function"
  );
}

function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

/** Returns null when the user cancels the dialog. */
export async function pickExistingFile(): Promise<FileSystemFileHandle | null> {
  if (!window.showOpenFilePicker) throw noLocalFileApi();
  try {
    const [handle] = await window.showOpenFilePicker({ types: fileTypes(), multiple: false, id: PICKER_ID });
    return handle ?? null;
  } catch (e) {
    if (isAbort(e)) return null;
    throw e;
  }
}

/** Returns null when the user cancels the dialog. */
export async function pickNewFile(suggestedName: string): Promise<FileSystemFileHandle | null> {
  if (!window.showSaveFilePicker) throw noLocalFileApi();
  try {
    return await window.showSaveFilePicker({ types: fileTypes(), suggestedName, id: PICKER_ID });
  } catch (e) {
    if (isAbort(e)) return null;
    throw e;
  }
}

export async function permissionState(handle: FileSystemFileHandle): Promise<PermissionState> {
  if (!handle.queryPermission) return "granted";
  try {
    return await handle.queryPermission({ mode: "readwrite" });
  } catch {
    return "denied";
  }
}

/** Must be called from a user gesture (a click). */
export async function requestPermission(handle: FileSystemFileHandle): Promise<boolean> {
  if (!handle.requestPermission) return true;
  try {
    return (await handle.requestPermission({ mode: "readwrite" })) === "granted";
  } catch {
    return false;
  }
}

export interface FileSnapshot {
  text: string;
  lastModified: number;
  size: number;
}

export async function readFile(handle: FileSystemFileHandle): Promise<FileSnapshot> {
  const file = await handle.getFile();
  return { text: await file.text(), lastModified: file.lastModified, size: file.size };
}

/** Writes atomically: the browser writes a temp file and swaps it in on close. */
export async function writeFile(handle: FileSystemFileHandle, text: string): Promise<number> {
  const writable = await handle.createWritable();
  try {
    await writable.write(text);
  } finally {
    await writable.close();
  }
  const file = await handle.getFile();
  return file.lastModified;
}
