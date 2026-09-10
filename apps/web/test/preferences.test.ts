import { describe, expect, it } from "vitest";
import {
  DARK_QUERY,
  LANGUAGES,
  PREFERENCES_KEY,
  PREFERENCES_SCRIPT,
  detectLanguage,
  isDark,
  parsePreferences,
  preferencesSchema,
} from "../src/lib/preferences";

describe("parsePreferences", () => {
  it("reads a valid record", () => {
    expect(parsePreferences(JSON.stringify({ language: "fr-CA", theme: "dark" }))).toEqual({
      language: "fr-CA",
      theme: "dark",
    });
  });

  it("treats a missing or unreadable record as the defaults", () => {
    expect(parsePreferences(null)).toEqual({});
    expect(parsePreferences(undefined)).toEqual({});
    expect(parsePreferences("")).toEqual({});
    expect(parsePreferences("{not json")).toEqual({});
    expect(parsePreferences("42")).toEqual({});
    expect(parsePreferences("[]")).toEqual({});
  });

  it("drops unknown keys so an older app can read a newer record", () => {
    expect(parsePreferences(JSON.stringify({ language: "es", density: "compact" }))).toEqual({ language: "es" });
  });

  it("keeps the What's new marker, whatever id it names", () => {
    expect(parsePreferences(JSON.stringify({ whatsNewSeen: "2026-09-09-languages" }))).toEqual({
      whatsNewSeen: "2026-09-09-languages",
    });
    // An id from a newer copy of the app must survive this one rewriting the record.
    expect(parsePreferences(JSON.stringify({ language: "es", whatsNewSeen: "2031-01-01-unknown" }))).toEqual({
      language: "es",
      whatsNewSeen: "2031-01-01-unknown",
    });
    expect(parsePreferences(JSON.stringify({ whatsNewSeen: 7 }))).toEqual({});
    expect(parsePreferences(JSON.stringify({ whatsNewSeen: "" }))).toEqual({});
  });

  it("rejects values outside the supported sets", () => {
    expect(parsePreferences(JSON.stringify({ language: "de" }))).toEqual({});
    expect(parsePreferences(JSON.stringify({ theme: "sepia" }))).toEqual({});
    expect(preferencesSchema.safeParse({ language: "en-CA", theme: "system" }).success).toBe(true);
  });
});

describe("detectLanguage", () => {
  it("prefers an exact tag", () => {
    expect(detectLanguage(["en-US", "en-CA"])).toBe("en-US");
    expect(detectLanguage(["fr-CA"])).toBe("fr-CA");
    expect(detectLanguage(["es"])).toBe("es");
  });

  it("matches on the language alone when no tag is exact", () => {
    expect(detectLanguage(["fr"])).toBe("fr-CA");
    expect(detectLanguage(["fr-FR", "en"])).toBe("fr-CA");
    expect(detectLanguage(["es-MX"])).toBe("es");
    expect(detectLanguage(["en-GB"])).toBe("en-CA");
    expect(detectLanguage(["en"])).toBe("en-CA");
  });

  it("keeps the browser's order: the first language that matches wins, even by prefix", () => {
    expect(detectLanguage(["fr-FR", "en-US"])).toBe("fr-CA");
    expect(detectLanguage(["de-DE", "en-US", "fr-CA"])).toBe("en-US");
  });

  it("ignores case", () => {
    expect(detectLanguage(["FR-ca"])).toBe("fr-CA");
  });

  it("falls back to Canadian English", () => {
    expect(detectLanguage([])).toBe("en-CA");
    expect(detectLanguage(["de-DE", "ja"])).toBe("en-CA");
  });
});

describe("isDark", () => {
  it("is the theme's own answer for light and dark, and the system's for system", () => {
    expect(isDark("dark", false)).toBe(true);
    expect(isDark("dark", true)).toBe(true);
    expect(isDark("light", false)).toBe(false);
    expect(isDark("light", true)).toBe(false);
    expect(isDark("system", false)).toBe(false);
    expect(isDark("system", true)).toBe(true);
  });
});

