"use client";

import {
  DocumentError,
  FILE_EXTENSION,
  emptyDocument,
  mergeDocuments,
  parseDocument,
  serializeDocument,
  type MatrixDocument,
} from "@idea-matrix/core";
import * as drive from "./storage/google-drive";
import { pickExistingFile, pickNewFile } from "./storage/local-file";
import {
  ConflictError,
  DriveTarget,
  LocalTarget,
  forgetTarget,
  loadTarget,
  type SaveTarget,
} from "./storage/target";
import { useAppStore } from "./store";

/**
 * Everything that touches the save target: the file on disk or the file in
 * Google Drive. The target itself is kept here, outside the store, because
 * it wraps live browser objects.
 */

let target: SaveTarget | null = null;
let knownRevision: string | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let saving = false;
let started = false;

export const SAVE_DELAY_MS = 1000;
const TICK_MS = 3000;

export function currentTarget(): SaveTarget | null {
  return target;
}

type OpenResult = "opened" | "cancelled" | "error";
type CreateResult = "created" | "cancelled" | "error";

function explain(e: unknown): string {
  if (e instanceof DocumentError) return e.message;
  if (e instanceof drive.DriveAuthError || e instanceof drive.DriveRequestError) return e.message;
  if (e instanceof DOMException && e.name === "NotAllowedError") {
    return "The browser did not allow access to the file. Try again, or open a different file.";
  }
  if (e instanceof DOMException && e.name === "NotFoundError") {
    return "The file can no longer be found. It may have been moved or deleted. Put it back and reload the page, or open a different file.";
  }
  return e instanceof Error ? e.message : "Something went wrong with the file.";
}

async function loadFrom(t: SaveTarget): Promise<MatrixDocument> {
  const snapshot = await t.read();
  const doc = parseDocument(snapshot.text);
  knownRevision = snapshot.revision;
  return doc;
}

async function adopt(t: SaveTarget, doc: MatrixDocument): Promise<void> {
  const store = useAppStore.getState();
  target = t;
  await t.remember();
  store.setFile(t.name, t.kind);
  store.setDoc(doc);
  store.setStatus("ready");
}

/** Called once from the FileSession component after the cache has hydrated. */
export async function startSession(): Promise<void> {
  if (started) return;
  started = true;
  const store = useAppStore.getState();
  const remembered = await loadTarget();
  if (!remembered) {
    // Nothing remembered: whatever is cached is stale, since the file is the truth.
    if (store.doc && !store.dirty) store.setDoc(null);
    store.setStatus("no-file");
    return;
  }
  target = remembered;
  store.setFile(remembered.name, remembered.kind);
  if (!(await remembered.ready())) {
    store.setStatus("needs-permission");
    return;
  }
  await readIntoStore();
}

/**
 * Read the target into the store, unless the cached copy carries unsaved
 * changes that are newer than the file, in which case the cache wins and is
 * saved back.
 */
