import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  DocumentError,
  emptyDocument,
  parseDocument,
  serializeDocument,
  type MatrixDocument,
} from "@idea-matrix/core";

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
      if ((e as NodeJS.ErrnoException).code === "ENOENT") {
        throw new StoreError(
          `No matrix file at ${this.path}. Create one in the Idea Matrix app first, or run "idea-matrix init".`,
        );
      }
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

export class StoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoreError";
  }
}
