import {
  BANDS,
  CONFIDENCE_GATE_SUMMARY,
  CONFIDENCE_INFO,
  CRITERIA,
  CRITERION_INFO,
  EXPORT_LABELS,
  FORMULA_INFO,
  SAMPLE_IDEA_KEYS,
  SAMPLE_TEXT,
  STAGES,
  STAGE_INFO,
  confidenceGateMessage,
  type Band,
  type CsvColumnKey,
  type ExportText,
  type SampleIdeaText,
  type SampleText,
  type Stage,
} from "@idea-matrix/core";
import i18next, { type TFunction } from "i18next";
import { initReactI18next } from "react-i18next";
import * as enCA from "@/locales/en-CA";
import * as enUS from "@/locales/en-US";
import * as es from "@/locales/es";
import * as frCA from "@/locales/fr-CA";
import { DEFAULT_LANGUAGE, LANGUAGES } from "./preferences";

/**
 * Every string the app shows comes from the locale files under src/locales,
 * bundled into the page at build time: nothing is fetched. en-CA is the
 * source of truth; the other languages are translations of it, and any key
 * they lack falls back to the en-CA text.
 *
 * The app boots in en-CA so the first client render matches the prerendered
 * HTML; the preferences store switches to the device's language right after
 * hydration (see preferences-store.ts).
 */
export const NAMESPACES = [
  "common",
  "setup",
  "matrix",
  "idea",
  "settings",
  "tour",
  "privacy",
  "core",
  "sample",
] as const;
export type Namespace = (typeof NAMESPACES)[number];

/**
 * The `core` namespace holds the English text that lives in @idea-matrix/core:
 * scale labels and questions, the level meanings, the stage descriptions, the
 * formulas, the band advice and the Confidence gate sentences. Core is the
 * source of that English and is not changed to take a locale; the MCP server
 * and CLI keep speaking it. For en-CA the namespace is built here from core's
 * own constants, so the app's English can never drift from core's, and the
 * other languages translate the same keys in their core.json.
 *
 * The `sample` namespace is the same arrangement for the words of the nine
 * example ideas: core's SAMPLE_TEXT for en-CA, a sample.json elsewhere, and
 * `sampleText` below puts the current language's words back into the shape
 * core's `sampleDocument` takes.
 */
function coreEnglish() {
  const criterion: Record<string, unknown> = {};
  for (const key of CRITERIA) criterion[key] = CRITERION_INFO[key];
  const stage: Record<string, string> = {};
  const stageName: Record<string, string> = {};
  for (const s of STAGES) {
    stage[s] = STAGE_INFO[s];
    stageName[s] = s;
  }
  const rules: Record<string, string> = {};
  CONFIDENCE_INFO.rules.forEach((rule, i) => {
    rules[String(i)] = rule;
  });
  return {
    criterion,
    confidence: {
      label: CONFIDENCE_INFO.label,
      question: CONFIDENCE_INFO.question,
      levels: CONFIDENCE_INFO.levels,
      rules,
    },
    gateSummary: CONFIDENCE_GATE_SUMMARY,
    gate: { 2: confidenceGateMessage(2), 4: confidenceGateMessage(4) },
    stage,
    stageName,
    formula: FORMULA_INFO,
    band: BANDS,
    export: EXPORT_LABELS,
  };
}

export const resources = {
  "en-CA": { ...enCA, core: coreEnglish(), sample: SAMPLE_TEXT },
  "en-US": enUS,
  // `satisfies` makes the typecheck catch a full translation that lacks an idea or a field.
  "fr-CA": { ...frCA, sample: frCA.sample satisfies SampleText },
  es: { ...es, sample: es.sample satisfies SampleText },
};

export const i18n = i18next;

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...LANGUAGES],
    load: "currentOnly",
    ns: [...NAMESPACES],
    defaultNS: "common",
    // React escapes for us; escaping here would show "&#39;" in the page.
    interpolation: { escapeValue: false },
    // Resources are bundled, so init is synchronous and nothing suspends.
    initAsync: false,
    react: {
      useSuspense: false,
      // <Trans> renders only the tags a component is given by name. Nothing
      // in a translation, and nothing in an interpolated value, becomes an
      // element on its own; user text always goes in as a component child.
      transSupportBasicHtmlNodes: false,
      transKeepBasicHtmlNodesFor: [],
    },
  });
}

/** A `levels` record from the core namespace, typed the way the controls want it. */
export function coreLevels(t: TFunction, key: string): Record<number, string> {
  return t(key, { ns: "core", returnObjects: true }) as unknown as Record<number, string>;
}

/** The three Mom Test rules, in order. */
export function coreRules(t: TFunction): string[] {
  return CONFIDENCE_INFO.rules.map((_, i) => t(`confidence.rules.${i}`, { ns: "core" }));
}

/**
 * The words of the example ideas in the current language, looked up one key
 * at a time so a language that translates only some of them (en-US) falls
 * back to en-CA for the rest, the way every other string does.
 */
export function sampleText(t: TFunction): SampleText {
  const word = (key: string) => t(key, { ns: "sample" });
  const ideas = {} as SampleText["ideas"];
  for (const key of SAMPLE_IDEA_KEYS) {
    const english = SAMPLE_TEXT.ideas[key];
    const idea: SampleIdeaText = {
      name: word(`ideas.${key}.name`),
      description: word(`ideas.${key}.description`),
    };
    if (english.riskiestAssumption !== undefined) idea.riskiestAssumption = word(`ideas.${key}.riskiestAssumption`);
    if (english.parkedReason !== undefined) idea.parkedReason = word(`ideas.${key}.parkedReason`);
    if (english.evidence) {
      idea.evidence = {};
      for (const entry of Object.keys(english.evidence)) {
        idea.evidence[entry] = {
          who: word(`ideas.${key}.evidence.${entry}.who`),
          whatTheyDoNow: word(`ideas.${key}.evidence.${entry}.whatTheyDoNow`),
          commitment: word(`ideas.${key}.evidence.${entry}.commitment`),
        };
      }
    }
    ideas[key] = idea;
  }
  return { name: word("name"), ideas };
}

/**
 * The words of a Markdown or CSV export in the current language: the labels
 * from the `core` namespace's `export` block plus the stage names, scale
 * labels and levels, Confidence levels and band advice it already holds.
 */
export function exportText(t: TFunction): ExportText {
  const word = (key: string) => t(key, { ns: "core" });
  const column = {} as ExportText["column"];
  for (const key of Object.keys(EXPORT_LABELS.column) as CsvColumnKey[]) column[key] = word(`export.column.${key}`);
  const markdown = {} as ExportText["markdown"];
  for (const key of Object.keys(EXPORT_LABELS.markdown) as (keyof ExportText["markdown"])[]) {
    // Placeholders stay for core to fill: i18next would otherwise want the values now.
    markdown[key] = t(`export.markdown.${key}`, { ns: "core", interpolation: { skipOnVariables: true } });
  }
  const stageName = {} as Record<Stage, string>;
  for (const s of STAGES) stageName[s] = word(`stageName.${s}`);
  const criterion = {} as ExportText["criterion"];
  for (const key of CRITERIA) {
    criterion[key] = { label: word(`criterion.${key}.label`), levels: coreLevels(t, `criterion.${key}.levels`) };
  }
  const bandAdvice = {} as Record<Band, string>;
  for (const b of Object.keys(BANDS) as Band[]) bandAdvice[b] = word(`band.${b}.advice`);
  return { column, markdown, stageName, criterion, confidenceLevels: coreLevels(t, "confidence.levels"), bandAdvice };
}