async function readIntoStore(): Promise<void> {
  const store = useAppStore.getState();
  if (!target) return;
  try {
    const fileDoc = await loadFrom(target);
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
  if (!target) return false;
  const ok = await target.authorize();
  if (!ok) {
    const message =
      target.kind === "drive"
        ? "Google did not sign you in. Try again, or open a different file."
        : "The browser did not grant access. You can open a different file instead.";
    useAppStore.getState().setStatus("needs-permission", message);
    return false;
  }
  await readIntoStore();
  return true;
}

function failed(e: unknown): void {
  const store = useAppStore.getState();
  store.setStatus(target ? "ready" : "no-file", explain(e));
}

// ---- a file on this computer ----------------------------------------------

export async function openExistingFile(): Promise<OpenResult> {
  try {
    const picked = await pickExistingFile();
    if (!picked) return "cancelled";
    const t = new LocalTarget(picked);
    const doc = await loadFrom(t);
    await adopt(t, doc);
    return "opened";
  } catch (e) {
    failed(e);
    return "error";
  }
}

export async function createNewFile(): Promise<CreateResult> {
  try {
    const picked = await pickNewFile(`ideas${FILE_EXTENSION}`);
    if (!picked) return "cancelled";
    const t = new LocalTarget(picked);
    target = t;
    knownRevision = null;
    await t.remember();
    useAppStore.getState().setFile(t.name, t.kind);
    useAppStore.getState().setStatus("ready");
    return "created";
  } catch (e) {
    failed(e);
    return "error";
  }
}

// ---- Google Drive -----------------------------------------------------------

/** Sign in and pick a matrix file in Drive. Must run inside a click handler. */
export async function openDriveFile(): Promise<OpenResult> {
  try {
    const picked = await drive.pickFile();
    if (!picked) return "cancelled";
    const t = new DriveTarget(picked.id, picked.name);
    const doc = await loadFrom(t);
    await adopt(t, doc);
    return "opened";
  } catch (e) {
    failed(e);
    return "error";
  }
}

/**
 * Where a new Drive file goes: a folder the user picks in Google's picker, or
 * a folder the app creates at the top of My Drive (the picker has no "new
 * folder" button of its own).
 */
export type DriveFolderChoice = { kind: "pick" } | { kind: "new"; name: string };

/** Returns the folder id, or null when the user cancelled the picker. */
async function chooseDriveFolder(choice: DriveFolderChoice): Promise<string | null> {
  if (choice.kind === "new") {
    if (!(await drive.requestToken())) throw new drive.DriveAuthError();
    const folder = await drive.createFolder(choice.name.trim() || "Idea Matrix", null);
    return folder.id;
  }
  const picked = await drive.pickFolder();
  return picked ? picked.id : null;
}

/**
 * Sign in, settle on a folder and create the file there, holding an empty
 * matrix until the wizard's last step writes what the user chose to start with.
 */
export async function createDriveFile(name: string, folder: DriveFolderChoice): Promise<CreateResult> {
  try {
    const folderId = await chooseDriveFolder(folder);
    if (!folderId) return "cancelled";
    const fileName = ensureExtension(name);
    const info = await drive.createFile(fileName, folderId, serializeDocument(emptyDocument("My ideas")));
    const t = new DriveTarget(info.id, info.name);
    target = t;
    knownRevision = info.version;
    await t.remember();
    useAppStore.getState().setFile(t.name, t.kind);
    useAppStore.getState().setStatus("ready");
    return "created";
  } catch (e) {
    failed(e);
    return "error";
  }
}

function ensureExtension(name: string): string {
  const trimmed = name.trim() || "ideas";
  return trimmed.endsWith(FILE_EXTENSION) ? trimmed : `${trimmed.replace(/\.json$/i, "")}${FILE_EXTENSION}`;
}

// ---- moving between targets -------------------------------------------------

/**
 * "Move my matrix": copy the open document to a new place, confirm it is
 * there, switch to it, and leave the old file untouched. Must run inside a
 * click handler.
 */
export async function moveToDrive(folder: DriveFolderChoice): Promise<CreateResult> {
  const store = useAppStore.getState();
  if (!store.doc || !target) return "error";
  try {
    await flushSave();
    const folderId = await chooseDriveFolder(folder);
    if (!folderId) return "cancelled";
    const info = await drive.createFile(ensureExtension(target.name), folderId, serializeDocument(store.doc));
    const t = new DriveTarget(info.id, info.name);
    knownRevision = info.version;
    await adopt(t, store.doc);
    return "created";
  } catch (e) {
    failed(e);
    return "error";
  }
}

export async function moveToLocal(): Promise<CreateResult> {
  const store = useAppStore.getState();
  if (!store.doc || !target) return "error";
  try {
    await flushSave();
    const picked = await pickNewFile(ensureExtension(target.name));
    if (!picked) return "cancelled";
    const t = new LocalTarget(picked);
    knownRevision = await t.write(serializeDocument(store.doc), null);
    await adopt(t, store.doc);
    return "created";
  } catch (e) {
    failed(e);
    return "error";
  }
}

// ---- saving -----------------------------------------------------------------

/** Put a document into the open file straight away (used after "create"). */
export async function writeDocumentNow(doc: MatrixDocument): Promise<void> {
  const store = useAppStore.getState();
  store.setDoc(doc, { dirty: true });
  await saveNow();
  if (useAppStore.getState().status === "error") throw new Error(useAppStore.getState().error ?? "Could not write the file.");
}

export async function closeFile(): Promise<void> {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  await flushSave();
  target = null;
  knownRevision = null;
  await forgetTarget();
  const store = useAppStore.getState();
  store.setDoc(null);
  store.setFile(null, null);
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
  if (!target || !store.doc || saving) return;
  saving = true;
  store.setStatus("saving");
  try {
    const text = serializeDocument(store.doc);
    knownRevision = await target.write(text, knownRevision);
    store.markSaved(Date.now());
  } catch (e) {
    if (e instanceof ConflictError) {
      // Someone else saved first. Bring their copy in, keep our newer edits,
      // and let the normal save loop write the merged document.
      try {
        const remote = await target.read();
        knownRevision = remote.revision;
        const merged = mergeDocuments(useAppStore.getState().doc ?? store.doc, parseDocument(remote.text));
        store.setDoc(merged, { dirty: true });
        store.setStatus("ready");
      } catch (inner) {
        store.setStatus("error", explain(inner));
      }
    } else if (e instanceof drive.DriveAuthError) {
      // Keep the changes; the Resume screen asks for the one click Google needs.
      store.setStatus("needs-permission", "Google needs you to sign in again before the app can keep saving. Your changes are kept until then.");
    } else {
      store.setStatus("error", explain(e));
    }
  } finally {
    saving = false;
  }
  // Something changed while we were writing: go again.
  const state = useAppStore.getState();
  if (state.dirty && !saveTimer && state.status !== "needs-permission" && state.status !== "error") scheduleSave();
}

/** Reload if the file changed underneath us (another tab, another computer, the MCP server). */
async function checkForExternalChange(): Promise<void> {
  const store = useAppStore.getState();
  if (!target || saving || store.dirty || store.status === "needs-permission") return;
  try {
    const revision = await target.revision();
    if (knownRevision !== null && revision === knownRevision) return;
    const doc = await loadFrom(target);
    if (!store.doc || doc.updatedAt !== store.doc.updatedAt) {
      store.setDoc(doc);
      store.setStatus("ready");
    }
  } catch (e) {
    if (e instanceof drive.DriveAuthError) {
      store.setStatus("needs-permission", "Google needs you to sign in again before the app can check your file for changes.");
      return;
    }
    store.setStatus("error", explain(e));
  }
}

/** Wire the autosave and the watcher. Returns a cleanup function. */
export function attachPersistence(): () => void {
  const unsubscribe = useAppStore.subscribe((state, previous) => {
    if (state.dirty && state.doc && state.doc !== previous.doc && target && state.status !== "needs-permission") {
      scheduleSave();
    }
  });
  let lastCheck = 0;
  const check = () => {
    if (document.visibilityState !== "visible" || !target) return;
    if (Date.now() - lastCheck < target.watchInterval) return;
    lastCheck = Date.now();
    void checkForExternalChange();
  };
  const interval = setInterval(check, TICK_MS);
  const onVisible = () => {
    if (document.visibilityState === "visible") {
      lastCheck = 0;
      check();
    }
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