describe("the inline script", () => {
  /** A stand-in for window.matchMedia that answers the dark query one way. */
  const matchMediaSaying = (dark: boolean) => (query: string) => ({ matches: query === DARK_QUERY && dark });

  /** Run the script against a fake page. `lang` and `classes` are what it left behind. */
  function run(stored: string | null, { systemDark = false, initialLang = "en-CA" } = {}) {
    const classes = new Set<string>();
    const html = {
      lang: initialLang,
      classList: { add: (c: string) => classes.add(c) },
    };
    const localStorage = {
      getItem: (key: string) => (key === PREFERENCES_KEY ? stored : null),
    };
    // The script references localStorage, document and matchMedia as globals; give it these.
    new Function("localStorage", "document", "matchMedia", PREFERENCES_SCRIPT)(
      localStorage,
      { documentElement: html },
      matchMediaSaying(systemDark),
    );
    return { lang: html.lang, classes: [...classes] };
  }

  it("is a fixed string that names the key, the dark query and every language", () => {
    expect(PREFERENCES_SCRIPT).toContain(JSON.stringify(PREFERENCES_KEY));
    expect(PREFERENCES_SCRIPT).toContain(JSON.stringify(DARK_QUERY));
    for (const tag of LANGUAGES) expect(PREFERENCES_SCRIPT).toContain(`"${tag}"`);
  });

  it("applies a stored language and theme, whatever the system says", () => {
    expect(run(JSON.stringify({ language: "fr-CA", theme: "dark" }))).toEqual({ lang: "fr-CA", classes: ["dark"] });
    expect(run(JSON.stringify({ language: "fr-CA", theme: "dark" }), { systemDark: true })).toEqual({
      lang: "fr-CA",
      classes: ["dark"],
    });
    expect(run(JSON.stringify({ theme: "light" }), { systemDark: true })).toEqual({ lang: "en-CA", classes: [] });
  });

  it("follows the system on a missing or unreadable record, and leaves the language alone", () => {
    for (const stored of [null, "{oops", "null"]) {
      expect(run(stored)).toEqual({ lang: "en-CA", classes: [] });
      expect(run(stored, { systemDark: true })).toEqual({ lang: "en-CA", classes: ["dark"] });
    }
  });

  it("ignores values it does not know, and follows the system for those too", () => {
    expect(run(JSON.stringify({ language: "de", theme: "sepia" }))).toEqual({ lang: "en-CA", classes: [] });
    expect(run(JSON.stringify({ language: "de", theme: "sepia" }), { systemDark: true })).toEqual({
      lang: "en-CA",
      classes: ["dark"],
    });
    expect(run(JSON.stringify({ whatsNewSeen: "2026-09-09-languages" }))).toEqual({ lang: "en-CA", classes: [] });
    expect(run(JSON.stringify({ language: "es", theme: "system" }))).toEqual({ lang: "es", classes: [] });
    expect(run(JSON.stringify({ language: "es", theme: "system" }), { systemDark: true })).toEqual({
      lang: "es",
      classes: ["dark"],
    });
  });

  it("does not throw when storage is unavailable", () => {
    const html = { lang: "en-CA", classList: { add: () => undefined } };
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
    };
    expect(() =>
      new Function("localStorage", "document", "matchMedia", PREFERENCES_SCRIPT)(
        broken,
        { documentElement: html },
        matchMediaSaying(true),
      ),
    ).not.toThrow();
    expect(html.lang).toBe("en-CA");
  });

  it("still sets the language when matchMedia is missing", () => {
    const classes: string[] = [];
    const html = { lang: "en-CA", classList: { add: (c: string) => classes.push(c) } };
    const localStorage = { getItem: () => JSON.stringify({ language: "fr-CA" }) };
    expect(() =>
      new Function("localStorage", "document", "matchMedia", PREFERENCES_SCRIPT)(
        localStorage,
        { documentElement: html },
        undefined,
      ),
    ).not.toThrow();
    expect(html.lang).toBe("fr-CA");
    expect(classes).toEqual([]);
  });
});
