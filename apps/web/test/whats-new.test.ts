import { describe, expect, it } from "vitest";
import * as enCA from "../src/locales/en-CA";
import * as es from "../src/locales/es";
import * as frCA from "../src/locales/fr-CA";
import {
  WHATS_NEW,
  WHATS_NEW_LIMIT,
  latestId,
  seenIdAtStart,
  shownEntries,
  unseenEntries,
  type WhatsNewEntry,
} from "../src/lib/whats-new";

const entry = (id: string, date = "2026-01-01"): WhatsNewEntry => ({ id, date });
const SIX = ["f", "e", "d", "c", "b", "a"].map((id) => entry(id));

describe("the feed", () => {
  it("is newest first with ids that are unique and dated", () => {
    const ids = WHATS_NEW.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of WHATS_NEW) {
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e.id.startsWith(e.date)).toBe(true);
    }
    for (let i = 1; i < WHATS_NEW.length; i++) expect(WHATS_NEW[i - 1].date >= WHATS_NEW[i].date).toBe(true);
  });

  it("has a title and one sentence for every entry in every full locale", () => {
    for (const locale of [enCA, frCA, es]) {
      const entries = locale.whatsnew.entries as Record<string, { title: string; text: string }>;
      for (const e of WHATS_NEW) {
        expect(entries[e.id]?.title, `${e.id} title`).toBeTruthy();
        expect(entries[e.id]?.text, `${e.id} text`).toBeTruthy();
      }
      // Nothing left over from a pruned entry.
      expect(Object.keys(entries).sort()).toEqual(WHATS_NEW.map((e) => e.id).sort());
    }
  });
});

describe("shownEntries", () => {
  it("keeps the newest, up to the limit", () => {
    expect(WHATS_NEW_LIMIT).toBe(5);
    expect(shownEntries(SIX).map((e) => e.id)).toEqual(["f", "e", "d", "c", "b"]);
    expect(shownEntries(SIX.slice(0, 2)).map((e) => e.id)).toEqual(["f", "e"]);
    expect(shownEntries([])).toEqual([]);
  });
});

describe("latestId", () => {
  it("is the first entry, or nothing", () => {
    expect(latestId(SIX)).toBe("f");
    expect(latestId([])).toBeUndefined();
    expect(latestId(WHATS_NEW)).toBe(WHATS_NEW[0].id);
  });
});

describe("unseenEntries", () => {
  it("returns the entries newer than the seen one", () => {
    expect(unseenEntries(SIX, "d").map((e) => e.id)).toEqual(["f", "e"]);
    expect(unseenEntries(SIX, "e").map((e) => e.id)).toEqual(["f"]);
    expect(unseenEntries(SIX, "a").map((e) => e.id)).toEqual(["f", "e", "d", "c", "b"]);
  });

  it("returns nothing once the latest has been seen", () => {
    expect(unseenEntries(SIX, "f")).toEqual([]);
  });

  it("returns everything when there is no marker or the marker is unknown", () => {
    expect(unseenEntries(SIX, undefined)).toEqual(SIX);
    expect(unseenEntries(SIX, "pruned-long-ago")).toEqual(SIX);
    expect(unseenEntries([], "f")).toEqual([]);
  });

  it("treats a marker older than the shown window as all unread", () => {
    expect(unseenEntries(shownEntries(SIX), "a")).toHaveLength(5);
  });
});

describe("seenIdAtStart", () => {
  it("marks the latest seen on a first run: nothing remembered, no marker", () => {
    expect(seenIdAtStart(SIX, { rememberedFile: false, seenId: undefined })).toBe("f");
    expect(seenIdAtStart([], { rememberedFile: false, seenId: undefined })).toBeUndefined();
  });

  it("leaves a remembered file with no marker alone, so an existing user sees everything once", () => {
    expect(seenIdAtStart(SIX, { rememberedFile: true, seenId: undefined })).toBeUndefined();
  });

  it("keeps an existing marker whether or not a file is remembered", () => {
    expect(seenIdAtStart(SIX, { rememberedFile: true, seenId: "c" })).toBe("c");
    expect(seenIdAtStart(SIX, { rememberedFile: false, seenId: "c" })).toBe("c");
  });
});
