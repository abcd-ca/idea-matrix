import Papa from "papaparse";
import { blankIdea, type Clock } from "./document";
import { potential, score } from "./formulas";
import {
  CRITERIA,
  STAGES,
  type Criterion,
  type Idea,
  type MatrixDocument,
  type Stage,
} from "./schema";

/**
 * CSV columns, matching the original spreadsheet template so a sheet export
 * imports straight in. Import ignores Potential and Score (they are computed)
 * and tolerates missing or extra columns.
 */
export const CSV_COLUMNS = [
  "Idea",
  "Description",
  "Stage",
  "Riskiest assumption",
  "Reach",
  "Impact",
  "Profitability",
  "Vision",
  "Ease",
  "Confidence",
  "Potential",
  "Score",
  "Parked / killed because",
] as const;

const CRITERION_COLUMN: Record<Criterion, string> = {
  reach: "Reach",
  impact: "Impact",
  profitability: "Profitability",
  vision: "Vision",
  ease: "Ease",
};

function normaliseHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

function pick(row: Record<string, string>, column: string): string {
  const want = normaliseHeader(column);
  for (const key of Object.keys(row)) {
    if (normaliseHeader(key) === want) return (row[key] ?? "").trim();
  }
  return "";
}

function parseScore(text: string, min: number): number | null {
  if (text === "") return null;
  const n = Number(text);
  if (!Number.isInteger(n) || n < min || n > 5) return null;
  return n;
}

function parseStage(text: string): Stage {
  const want = normaliseHeader(text);
  return STAGES.find((s) => normaliseHeader(s) === want) ?? "Backlog";
}

export interface CsvImportResult {
  ideas: Idea[];
  skipped: number;
  warnings: string[];
}

/**
 * Turn CSV text into new ideas. Every row becomes a fresh idea with a new id;
 * Confidence is capped at 2 because an import carries no evidence log.
 */
export function importCsv(text: string, clock?: Clock): CsvImportResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h: string) => h.trim(),
  });
  const warnings: string[] = [];
  for (const err of parsed.errors.slice(0, 5)) {
    warnings.push(`Row ${err.row ?? "?"}: ${err.message}`);
  }
  const ideas: Idea[] = [];
  let skipped = 0;
  for (const row of parsed.data) {
    const name = pick(row, "Idea");
    if (name === "") {
      skipped += 1;
      continue;
    }
    const idea = blankIdea(name, clock);
    idea.description = pick(row, "Description");
    idea.stage = parseStage(pick(row, "Stage"));
    idea.riskiestAssumption = pick(row, "Riskiest assumption");
    for (const key of CRITERIA) {
      idea.scores[key] = parseScore(pick(row, CRITERION_COLUMN[key]), key === "profitability" ? 0 : 1);
    }
    const confidence = parseScore(pick(row, "Confidence"), 1) ?? 1;
    if (confidence > 2) {
      warnings.push(`"${name}": Confidence ${confidence} was lowered to 2 because an import has no evidence log. Add evidence entries to raise it.`);
    }
    idea.confidence = Math.min(confidence, 2);
    idea.parkedReason = pick(row, "Parked / killed because");
    if (idea.stage === "Parked" && idea.parkedReason === "") {
      idea.parkedReason = "Parked before import; no reason recorded.";
    }
    if (idea.stage !== "Parked") idea.parkedReason = "";
    ideas.push(idea);
  }
  return { ideas, skipped, warnings };
}

export function exportCsv(doc: MatrixDocument): string {
  const rows = doc.ideas.map((idea) => {
    const p = potential(idea.scores);
    const s = score(p, idea.confidence);
    return {
      Idea: idea.name,
      Description: idea.description,
      Stage: idea.stage,
      "Riskiest assumption": idea.riskiestAssumption,
      Reach: idea.scores.reach ?? "",
      Impact: idea.scores.impact ?? "",
      Profitability: idea.scores.profitability ?? "",
      Vision: idea.scores.vision ?? "",
      Ease: idea.scores.ease ?? "",
      Confidence: idea.confidence,
      Potential: p ?? "",
      Score: s ?? "",
      "Parked / killed because": idea.parkedReason,
    };
  });
  // escapeFormulae stops a cell starting with = + - @ from running as a formula in a spreadsheet.
  return Papa.unparse(rows, { columns: [...CSV_COLUMNS], newline: "\n", escapeFormulae: true }) + "\n";
}

