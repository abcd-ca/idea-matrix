import { del, get, set } from "idb-keyval";
import * as drive from "./google-drive";
import { permissionState, readFile, requestPermission, writeFile } from "./local-file";

/**
 * A save target is one place a matrix file can live. The session code talks
 * to this interface and nothing else, so adding Dropbox later means one more
 * class here and a card in the setup wizard.
 *
 * The document lives in memory and in the browser's cache; the target is the
 * truth. Every write is the whole file. `revision` is whatever the target uses
 * to tell "changed since I last looked": the file's modified time on disk,
 * Google's version counter in Drive.
 */
export type TargetKind = "local" | "drive";

export interface Snapshot {
  text: string;
  revision: string;
}

/** The target changed underneath us: someone else saved first. */
export class ConflictError extends Error {
  constructor() {
    super("Another copy of the app saved this file first.");
    this.name = "ConflictError";
  }
}

/** The target needs a click (a permission prompt, or a Google sign-in) before it can be used. */
export class NeedsAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NeedsAuthorizationError";
  }
}

export interface SaveTarget {
  readonly kind: TargetKind;
  readonly name: string;
  /** How often to look for changes made elsewhere, in milliseconds. */
  readonly watchInterval: number;
  /** May the app read and write right now, without a click? */
  ready(): Promise<boolean>;
  /** Ask for access. Must run inside a click handler. */
  authorize(): Promise<boolean>;
  read(): Promise<Snapshot>;
  /**
   * Write the whole file, but only if the target is still at `revision`
   * (pass null to skip the check). Returns the new revision.
   */
  write(text: string, revision: string | null): Promise<string>;
  /** The target's current revision, for the change watcher. */
  revision(): Promise<string>;
  /** Persist a pointer so the same target opens on the next visit. */
  remember(): Promise<void>;
}

export const HANDLE_KEY = "ideamatrix.fileHandle";
const DRIVE_KEY = "ideamatrix.driveFile";
const KIND_KEY = "ideamatrix.target";

const WHERE: Record<TargetKind, string> = { local: "on this computer", drive: "in Google Drive" };

/** "on this computer" / "in Google Drive", for sentences about the file. */
export function describeWhere(kind: TargetKind | null | undefined): string {
  return WHERE[kind ?? "local"];
}

// ---- a file on this computer ----------------------------------------------

export class LocalTarget implements SaveTarget {
  readonly kind = "local" as const;
  readonly watchInterval = 3_000;

  constructor(readonly handle: FileSystemFileHandle) {}

  get name(): string {
    return this.handle.name;
  }

  async ready(): Promise<boolean> {
    return (await permissionState(this.handle)) === "granted";
  }

  authorize(): Promise<boolean> {
    return requestPermission(this.handle);
  }

  async read(): Promise<Snapshot> {
    const snapshot = await readFile(this.handle);
    return { text: snapshot.text, revision: String(snapshot.lastModified) };
  }

  async write(text: string, revision: string | null): Promise<string> {
    if (revision !== null) {
      const file = await this.handle.getFile();
      if (file.lastModified > Number(revision)) throw new ConflictError();
    }
    return String(await writeFile(this.handle, text));
  }

  async revision(): Promise<string> {
    const file = await this.handle.getFile();
    return String(file.lastModified);
  }

  async remember(): Promise<void> {
    await set(HANDLE_KEY, this.handle);
    await set(KIND_KEY, "local");
    await del(DRIVE_KEY);
  }
}

// ---- Google Drive -----------------------------------------------------------

interface DrivePointer {
  id: string;
  name: string;
}

export class DriveTarget implements SaveTarget {
  readonly kind = "drive" as const;
  /** Every check is an API call, so look less often than on disk. */
  readonly watchInterval = 30_000;

  constructor(
    readonly id: string,
    readonly name: string,
  ) {}

  async ready(): Promise<boolean> {
    return drive.hasToken() || drive.requestToken(false);
  }

  authorize(): Promise<boolean> {
    return drive.requestToken(true);
  }

  async read(): Promise<Snapshot> {
    const [info, text] = await Promise.all([drive.getInfo(this.id), drive.download(this.id)]);
    return { text, revision: info.version };
  }

  async write(text: string, revision: string | null): Promise<string> {
    if (revision !== null) {
      const info = await drive.getInfo(this.id);
      if (info.version !== revision) throw new ConflictError();
    }
    const info = await drive.updateFile(this.id, text);
    return info.version;
  }

  async revision(): Promise<string> {
    return (await drive.getInfo(this.id)).version;
  }

  async remember(): Promise<void> {
    const pointer: DrivePointer = { id: this.id, name: this.name };
    await set(DRIVE_KEY, pointer);
    await set(KIND_KEY, "drive");
    await del(HANDLE_KEY);
  }
}

// ---- the remembered target --------------------------------------------------

/** The target the last visit left behind, if any. */
export async function loadTarget(): Promise<SaveTarget | null> {
  try {
    const kind = await get<TargetKind>(KIND_KEY);
    if (kind === "drive") {
      const pointer = await get<DrivePointer>(DRIVE_KEY);
      if (pointer && drive.driveConfigured()) return new DriveTarget(pointer.id, pointer.name);
    }
    // No kind recorded means a file remembered by an earlier version of the app.
    const handle = await get<FileSystemFileHandle>(HANDLE_KEY);
    if (handle) return new LocalTarget(handle);
  } catch {
    // IndexedDB unavailable: start fresh.
  }
  return null;
}

export async function forgetTarget(): Promise<void> {
  try {
    await Promise.all([del(HANDLE_KEY), del(DRIVE_KEY), del(KIND_KEY)]);
  } catch {
    // nothing to clear
  }
}
