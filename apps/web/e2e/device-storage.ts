import type { Page } from "@playwright/test";

/**
 * What the app keeps on the device, seen from a test. Local storage holds
 * the small flags (the scores toggle, the preferences record, a Google
 * token); IndexedDB, through idb-keyval's default store, holds the remembered
 * target (a file handle or a Drive pointer, plus which kind it is) and the
 * cached document. Every key starts with "ideamatrix.".
 */
export async function appLocalStorageKeys(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Object.keys(localStorage)
      .filter((key) => key.startsWith("ideamatrix."))
      .sort(),
  );
}

export interface IndexedDbState {
  /** Every key in the store, sorted. */
  keys: string[];
  /** The persisted slice of the app store, when the cache key is there. */
  cache: { doc: unknown; fileName: unknown; target: unknown; tourPending: unknown } | null;
}

/**
 * The keys in IndexedDB and what the cache holds. Values other than the
 * cache are not brought out: a FileSystemFileHandle cannot cross into the
 * test, and the keys alone say whether a target is remembered.
 */
export async function indexedDbState(page: Page): Promise<IndexedDbState> {
  return page.evaluate(
    () =>
      new Promise<IndexedDbState>((resolve, reject) => {
        const request = indexedDB.open("keyval-store");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains("keyval")) {
            db.close();
            resolve({ keys: [], cache: null });
            return;
          }
          const transaction = db.transaction("keyval");
          const store = transaction.objectStore("keyval");
          const keys = store.getAllKeys();
          const cached = store.get("ideamatrix.cache");
          transaction.onerror = () => reject(transaction.error);
          transaction.oncomplete = () => {
            db.close();
            const raw = cached.result as unknown;
            const state =
              typeof raw === "string" ? (JSON.parse(raw) as { state?: IndexedDbState["cache"] }).state : null;
            resolve({ keys: keys.result.map(String).sort(), cache: state ?? null });
          };
        };
      }),
  );
}
