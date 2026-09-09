"use client";

import { DocumentError, type MatrixDocument } from "@idea-matrix/core";
import type { TargetKind } from "./storage/target";
import { del, get, set } from "idb-keyval";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { explainDocumentError } from "./errors";
import { i18n } from "./i18n";

/**
 * Where the document is right now, from the user's point of view.
 *
 * - no-file: nothing chosen yet (first run, or the file was closed)
 * - needs-permission: a file is remembered but the browser wants a click
 *   before it will let the app write to it again
 * - ready / saving / saved / error: normal life with a file
 */
export type FileStatus = "no-file" | "needs-permission" | "loading" | "ready" | "saving" | "saved" | "error";

export interface AppState {
  hydrated: boolean;
  doc: MatrixDocument | null;
  fileName: string | null;
  /** Where the file lives, so screens can say so before the session has booted. */
  target: TargetKind | null;
  status: FileStatus;
  error: string | null;
  dirty: boolean;
  lastSavedAt: number | null;
  tourPending: boolean;

  setHydrated: () => void;
  /** Replace the document. `dirty` marks it as needing a save. */
  setDoc: (doc: MatrixDocument | null, options?: { dirty?: boolean }) => void;
  /**
   * Apply a pure change from the core package. Returns an error message
   * instead of throwing so forms can show it inline.
   */
  mutate: (change: (doc: MatrixDocument) => MatrixDocument) => string | null;
  setFile: (fileName: string | null, target: TargetKind | null) => void;
  setStatus: (status: FileStatus, error?: string | null) => void;
  markSaved: (at: number) => void;
  setTourPending: (pending: boolean) => void;
}

const idbStorage: StateStorage = {
  getItem: async (name) => (await get<string>(name)) ?? null,
  setItem: async (name, value) => {
    await set(name, value);
  },
  removeItem: async (name) => {
    await del(name);
  },
};

export const useAppStore = create<AppState>()(
  persist(
    (setState, getState) => ({
      hydrated: false,
      doc: null,
      fileName: null,
      target: null,
      status: "loading",
      error: null,
      dirty: false,
      lastSavedAt: null,
      tourPending: false,

      setHydrated: () => setState({ hydrated: true }),
      setDoc: (doc, options) => setState({ doc, dirty: doc !== null && (options?.dirty ?? false), error: null }),
      mutate: (change) => {
        const current = getState().doc;
        if (!current) return i18n.t("errors.noMatrixOpen", { ns: "common" });
        try {
          const next = change(current);
          setState({ doc: next, dirty: true, error: null });
          return null;
        } catch (e) {
          if (e instanceof DocumentError) return explainDocumentError(e);
          return i18n.t("errors.notApplied", { ns: "common" });
        }
      },
      setFile: (fileName, target) => setState({ fileName, target }),
      setStatus: (status, error = null) => setState({ status, error }),
      markSaved: (at) => setState({ status: "saved", dirty: false, lastSavedAt: at, error: null }),
      setTourPending: (tourPending) => setState({ tourPending }),
    }),
    {
      name: "ideamatrix.cache",
      storage: createJSONStorage(() => idbStorage),
      // Only the document and its name are cached. Status is rebuilt on boot.
      partialize: (state) => ({
        doc: state.doc,
        fileName: state.fileName,
        target: state.target,
        tourPending: state.tourPending,
        dirty: state.dirty,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
