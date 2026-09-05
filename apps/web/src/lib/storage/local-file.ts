import { del, get, set } from "idb-keyval";

/**
 * The "a file on this computer" save target: a FileSystemFileHandle from the
 * File System Access API. The handle lives in IndexedDB (it cannot be
 * serialised to JSON), the document itself lives in the file.
 */

const HANDLE_KEY = "ideamatrix.fileHandle";
const PICKER_ID = "ideamatrix";

const FILE_TYPES: FilePickerAcceptType[] = [
  { description: "Idea Matrix file", accept: { "application/json": [".json"] } },
];

/** Feature detection, never browser sniffing. */
export function supportsLocalFile(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.showOpenFilePicker === "function" &&
    typeof window.showSaveFilePicker === "function"
  );
}

export async function loadHandle(): Promise<FileSystemFileHandle | undefined> {
  try {
    return await get<FileSystemFileHandle>(HANDLE_KEY);
  } catch {
    return undefined;
  }
}

export async function saveHandle(handle: FileSystemFileHandle): Promise<void> {
  await set(HANDLE_KEY, handle);
}

export async function clearHandle(): Promise<void> {
  try {
    await del(HANDLE_KEY);
  } catch {
    // nothing to clear
  }
}

function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

/** Returns null when the user cancels the dialog. */
export async function pickExistingFile(): Promise<FileSystemFileHandle | null> {
  if (!window.showOpenFilePicker) throw new Error("This browser cannot open files in place.");
  try {
    const [handle] = await window.showOpenFilePicker({ types: FILE_TYPES, multiple: false, id: PICKER_ID });
    return handle ?? null;
  } catch (e) {
    if (isAbort(e)) return null;
    throw e;
  }
}

/** Returns null when the user cancels the dialog. */
export async function pickNewFile(suggestedName: string): Promise<FileSystemFileHandle | null> {
  if (!window.showSaveFilePicker) throw new Error("This browser cannot save files in place.");
  try {
    return await window.showSaveFilePicker({ types: FILE_TYPES, suggestedName, id: PICKER_ID });
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
