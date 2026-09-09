import Papa from "papaparse";
import { potential, score } from "./formulas";
import type { MatrixDocument } from "./schema";

/**
 * CSV columns, one row per idea, for reading in a spreadsheet. The evidence
 * log has no column: the file itself is the only complete copy of a matrix.
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
