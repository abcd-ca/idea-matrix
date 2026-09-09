"use client";

import { create } from "zustand";
import { i18n } from "./i18n";
import {
  DEFAULT_LANGUAGE,
  DEFAULT_THEME,
  clearPreferences,
  detectLanguage,
  isDark,
  readPreferences,
  writePreferences,
  type Language,
  type Theme,
} from "./preferences";

/**
 * The device preferences, separate from the document store on purpose: they
 * belong to this browser, never to the matrix file. The store starts on the
 * defaults so the first client render matches the prerendered HTML, and
 * `hydrate` (called once from the layout, after mount) reads the record and
 * puts it into effect. The inline script in the layout has already set the
 * same `lang` and `dark` class from the same record before first paint, so
 * nothing visible changes here unless there is no record at all.
 */
export interface PreferencesState {
  /** False until the record has been read in the browser. */
  hydrated: boolean;
  language: Language;
  theme: Theme;
  /** The id of the newest "What's new" entry seen on this device; none until the bell is opened or the first run marks it. */
  whatsNewSeen: string | undefined;
  hydrate: () => void;
  setLanguage: (language: Language) => void;
  setTheme: (theme: Theme) => void;
  markWhatsNewSeen: (id: string) => void;
  /** Forget the stored record and go back to the device defaults: the browser's language, the system theme. */
  reset: () => void;
}

/** Put the preferences into effect: the app's language, <html lang>, and the dark class. */
function apply(language: Language, theme: Theme): void {
  if (i18n.language !== language) void i18n.changeLanguage(language);
  const root = document.documentElement;
  root.lang = language;
  root.classList.toggle("dark", isDark(theme));
}

export const usePreferences = create<PreferencesState>()((set, get) => ({
  hydrated: false,
  language: DEFAULT_LANGUAGE,
  theme: DEFAULT_THEME,
  whatsNewSeen: undefined,

  hydrate: () => {
    const stored = readPreferences();
    const language = stored.language ?? detectLanguage(navigator.languages ?? [navigator.language]);
    const theme = stored.theme ?? DEFAULT_THEME;
    set({ hydrated: true, language, theme, whatsNewSeen: stored.whatsNewSeen });
    apply(language, theme);
  },
  setLanguage: (language) => {
    writePreferences({ language });
    set({ language });
    apply(language, get().theme);
  },
  setTheme: (theme) => {
    writePreferences({ theme });
    set({ theme });
    apply(get().language, theme);
  },
  markWhatsNewSeen: (id) => {
    writePreferences({ whatsNewSeen: id });
    set({ whatsNewSeen: id });
  },
  reset: () => {
    clearPreferences();
    get().hydrate();
  },
}));
