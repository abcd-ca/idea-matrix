import { BANDS, band, potential, score } from "./formulas";
import { CONFIDENCE_INFO, CRITERION_INFO } from "./scales";
import { CRITERIA, type Idea, type MatrixDocument } from "./schema";

function line(label: string, value: string): string {
  return value.trim() === "" ? "" : `**${label}:** ${value.trim()}\n\n`;
}

function scoreLine(idea: Idea): string {
  return CRITERIA.map((key) => {
    const v = idea.scores[key];
    const meaning = v === null ? "not scored" : (CRITERION_INFO[key].levels[v] ?? "");
    return `- ${CRITERION_INFO[key].label}: ${v ?? "–"}${meaning ? ` (${meaning})` : ""}`;
  }).join("\n");
}

export function ideaToMarkdown(idea: Idea): string {
  const p = potential(idea.scores);
  const s = score(p, idea.confidence);
  const pBand = band(p);
  const sBand = band(s);
  let out = `## ${idea.name}\n\n`;
  out += `**Stage:** ${idea.stage}\n\n`;
  out += line("Description", idea.description);
  out += line("Riskiest assumption", idea.riskiestAssumption);
  out += `**Scores**\n\n${scoreLine(idea)}\n`;
  out += `- Confidence: ${idea.confidence} (${CONFIDENCE_INFO.levels[idea.confidence]})\n\n`;
  out += `**Potential:** ${p ?? "needs all five scores"}${pBand ? ` (${BANDS[pBand].advice})` : ""}  \n`;
  out += `**Score:** ${s ?? "–"}${sBand ? ` (${BANDS[sBand].advice})` : ""}\n\n`;
  if (idea.stage === "Parked") out += line("Parked because", idea.parkedReason);
  if (idea.evidence.length > 0) {
    out += `**Evidence**\n\n`;
    for (const e of idea.evidence) {
      out += `- ${e.date} · ${e.who}`;
      if (e.whatTheyDoNow.trim()) out += `\n  - What they do now: ${e.whatTheyDoNow.trim()}`;
      if (e.commitment.trim()) out += `\n  - Commitment: ${e.commitment.trim()}`;
      out += "\n";
    }
    out += "\n";
  }
  return out;
}

export function exportMarkdown(doc: MatrixDocument): string {
  const active = doc.ideas.filter((i) => i.stage !== "Parked");
  const parked = doc.ideas.filter((i) => i.stage === "Parked");
  const byScore = (a: Idea, b: Idea) =>
    (score(potential(b.scores), b.confidence) ?? -1) - (score(potential(a.scores), a.confidence) ?? -1);
  let out = `# ${doc.name}\n\n`;
  out += `Exported ${new Date(doc.updatedAt).toISOString().slice(0, 10)} from Idea Matrix. ${doc.ideas.length} ideas.\n\n`;
  out += `Potential is the average of five 1 to 5 scores scaled to 100. Score is Potential × Confidence ÷ 5, so it only rises with evidence.\n\n`;
  for (const idea of [...active].sort(byScore)) out += ideaToMarkdown(idea);
  if (parked.length > 0) {
    out += `# Parked\n\n`;
    for (const idea of parked) out += ideaToMarkdown(idea);
  }
  return out;
}
