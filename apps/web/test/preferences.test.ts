import { describe, expect, it } from "vitest";
import {
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
  it("only an explicit dark theme sets the class for now", () => {
    expect(isDark("dark")).toBe(true);
    expect(isDark("light")).toBe(false);
    expect(isDark("system")).toBe(false);
  });
});

describe("the inline script", () => {
  /** Run the script against a fake page. `lang` and `classes` are what it left behind. */
  function run(stored: string | null, initialLang = "en-CA") {
    const classes = new Set<string>();
    const html = {
      lang: initialLang,
      classList: { add: (c: string) => classes.add(c) },
    };
    const localStorage = {
      getItem: (key: string) => (key === PREFERENCES_KEY ? stored : null),
    };
    // The script references localStorage and document as globals; give it these.
    new Function("localStorage", "document", PREFERENCES_SCRIPT)(localStorage, { documentElement: html });
    return { lang: html.lang, classes: [...classes] };
  }

  it("is a fixed string that names the key and every language", () => {
    expect(PREFERENCES_SCRIPT).toContain(JSON.stringify(PREFERENCES_KEY));
    for (const tag of LANGUAGES) expect(PREFERENCES_SCRIPT).toContain(`"${tag}"`);
  });

  it("applies a stored language and theme", () => {
    expect(run(JSON.stringify({ language: "fr-CA", theme: "dark" }))).toEqual({ lang: "fr-CA", classes: ["dark"] });
  });

  it("does nothing on a missing or unreadable record", () => {
    expect(run(null)).toEqual({ lang: "en-CA", classes: [] });
    expect(run("{oops")).toEqual({ lang: "en-CA", classes: [] });
    expect(run("null")).toEqual({ lang: "en-CA", classes: [] });
  });

  it("ignores values it does not know", () => {
    expect(run(JSON.stringify({ language: "de", theme: "sepia" }))).toEqual({ lang: "en-CA", classes: [] });
    expect(run(JSON.stringify({ language: "es", theme: "system" }))).toEqual({ lang: "es", classes: [] });
  });

  it("does not throw when storage is unavailable", () => {
    const html = { lang: "en-CA", classList: { add: () => undefined } };
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
    };
    expect(() =>
      new Function("localStorage", "document", PREFERENCES_SCRIPT)(broken, { documentElement: html }),
    ).not.toThrow();
    expect(html.lang).toBe("en-CA");
  });
});
