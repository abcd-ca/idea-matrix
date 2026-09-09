import { z } from "zod";

/**
 * Preferences of the device, not of the matrix file: the language the app
 * speaks and, later, the theme. Nothing here goes into the document, so
 * saving, revisions and the MCP server never see them. One small record in
 * local storage, read through a schema at the boundary; a missing or
 * unreadable record means the defaults, which need no record at all.
 *
 * Pure logic lives here (parsing, defaults, detection) so it can be unit
 * tested; the Zustand store that applies it is in preferences-store.ts.
 */

export const PREFERENCES_KEY = "ideamatrix.preferences";

export const LANGUAGES = ["en-CA", "fr-CA", "en-US", "es"] as const;
export type Language = (typeof LANGUAGES)[number];

/** Each language in its own name, for the language select. Not translated on purpose. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  "en-CA": "English (Canada)",
  "fr-CA": "Français (Canada)",
  "en-US": "English (US)",
  es: "Español",
};

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_LANGUAGE: Language = "en-CA";
export const DEFAULT_THEME: Theme = "system";

/**
 * Unknown keys are dropped rather than rejected, unlike the document schemas,
 * so an older copy of the app can still read a record a newer one wrote.
 */
export const preferencesSchema = z.object({
  language: z.enum(LANGUAGES).optional(),
  theme: z.enum(THEMES).optional(),
});
export type Preferences = z.infer<typeof preferencesSchema>;

/** Parse the stored text. Anything unreadable, or not a record, is the empty record. */
export function parsePreferences(raw: string | null | undefined): Preferences {
  if (!raw) return {};
  try {
    const result = preferencesSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : {};
  } catch {
    return {};
  }
}

/**
 * The language the app should start in when nothing is stored: the first of
 * the browser's languages, in the order the browser lists them, that matches
 * a supported one. An exact tag wins ("en-US"); otherwise the language alone
 * decides ("fr" or "fr-FR" both mean fr-CA, "en-GB" means en-CA). Canadian
 * English when nothing matches.
 */
export function detectLanguage(languages: readonly string[]): Language {
  const exact = new Map<string, Language>();
  const byPrefix = new Map<string, Language>();
  for (const tag of LANGUAGES) {
    exact.set(tag.toLowerCase(), tag);
    const prefix = tag.slice(0, 2);
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, tag);
  }
  for (const wanted of languages) {
    const lower = wanted.toLowerCase();
    const match = exact.get(lower) ?? byPrefix.get(lower.slice(0, 2));
    if (match) return match;
  }
  return DEFAULT_LANGUAGE;
}

/**
 * Whether the page gets the `dark` class. "system" stays light for now: the
 * dark palette is unfinished and has no way to be turned off yet. When the
 * theme select lands, this is where "system" starts following the browser's
 * own preference (and the inline script in the layout does the same).
 */
export function isDark(theme: Theme): boolean {
  return theme === "dark";
}

export function readPreferences(): Preferences {
  try {
    return parsePreferences(localStorage.getItem(PREFERENCES_KEY));
  } catch {
    // Local storage unavailable: defaults, every time.
    return {};
  }
}

/** Merge a change into the stored record. Validated before it is written, like every other file the app writes. */
export function writePreferences(patch: Preferences): void {
  try {
    const next = preferencesSchema.parse({ ...readPreferences(), ...patch });
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
  } catch {
    // Local storage unavailable: the choice lasts until the page is closed.
  }
}

/**
 * The one inline script in the app, run from the root layout before first
 * paint so a stored language or theme is in place before anything shows.
 * It reads the same record and applies the same rules as the store: the
 * `dark` class when the theme is "dark", `<html lang>` when the language is
 * one of ours, nothing at all on a missing or unreadable record. A fixed
 * string with no user data in it, so a content security policy can allow it
 * by hash.
 */
export const PREFERENCES_SCRIPT =
  "(function(){try{" +
  `var p=JSON.parse(localStorage.getItem(${JSON.stringify(PREFERENCES_KEY)}));` +
  'if(!p||typeof p!=="object")return;' +
  "var h=document.documentElement;" +
  'if(p.theme==="dark")h.classList.add("dark");' +
  `if(${JSON.stringify(LANGUAGES)}.indexOf(p.language)>=0)h.lang=p.language;` +
  "}catch(e){}})();";
