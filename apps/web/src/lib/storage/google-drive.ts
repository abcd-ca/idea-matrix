import { FILE_EXTENSION } from "@idea-matrix/core";
import { GOOGLE_API_KEY, GOOGLE_APP_ID, GOOGLE_CLIENT_ID } from "../config";

/**
 * The Google Drive save target's plumbing: sign-in through Google Identity
 * Services, the Drive REST API for the one file, and the Google Picker for
 * choosing a file or folder.
 *
 * The trust rules this keeps:
 * - Nothing here runs until the user picks Google Drive. The two Google
 *   scripts are injected on demand, so a local-file user never loads them.
 * - The scope is drive.file: the app can only see files it created or the
 *   user picked. It cannot list or read the rest of their Drive.
 * - The access token lives in this browser: in memory, and in local storage
 *   so a reload or a new tab does not ask for a click. (It used to be session
 *   storage, which is per tab, and on a phone every link opened a new tab
 *   that landed on the sign-in gate.) It goes when Google expires it, about
 *   an hour after sign-in, or when the user signs out in Settings. No refresh
 *   token, no server of ours. After that, one click gets a new one.
 */

const SCOPE = "https://www.googleapis.com/auth/drive.file";
const GSI_SRC = "https://accounts.google.com/gsi/client";
const GAPI_SRC = "https://apis.google.com/js/api.js";
const FILES = "https://www.googleapis.com/drive/v3/files";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const FIELDS = "id,name,version,trashed";
const MIME = "application/json";
/** Consider a token stale a minute before Google does, so a save never lands on an expiring one. */
const EXPIRY_MARGIN_MS = 60_000;

/** Thrown when a request needs the user to sign in again (from a click). */
export class DriveAuthError extends Error {
  constructor(message = "Google needs you to sign in again before the app can reach your file.") {
    super(message);
    this.name = "DriveAuthError";
  }
}

/** Thrown instead of making a second file with the same name in the same folder. */
export class DriveFileExistsError extends Error {
  constructor(name: string) {
    super(
      `There is already a file called ${name} in that folder. Open that one instead, or choose a different name or folder.`,
    );
    this.name = "DriveFileExistsError";
  }
}

export class DriveRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "DriveRequestError";
  }
}

export interface DriveFileInfo {
  id: string;
  name: string;
  /** Monotonically increasing on Google's side; the app's revision check. */
  version: string;
  trashed?: boolean;
}

export function driveConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_API_KEY && GOOGLE_APP_ID);
}

// ---- scripts -------------------------------------------------------------

const scriptLoads = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  let load = scriptLoads.get(src);
  if (!load) {
    load = new Promise<void>((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src;
      el.async = true;
      el.onload = () => resolve();
      el.onerror = () => {
        scriptLoads.delete(src);
        reject(new Error("Could not load Google's sign-in script. Check your connection and try again."));
      };
      document.head.appendChild(el);
    });
    scriptLoads.set(src, load);
  }
  return load;
}

let pickerReady: Promise<void> | null = null;

function loadPicker(): Promise<void> {
  if (!pickerReady) {
    pickerReady = loadScript(GAPI_SRC).then(() => new Promise<void>((resolve) => gapi.load("picker", resolve)));
  }
  return pickerReady;
}

// ---- token ---------------------------------------------------------------

const TOKEN_KEY = "ideamatrix.googleToken";

interface Token {
  value: string;
  expiresAt: number;
}

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let token: Token | null = null;
let restored = false;
let pending: { resolve: (ok: boolean) => void } | null = null;

/** The token from an earlier load, if this browser has one that has not expired. */
function restoreToken(): void {
  if (restored) return;
  restored = true;
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<Token>;
    if (typeof parsed.value === "string" && typeof parsed.expiresAt === "number" && parsed.expiresAt > Date.now()) {
      token = { value: parsed.value, expiresAt: parsed.expiresAt };
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Local storage unavailable: the token lives in memory only.
  }
}

function setToken(next: Token | null): void {
  token = next;
  try {
    if (next) localStorage.setItem(TOKEN_KEY, JSON.stringify(next));
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Local storage unavailable: nothing to persist.
  }
}

export function hasToken(): boolean {
  restoreToken();
  return token !== null && token.expiresAt - EXPIRY_MARGIN_MS > Date.now();
}

async function ensureTokenClient(): Promise<google.accounts.oauth2.TokenClient> {
  if (tokenClient) return tokenClient;
  await loadScript(GSI_SRC);
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPE,
    callback: (response) => {
      if (response.access_token) {
        const seconds = Number(response.expires_in ?? 3600);
        setToken({ value: response.access_token, expiresAt: Date.now() + seconds * 1000 });
        pending?.resolve(true);
      } else {
        pending?.resolve(false);
      }
      pending = null;
    },
    error_callback: () => {
      pending?.resolve(false);
      pending = null;
    },
  });
  return tokenClient;
}

/**
 * Get an access token. This opens Google's popup, so it must run inside a
 * click handler. A stored token that has not expired is used without asking.
 */
export async function requestToken(): Promise<boolean> {
  if (hasToken()) return true;
  const client = await ensureTokenClient();
  if (pending) return false;
  return new Promise<boolean>((resolve) => {
    pending = { resolve };
    client.requestAccessToken();
  });
}

/** Forget the token and tell Google to invalidate it. */
export function signOut(): void {
  const current = token;
  setToken(null);
  if (current && typeof google !== "undefined") {
    try {
      google.accounts.oauth2.revoke(current.value);
    } catch {
      // Google's script may be gone; the token expires on its own within the hour.
    }
  }
}

// ---- REST ----------------------------------------------------------------

