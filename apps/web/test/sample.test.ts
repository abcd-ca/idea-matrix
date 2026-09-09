import { SAMPLE_TEXT, parseDocument, sampleDocument, serializeDocument, type SampleText } from "@idea-matrix/core";
import { describe, expect, it } from "vitest";
import { i18n, resources, sampleText } from "../src/lib/i18n";
import { LANGUAGES } from "../src/lib/preferences";

const clock = () => new Date("2026-03-01T12:00:00Z");

describe("the example ideas in every language", () => {
  const english = sampleDocument(clock);

  for (const language of LANGUAGES) {
    it(`${language}: same ideas, numbers and dates as the English, in that language's words`, () => {
      const t = i18n.getFixedT(language);
      const doc = sampleDocument(clock, sampleText(t));

      // The words are a translation, everything else is untouched, so the
      // tests and the MCP server keep finding "sample-rink" wherever it was.
      const bones = ({
        id,
        stage,
        scores,
        confidence,
        createdAt,
        updatedAt,
        evidence,
      }: (typeof doc.ideas)[number]) => ({
        id,
        stage,
        scores,
        confidence,
        createdAt,
        updatedAt,
        evidence: evidence.map(({ id, date }) => ({ id, date })),
      });
      expect(doc.ideas.map(bones)).toEqual(english.ideas.map(bones));

      // No key came back as its own name, and the result is a valid document.
      const words = JSON.stringify(doc);
      expect(words).not.toMatch(/ideas\.\w+\./);
      expect(parseDocument(serializeDocument(doc))).toEqual(doc);
    });
  }

  it("en-CA is core's English, en-US differs only in spelling", () => {
    expect(sampleDocument(clock, sampleText(i18n.getFixedT("en-CA")))).toEqual(english);
    const us = sampleDocument(clock, sampleText(i18n.getFixedT("en-US")));
    expect(us.ideas.find((i) => i.id === "sample-snow")?.name).toBe("Neighborhood snow-clearing roster");
    expect(us.ideas.find((i) => i.id === "sample-rink")).toEqual(english.ideas.find((i) => i.id === "sample-rink"));
  });

  it("full translations translate every idea and field", () => {
    for (const language of ["fr-CA", "es"] as const) {
      const sample: SampleText = resources[language].sample;
      expect(sample.name).not.toBe(SAMPLE_TEXT.name);
      for (const [key, idea] of Object.entries(SAMPLE_TEXT.ideas)) {
        const translated = sample.ideas[key as keyof SampleText["ideas"]];
        expect(Object.keys(translated).sort()).toEqual(Object.keys(idea).sort());
        expect(translated.name).not.toBe(idea.name);
        expect(translated.description).not.toBe(idea.description);
        for (const entry of Object.keys(idea.evidence ?? {})) {
          expect(translated.evidence?.[entry]).toBeDefined();
        }
      }
    }
  });
});
