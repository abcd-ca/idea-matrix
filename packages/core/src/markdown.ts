import { EXPORT_TEXT, fill, type ExportText } from "./export-text";
import { band, potential, score } from "./formulas";
import { CRITERIA, type Idea, type MatrixDocument } from "./schema";

function line(label: string, value: string): string {
  return value.trim() === "" ? "" : `**${label}:** ${value.trim()}\n\n`;
}

function scoreLine(idea: Idea, text: ExportText): string {
  return CRITERIA.map((key) => {
    const v = idea.scores[key];
    const meaning = v === null ? text.markdown.notScored : (text.criterion[key].levels[v] ?? "");
    return `- ${text.criterion[key].label}: ${v ?? "–"}${meaning ? ` (${meaning})` : ""}`;
  }).join("\n");
}

/** One idea as a Markdown section, in English or in the language of `text`. */
export function ideaToMarkdown(idea: Idea, text: ExportText = EXPORT_TEXT): string {
  const md = text.markdown;
  const p = potential(idea.scores);
  const s = score(p, idea.confidence);
  const pBand = band(p);
  const sBand = band(s);
  let out = `## ${idea.name}\n\n`;
  out += `**${md.stage}:** ${text.stageName[idea.stage]}\n\n`;
  out += line(md.description, idea.description);
  out += line(md.riskiestAssumption, idea.riskiestAssumption);
  out += `**${md.scores}**\n\n${scoreLine(idea, text)}\n`;
  out += `- ${md.confidence}: ${idea.confidence} (${text.confidenceLevels[idea.confidence]})\n\n`;
  out += `**${md.potential}:** ${p ?? md.needsAllFiveScores}${pBand ? ` (${text.bandAdvice[pBand]})` : ""}  \n`;
  out += `**${md.score}:** ${s ?? "–"}${sBand ? ` (${text.bandAdvice[sBand]})` : ""}\n\n`;
  if (idea.stage === "Parked") out += line(md.parkedBecause, idea.parkedReason);
  if (idea.evidence.length > 0) {
    out += `**${md.evidence}**\n\n`;
    for (const e of idea.evidence) {
      out += `- ${e.date} · ${e.who}`;
      if (e.whatTheyDoNow.trim()) out += `\n  - ${md.whatTheyDoNow}: ${e.whatTheyDoNow.trim()}`;
      if (e.commitment.trim()) out += `\n  - ${md.commitment}: ${e.commitment.trim()}`;
      out += "\n";
    }
    out += "\n";
  }
  return out;
}

/** The whole matrix as Markdown, in English or in the language of `text`. */
export function exportMarkdown(doc: MatrixDocument, text: ExportText = EXPORT_TEXT): string {
  const md = text.markdown;
  const active = doc.ideas.filter((i) => i.stage !== "Parked");
  const parked = doc.ideas.filter((i) => i.stage === "Parked");
  const byScore = (a: Idea, b: Idea) =>
    (score(potential(b.scores), b.confidence) ?? -1) - (score(potential(a.scores), a.confidence) ?? -1);
  let out = `# ${doc.name}\n\n`;
  out += `${fill(md.exported, { date: new Date(doc.updatedAt).toISOString().slice(0, 10), count: doc.ideas.length })}\n\n`;
  out += `${md.formula}\n\n`;
  for (const idea of [...active].sort(byScore)) out += ideaToMarkdown(idea, text);
  if (parked.length > 0) {
    out += `# ${md.parked}\n\n`;
    for (const idea of parked) out += ideaToMarkdown(idea, text);
  }
  return out;
}
