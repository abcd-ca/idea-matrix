import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve, sep } from "node:path";
import { DocumentError, emptyDocument, parseDocument, serializeDocument, type MatrixDocument } from "@idea-matrix/core";

/**
 * The matrix file on disk. Every operation is read-modify-write against the
 * file, never against a cached copy, so the web app and this process can
 * take turns on the same file. Writes go to a temporary file and are renamed
 * into place, so a crash never leaves half a matrix.
 */
export class FileStore {
  constructor(public readonly path: string) {}

  async exists(): Promise<boolean> {
    try {
      await stat(this.path);
      return true;
    } catch {
      return false;
    }
  }

  async read(): Promise<MatrixDocument> {
    let text: string;
    try {
      text = await readFile(this.path, "utf8");
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        throw new StoreError(
          `No matrix file at ${this.path}. Create one in the Idea Matrix app first, or run "idea-matrix init".`,
        );
      }
      if (code === "EPERM" || code === "EACCES") throw new StoreError(readRefusedMessage(this.path, code));
      throw e;
    }
    try {
      return parseDocument(text);
    } catch (e) {
      if (e instanceof DocumentError) throw new StoreError(`${this.path}: ${e.message}`);
      throw e;
    }
  }

  async write(doc: MatrixDocument): Promise<void> {
    const text = serializeDocument(doc);
    await mkdir(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.${process.pid}.tmp`;
    await writeFile(tmp, text, "utf8");
    await rename(tmp, this.path);
  }

  /** Apply a pure change from the core package and persist the result. */
  async update(change: (doc: MatrixDocument) => MatrixDocument): Promise<MatrixDocument> {
    const current = await this.read();
    const next = change(current);
    await this.write(next);
    return next;
  }

  async init(name = "My ideas"): Promise<MatrixDocument> {
    if (await this.exists()) throw new StoreError(`${this.path} already exists.`);
    const doc = emptyDocument(name);
    await this.write(doc);
    return doc;
  }
}

/** The folders macOS guards with a per-app permission, by their names under the home folder. */
const GUARDED_FOLDERS = ["Desktop", "Documents", "Downloads"];

/**
 * What to tell the person when the operating system refuses to open the file.
 * On a Mac this is almost always the per-app permission for Desktop, Documents
 * or Downloads: the app hosting this server (Claude Desktop, say) has not been
 * allowed into that folder. The message names the folder and the setting, and
 * offers the other way out, moving the file.
 */
export function readRefusedMessage(
  path: string,
  code: string,
  env: { platform: NodeJS.Platform; home: string } = { platform: process.platform, home: homedir() },
): string {
  const full = resolve(path);
  const guarded =
    env.platform === "darwin"
      ? GUARDED_FOLDERS.find((name) => full.startsWith(resolve(env.home, name) + sep))
      : undefined;
  if (guarded) {
    return (
      `macOS is keeping this program out of your ${guarded} folder, so it cannot read ${full}. ` +
      `Allow it once in System Settings → Privacy & Security → Files and Folders: find the app running it ` +
      `(Claude, for the Claude Desktop extension) and turn on ${guarded}. ` +
      `Or move the file to a folder outside Desktop, Documents and Downloads and point the extension at the new location.`
    );
  }
  return `This program is not allowed to read ${full} (${code}). Check the file's permissions, or move it to a folder this program can reach.`;
}

export class StoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoreError";
  }
}
