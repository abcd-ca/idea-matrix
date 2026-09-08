import { describe, expect, it } from "vitest";
import { exportCsv, importCsv } from "../src/csv";
import { exportMarkdown } from "../src/markdown";
import { sampleDocument } from "../src/sample";
import { emptyDocument } from "../src/document";

const clock = () => new Date("2026-09-04T10:00:00.000Z");

describe("importCsv", () => {
  it("reads the spreadsheet template columns, ignoring computed ones", () => {
    const csv = [
      "Idea,Description,Stage,Riskiest assumption,Reach,Impact,Profitability,Vision,Ease,Confidence,Potential,Score,Parked / killed because",
      '"Thing one","A ""quoted"" description, with a comma",Exploring,People do X today,3,4,0,5,2,1,56,11,',
      "Thing two,,parked,,,,,,,,,,Nobody wanted it",
      ",,Backlog,,,,,,,,,,",
    ].join("\n");
    const result = importCsv(csv, clock);
    expect(result.ideas).toHaveLength(2);
    expect(result.skipped).toBe(1);
    const one = result.ideas[0];
    expect(one.name).toBe("Thing one");
    expect(one.description).toBe('A "quoted" description, with a comma');
    expect(one.stage).toBe("Exploring");
    expect(one.scores).toEqual({ reach: 3, impact: 4, profitability: 0, vision: 5, ease: 2 });
    expect(one.confidence).toBe(1);
    const two = result.ideas[1];
    expect(two.stage).toBe("Parked");
    expect(two.parkedReason).toBe("Nobody wanted it");
    expect(two.scores.reach).toBeNull();
  });
  it("caps imported Confidence at 2 and warns", () => {
    const csv = "Idea,Confidence\nBold claim,5\n";
    const result = importCsv(csv, clock);
    expect(result.ideas[0].confidence).toBe(2);
    expect(result.warnings[0]).toMatch(/lowered to 2/);
  });
  it("tolerates odd headers, out-of-range and junk values", () => {
    const csv = "idea , REACH ,Ease,Stage\nX,9,abc,Nonsense\n";
    const result = importCsv(csv, clock);
    expect(result.ideas[0].name).toBe("X");
    expect(result.ideas[0].scores.reach).toBeNull();
    expect(result.ideas[0].scores.ease).toBeNull();
    expect(result.ideas[0].stage).toBe("Backlog");
  });
});

describe("exportCsv", () => {
  it("round-trips through importCsv for the fields it carries", () => {
    const doc = sampleDocument(clock);
    const csv = exportCsv(doc);
    expect(csv.split("\n")[0]).toBe(
      "Idea,Description,Stage,Riskiest assumption,Reach,Impact,Profitability,Vision,Ease,Confidence,Potential,Score,Parked / killed because",
    );
    const back = importCsv(csv, clock);
    expect(back.ideas.map((i) => i.name)).toEqual(doc.ideas.map((i) => i.name));
    expect(back.ideas[0].scores).toEqual(doc.ideas[0].scores);
    expect(back.ideas[0].description).toBe(doc.ideas[0].description);
  });
  it("neutralises formula injection in text cells", () => {
    const doc = emptyDocument("t", clock);
    doc.ideas.push({
      ...sampleDocument(clock).ideas[3],
      id: "evil",
      name: "=HYPERLINK(\"http://x\",\"click\")",
      description: "+1234",
    });
    const csv = exportCsv(doc);
    const line = csv.split("\n")[1];
    expect(line.startsWith('"\'=HYPERLINK') || line.startsWith("\"'=")).toBe(true);
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
