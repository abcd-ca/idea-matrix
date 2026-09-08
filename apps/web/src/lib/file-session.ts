"use client";

import {
  DocumentError,
  FILE_EXTENSION,
  parseDocument,
  serializeDocument,
  type MatrixDocument,
} from "@idea-matrix/core";
import {
  clearHandle,
  loadHandle,
  permissionState,
  pickExistingFile,
  pickNewFile,
  readFile,
  requestPermission,
  saveHandle,
  writeFile,
} from "./storage/local-file";
import { useAppStore } from "./store";

/**
 * Everything that touches the file handle. The handle itself is kept here,
 * outside the store, because it is a live browser object.
 */

let handle: FileSystemFileHandle | null = null;
let knownModified = 0;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let saving = false;
let started = false;

export const SAVE_DELAY_MS = 1000;
const WATCH_INTERVAL_MS = 3000;

export function currentHandle(): FileSystemFileHandle | null {
  return handle;
}

function explain(e: unknown): string {
  if (e instanceof DocumentError) return e.message;
  if (e instanceof DOMException && e.name === "NotAllowedError") {
    return "The browser did not allow access to the file. Try again, or open a different file.";
  }
  if (e instanceof DOMException && e.name === "NotFoundError") {
    return "The file can no longer be found. It may have been moved or deleted. Put it back and reload the page, or open a different file.";
  }
  return e instanceof Error ? e.message : "Something went wrong with the file.";
}

async function loadFromHandle(h: FileSystemFileHandle): Promise<MatrixDocument> {
  const snapshot = await readFile(h);
  const doc = parseDocument(snapshot.text);
  knownModified = snapshot.lastModified;
  return doc;
}

/** Called once from the FileSession component after the cache has hydrated. */
export async function startSession(): Promise<void> {
  if (started) return;
  started = true;
  const store = useAppStore.getState();
  const remembered = await loadHandle();
  if (!remembered) {
    // Nothing remembered: whatever is cached is stale, since the file is the truth.
    if (store.doc && !store.dirty) store.setDoc(null);
    store.setStatus("no-file");
    return;
  }
  handle = remembered;
  store.setFile(remembered.name);
  const permission = await permissionState(remembered);
  if (permission !== "granted") {
    store.setStatus("needs-permission");
    return;
  }
  await adoptFile();
}

/**
 * Read the file into the store, unless the cached copy carries unsaved
 * changes that are newer than the file, in which case the cache wins and is
 * saved back.
 */
async function adoptFile(): Promise<void> {
  const store = useAppStore.getState();
  if (!handle) return;
  try {
    const fileDoc = await loadFromHandle(handle);
    const cached = store.doc;
    if (store.dirty && cached && cached.updatedAt > fileDoc.updatedAt) {
      store.setStatus("ready");
      scheduleSave();
      return;
    }
    store.setDoc(fileDoc);
    store.setStatus("ready");
  } catch (e) {
    store.setStatus("error", explain(e));
  }
}

/** The Resume button. Must run inside a click handler. */
export async function resume(): Promise<boolean> {
  if (!handle) return false;
  const ok = await requestPermission(handle);
  if (!ok) {
    useAppStore.getState().setStatus("needs-permission", "The browser did not grant access. You can open a different file instead.");
    return false;
  }
  await adoptFile();
  return true;
}

export async function openExistingFile(): Promise<"opened" | "cancelled" | "error"> {
  const store = useAppStore.getState();
  try {
    const picked = await pickExistingFile();
    if (!picked) return "cancelled";
    const doc = await loadFromHandle(picked);
    handle = picked;
    await saveHandle(picked);
    store.setFile(picked.name);
    store.setDoc(doc);
    store.setStatus("ready");
    return "opened";
  } catch (e) {
    store.setStatus(handle ? "ready" : "no-file", explain(e));
    return "error";
  }
}

export async function createNewFile(): Promise<"created" | "cancelled" | "error"> {
  const store = useAppStore.getState();
  try {
    const picked = await pickNewFile(`ideas${FILE_EXTENSION}`);
    if (!picked) return "cancelled";
    handle = picked;
    await saveHandle(picked);
    store.setFile(picked.name);
    store.setStatus("ready");
    return "created";
  } catch (e) {
    store.setStatus(handle ? "ready" : "no-file", explain(e));
    return "error";
  }
}

/** Put a document into the open file straight away (used after "create"). */
export async function writeDocumentNow(doc: MatrixDocument): Promise<void> {
  const store = useAppStore.getState();
  store.setDoc(doc, { dirty: true });
  await saveNow();
}

export async function closeFile(): Promise<void> {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  await flushSave();
  handle = null;
  knownModified = 0;
  await clearHandle();
  const store = useAppStore.getState();
  store.setDoc(null);
  store.setFile(null);
  store.setStatus("no-file");
}

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void saveNow();
  }, SAVE_DELAY_MS);
}

export async function flushSave(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (useAppStore.getState().dirty) await saveNow();
}

async function saveNow(): Promise<void> {
  const store = useAppStore.getState();
  if (!handle || !store.doc || saving) return;
  saving = true;
  store.setStatus("saving");
  try {
    const text = serializeDocument(store.doc);
    knownModified = await writeFile(handle, text);
    store.markSaved(Date.now());
  } catch (e) {
    store.setStatus("error", explain(e));
  } finally {
    saving = false;
  }
  // Something changed while we were writing: go again.
  if (useAppStore.getState().dirty && !saveTimer) scheduleSave();
}

/** Reload if the file changed underneath us (another tab, the MCP server later). */
async function checkForExternalChange(): Promise<void> {
  const store = useAppStore.getState();
  if (!handle || saving || store.dirty || store.status === "needs-permission") return;
  try {
    const file = await handle.getFile();
    if (file.lastModified <= knownModified) return;
    const doc = parseDocument(await file.text());
    knownModified = file.lastModified;
    if (!store.doc || doc.updatedAt !== store.doc.updatedAt) {
      store.setDoc(doc);
      store.setStatus("ready");
    }
  } catch (e) {
    store.setStatus("error", explain(e));
  }
}

/** Wire the autosave and the watcher. Returns a cleanup function. */
export function attachPersistence(): () => void {
  const unsubscribe = useAppStore.subscribe((state, previous) => {
    if (state.dirty && state.doc && state.doc !== previous.doc && handle && state.status !== "needs-permission") {
      scheduleSave();
    }
  });
  const interval = setInterval(() => {
    if (document.visibilityState === "visible") void checkForExternalChange();
  }, WATCH_INTERVAL_MS);
  const onVisible = () => {
    if (document.visibilityState === "visible") void checkForExternalChange();
  };
  const onBeforeUnload = (event: BeforeUnloadEvent) => {
    if (useAppStore.getState().dirty) {
      event.preventDefault();
    }
  };
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("beforeunload", onBeforeUnload);
  return () => {
    unsubscribe();
    clearInterval(interval);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("beforeunload", onBeforeUnload);
  };
}
