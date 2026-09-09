import { describe, expect, it } from "vitest";
import Papa from "papaparse";
import { exportCsv } from "../src/csv";
import { exportMarkdown } from "../src/markdown";
import { sampleDocument } from "../src/sample";
import { emptyDocument } from "../src/document";

const clock = () => new Date("2026-09-04T10:00:00.000Z");

describe("exportCsv", () => {
  it("writes the template columns and one row per idea", () => {
    const doc = sampleDocument(clock);
    const csv = exportCsv(doc);
    expect(csv.split("\n")[0]).toBe(
      "Idea,Description,Stage,Riskiest assumption,Reach,Impact,Profitability,Vision,Ease,Confidence,Potential,Score,Parked / killed because",
    );
    const rows = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true }).data;
    expect(rows.map((r) => r.Idea)).toEqual(doc.ideas.map((i) => i.name));
    expect(rows[0].Reach).toBe(String(doc.ideas[0].scores.reach));
    expect(rows[0].Description).toBe(doc.ideas[0].description);
  });
  it("neutralises formula injection in text cells", () => {
    const doc = emptyDocument("t", clock);
    doc.ideas.push({
      ...sampleDocument(clock).ideas[3],
      id: "evil",
      name: '=HYPERLINK("http://x","click")',
      description: "+1234",
    });
    const csv = exportCsv(doc);
    const line = csv.split("\n")[1];
    expect(line.startsWith("\"'=HYPERLINK") || line.startsWith("\"'=")).toBe(true);
    expect(line).toContain("'+1234");
  });
});

describe("exportMarkdown", () => {
  it("writes one section per idea with scores, potential, score and evidence", () => {
    const md = exportMarkdown(sampleDocument(clock));
    expect(md).toContain("# Example ideas");
    expect(md).toContain("## Pop-up sauna bookings");
    expect(md).toContain("**Potential:** 68 (worth a customer conversation)");
    expect(md).toContain("**Score:** 54 (worth a look)");
    expect(md).toContain("- Confidence: 4 (several conversations that all point the same way)");
    expect(md).toContain("Cold-dip group organizer");
    expect(md).toContain("# Parked");
    expect(md).toContain("**Parked because:** Three existing apps");
    expect(md).toContain("**Potential:** needs all five scores");
  });
});