async function call(url: string, init: RequestInit = {}): Promise<Response> {
  if (!hasToken()) throw new DriveAuthError();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token!.value}`);
  const response = await fetch(url, { ...init, headers });
  if (response.status === 401) {
    // The token is no longer good. Forget it so the next click asks again.
    setToken(null);
    throw new DriveAuthError();
  }
  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      detail = body.error?.message ?? "";
    } catch {
      // no JSON body
    }
    const message =
      response.status === 404
        ? "The file can no longer be found in Google Drive. It may have been deleted or the app's access to it removed."
        : `Google Drive returned an error (${response.status})${detail ? `: ${detail}` : "."}`;
    throw new DriveRequestError(message, response.status);
  }
  return response;
}

export async function getInfo(id: string): Promise<DriveFileInfo> {
  const response = await call(`${FILES}/${encodeURIComponent(id)}?fields=${FIELDS}`);
  const info = (await response.json()) as DriveFileInfo;
  if (info.trashed)
    throw new DriveRequestError("The file is in Google Drive's bin. Restore it there, or open a different file.", 404);
  return info;
}

export async function download(id: string): Promise<string> {
  const response = await call(`${FILES}/${encodeURIComponent(id)}?alt=media`);
  return response.text();
}

/** A Drive query string literal: single quotes and backslashes escaped. */
function quote(value: string): string {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

/**
 * Is there already a file with this name in the folder? Only files the app
 * made or the user picked are visible under drive.file, which is exactly the
 * set a second create would collide with.
 */
export async function findFile(name: string, parentId: string | null): Promise<DriveFileInfo | null> {
  const terms = [`name = ${quote(name)}`, "trashed = false", `mimeType = ${quote(MIME)}`];
  if (parentId) terms.push(`${quote(parentId)} in parents`);
  const params = new URLSearchParams({ q: terms.join(" and "), fields: `files(${FIELDS})`, pageSize: "1" });
  const response = await call(`${FILES}?${params}`);
  const body = (await response.json()) as { files?: DriveFileInfo[] };
  return body.files?.[0] ?? null;
}

/** Make the file. Refuses when one with the same name is already in the folder: Drive itself allows duplicates. */
export async function createFile(name: string, parentId: string | null, text: string): Promise<DriveFileInfo> {
  if (await findFile(name, parentId)) throw new DriveFileExistsError(name);
  const boundary = `ideamatrix-${Date.now().toString(36)}`;
  const metadata: { name: string; mimeType: string; parents?: string[] } = { name, mimeType: MIME };
  if (parentId) metadata.parents = [parentId];
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: ${MIME}\r\n\r\n${text}\r\n--${boundary}--`;
  const response = await call(`${UPLOAD}?uploadType=multipart&fields=${FIELDS}`, {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  return (await response.json()) as DriveFileInfo;
}

/** Create a folder, at the top of My Drive when `parentId` is null. The app can see it because it made it. */
export async function createFolder(name: string, parentId: string | null): Promise<DriveFileInfo> {
  const metadata: { name: string; mimeType: string; parents?: string[] } = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) metadata.parents = [parentId];
  const response = await call(`${FILES}?fields=${FIELDS}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });
  return (await response.json()) as DriveFileInfo;
}

export async function updateFile(id: string, text: string): Promise<DriveFileInfo> {
  const response = await call(`${UPLOAD}/${encodeURIComponent(id)}?uploadType=media&fields=${FIELDS}`, {
    method: "PATCH",
    headers: { "Content-Type": MIME },
    body: text,
  });
  return (await response.json()) as DriveFileInfo;
}

// ---- picker --------------------------------------------------------------

export interface Picked {
  id: string;
  name: string;
}

/** The view is built by a callback because `google.picker` exists only once the script has loaded. */
async function openPicker(makeView: () => google.picker.DocsView, title: string): Promise<Picked | null> {
  if (!hasToken() && !(await requestToken())) throw new DriveAuthError();
  await loadPicker();
  return new Promise<Picked | null>((resolve) => {
    const picker = new google.picker.PickerBuilder()
      .addView(makeView())
      .setOAuthToken(token!.value)
      .setDeveloperKey(GOOGLE_API_KEY)
      .setAppId(GOOGLE_APP_ID)
      .setTitle(title)
      .setCallback((data) => {
        if (data.action === google.picker.Action.PICKED) {
          const doc = data.docs?.[0];
          resolve(doc ? { id: doc.id, name: doc.name } : null);
          picker.dispose();
        } else if (data.action === google.picker.Action.CANCEL) {
          resolve(null);
          picker.dispose();
        }
      })
      .build();
    picker.setVisible(true);
  });
}

/**
 * Choose an existing matrix file. Picking it is what grants the app access
 * to it. The view is Drive's folder tree, with JSON files in it, and a
 * double-click opens a folder. On a touch screen the picker's folders open
 * on nothing (tap, double tap, long press, tried on iOS Safari), so there
 * the view starts from a search for matrix files instead; clearing the
 * search box shows the folders again.
 */
export function pickFile(): Promise<Picked | null> {
  const touch = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  return openPicker(() => {
    const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
      .setIncludeFolders(true)
      .setMimeTypes(MIME)
      .setMode(google.picker.DocsViewMode.LIST);
    return touch ? view.setQuery(FILE_EXTENSION) : view;
  }, "Open your Idea Matrix file");
}

/** Choose the folder a new matrix file goes in. */
export function pickFolder(): Promise<Picked | null> {
  return openPicker(
    () =>
      new google.picker.DocsView(google.picker.ViewId.FOLDERS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true)
        .setMimeTypes("application/vnd.google-apps.folder")
        .setMode(google.picker.DocsViewMode.LIST),
    "Choose a folder for your Idea Matrix file",
  );
}
