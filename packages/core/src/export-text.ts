import { BANDS, type Band } from "./formulas";
import { CONFIDENCE_INFO, CRITERION_INFO } from "./scales";
import { CRITERIA, STAGES, type Criterion, type Stage } from "./schema";

/**
 * The words in a Markdown or CSV export. Core keeps the English, as it does
 * for the scales and stages; the web app hands the exporters a translation
 * assembled from its `core` namespace so a download reads in the reader's
 * language. The MCP server and CLI use the English as is.
 */
export const CSV_COLUMN_KEYS = [
  "idea",
  "description",
  "stage",
  "riskiestAssumption",
  ...CRITERIA,
  "confidence",
  "potential",
  "score",
  "parkedReason",
] as const;
export type CsvColumnKey = (typeof CSV_COLUMN_KEYS)[number];

/** The labels only: everything else the exporters need is already a core constant. */
export interface ExportLabels {
  column: Record<CsvColumnKey, string>;
  markdown: {
    stage: string;
    description: string;
    riskiestAssumption: string;
    scores: string;
    confidence: string;
    notScored: string;
    potential: string;
    score: string;
    needsAllFiveScores: string;
    parkedBecause: string;
    evidence: string;
    whatTheyDoNow: string;
    commitment: string;
    /** `{{date}}` and `{{count}}` are filled in. */
    exported: string;
    formula: string;
    parked: string;
  };
}

export interface ExportText extends ExportLabels {
  stageName: Record<Stage, string>;
  criterion: Record<Criterion, { label: string; levels: Record<number, string> }>;
  confidenceLevels: Record<number, string>;
  bandAdvice: Record<Band, string>;
}

export const EXPORT_LABELS: ExportLabels = {
  column: {
    idea: "Idea",
    description: "Description",
    stage: "Stage",
    riskiestAssumption: "Riskiest assumption",
    reach: "Reach",
    impact: "Impact",
    profitability: "Profitability",
    vision: "Vision",
    ease: "Ease",
    confidence: "Confidence",
    potential: "Potential",
    score: "Score",
    parkedReason: "Parked / killed because",
  },
  markdown: {
    stage: "Stage",
    description: "Description",
    riskiestAssumption: "Riskiest assumption",
    scores: "Scores",
    confidence: "Confidence",
    notScored: "not scored",
    potential: "Potential",
    score: "Score",
    needsAllFiveScores: "needs all five scores",
    parkedBecause: "Parked because",
    evidence: "Evidence",
    whatTheyDoNow: "What they do now",
    commitment: "Commitment",
    exported: "Exported {{date}} from Idea Matrix. {{count}} ideas.",
    formula:
      "Potential is the average of five 1 to 5 scores scaled to 100. Score is Potential × Confidence ÷ 5, so it only rises with evidence.",
    parked: "Parked",
  },
};

/** The English export text, assembled from core's own constants. */
export const EXPORT_TEXT: ExportText = {
  ...EXPORT_LABELS,
  stageName: Object.fromEntries(STAGES.map((s) => [s, s])) as Record<Stage, string>,
  criterion: Object.fromEntries(
    CRITERIA.map((key) => [key, { label: CRITERION_INFO[key].label, levels: CRITERION_INFO[key].levels }]),
  ) as ExportText["criterion"],
  confidenceLevels: CONFIDENCE_INFO.levels,
  bandAdvice: Object.fromEntries((Object.keys(BANDS) as Band[]).map((b) => [b, BANDS[b].advice])) as Record<
    Band,
    string
  >,
};

/** Fill `{{name}}` placeholders in a label. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (m, key: string) => (key in values ? String(values[key]) : m));
}
