import {
  BANDS,
  CONFIDENCE_GATE_SUMMARY,
  CONFIDENCE_INFO,
  CRITERIA,
  CRITERION_INFO,
  FORMULA_INFO,
  STAGES,
  STAGE_INFO,
  confidenceGateMessage,
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
export const NAMESPACES = ["common", "setup", "matrix", "idea", "settings", "tour", "privacy", "core"] as const;
export type Namespace = (typeof NAMESPACES)[number];

/**
 * The `core` namespace holds the English text that lives in @idea-matrix/core:
 * scale labels and questions, the level meanings, the stage descriptions, the
 * formulas, the band advice and the Confidence gate sentences. Core is the
 * source of that English and is not changed to take a locale; the MCP server
 * and CLI keep speaking it. For en-CA the namespace is built here from core's
 * own constants, so the app's English can never drift from core's, and the
 * other languages translate the same keys in their core.json.
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
  };
}

export const resources = {
  "en-CA": { ...enCA, core: coreEnglish() },
  "en-US": enUS,
  "fr-CA": frCA,
  es,
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
