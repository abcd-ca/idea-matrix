import { CSV_COLUMNS, EXPORT_TEXT, exportCsv, exportMarkdown, sampleDocument } from "@idea-matrix/core";
import { describe, expect, it } from "vitest";
import { exportText, i18n, sampleText } from "../src/lib/i18n";
import { LANGUAGES } from "../src/lib/preferences";

const clock = () => new Date("2026-03-01T12:00:00Z");

describe("exports in every language", () => {
  it("en-CA is core's English, word for word", () => {
    const t = i18n.getFixedT("en-CA");
    expect(exportText(t)).toEqual(EXPORT_TEXT);
    const doc = sampleDocument(clock);
    expect(exportMarkdown(doc, exportText(t))).toBe(exportMarkdown(doc));
    expect(exportCsv(doc, exportText(t))).toBe(exportCsv(doc));
  });

  for (const language of LANGUAGES) {
    it(`${language}: the labels, stage names and placeholders come out in that language`, () => {
      const t = i18n.getFixedT(language);
      const text = exportText(t);
      const doc = sampleDocument(clock, sampleText(t));
      const md = exportMarkdown(doc, text);
      const csv = exportCsv(doc, text);

      // The placeholders were filled by core, not left behind or eaten by i18next.
      expect(md).toContain(`2026-03-01`);
      expect(md).toContain(`${doc.ideas.length} `);
      expect(md).not.toContain("{{");
      expect(md).toContain(`# ${text.markdown.parked}`);
      expect(md).toContain(`**${text.markdown.stage}:** ${text.stageName.Validated}`);
      expect(csv.split("\n")[0]).toBe(Object.values(text.column).join(","));
      if (language !== "en-CA" && language !== "en-US") {
        expect(md).not.toContain("**Stage:**");
        expect(csv.split("\n")[0]).not.toBe(CSV_COLUMNS.join(","));
        expect(csv).toContain(text.stageName.Parked);
      }
    });
  }
});
