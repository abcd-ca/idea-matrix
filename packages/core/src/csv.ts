import Papa from "papaparse";
import { CSV_COLUMN_KEYS, EXPORT_TEXT, type CsvColumnKey, type ExportText } from "./export-text";
import { potential, score } from "./formulas";
import type { MatrixDocument } from "./schema";

/**
 * CSV columns, one row per idea, for reading in a spreadsheet. The evidence
 * log has no column: the file itself is the only complete copy of a matrix.
 */
export const CSV_COLUMNS = CSV_COLUMN_KEYS.map((key) => EXPORT_TEXT.column[key]);

/** The CSV, in English or in the language of `text` (headers and stage names). */
export function exportCsv(doc: MatrixDocument, text: ExportText = EXPORT_TEXT): string {
  const columns = CSV_COLUMN_KEYS.map((key) => text.column[key]);
  const rows = doc.ideas.map((idea) => {
    const p = potential(idea.scores);
    const s = score(p, idea.confidence);
    const cells: Record<CsvColumnKey, string | number> = {
      idea: idea.name,
      description: idea.description,
      stage: text.stageName[idea.stage],
      riskiestAssumption: idea.riskiestAssumption,
      reach: idea.scores.reach ?? "",
      impact: idea.scores.impact ?? "",
      profitability: idea.scores.profitability ?? "",
      vision: idea.scores.vision ?? "",
      ease: idea.scores.ease ?? "",
      confidence: idea.confidence,
      potential: p ?? "",
      score: s ?? "",
      parkedReason: idea.parkedReason,
    };
    return Object.fromEntries(CSV_COLUMN_KEYS.map((key) => [text.column[key], cells[key]]));
  });
  // escapeFormulae stops a cell starting with = + - @ from running as a formula in a spreadsheet.
  return Papa.unparse(rows, { columns, newline: "\n", escapeFormulae: true }) + "\n";
}
