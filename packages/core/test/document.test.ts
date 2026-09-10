import { describe, expect, it } from "vitest";
import {
  addEvidence,
  addIdea,
  deleteIdea,
  DocumentError,
  emptyDocument,
  migrateDocument,
  parkIdea,
  parseDocument,
  removeEvidence,
  serializeDocument,
  unparkIdea,
  updateIdea,
} from "../src/document";
import { sampleDocument } from "../src/sample";
import { SCHEMA_VERSION } from "../src/schema";

const clock = () => new Date("2026-09-04T10:00:00.000Z");

describe("round trip", () => {
  it("serialises and parses the sample document unchanged", () => {
    const doc = sampleDocument(clock);
    const text = serializeDocument(doc);
    expect(parseDocument(text)).toEqual(doc);
  });
  it("escapes quotes, backslashes and unicode in text fields", () => {
    let { doc } = addIdea(emptyDocument("t", clock), 'He said "no" \\ and 🙂 \n newline', clock);
    doc = updateIdea(doc, doc.ideas[0].id, { description: "<script>alert(1)</script> &  " }, clock);
    const back = parseDocument(serializeDocument(doc));
    expect(back.ideas[0].name).toBe('He said "no" \\ and 🙂 \n newline');
    expect(back.ideas[0].description).toBe("<script>alert(1)</script> &  ");
  });
});

describe("parseDocument", () => {
  it("rejects non-JSON", () => {
    expect(() => parseDocument("{ not json")).toThrow(DocumentError);
    try {
      parseDocument("{ not json");
    } catch (e) {
      expect((e as DocumentError).code).toBe("not-json");
    }
  });
  it("rejects a JSON file that is not a matrix", () => {
    expect(() => parseDocument(JSON.stringify({ hello: "world" }))).toThrowError(/not an Idea Matrix file/);
    expect(() => parseDocument(JSON.stringify([1, 2]))).toThrowError(/not an Idea Matrix file/);
  });
  it("rejects a newer schema version", () => {
    const doc = { ...sampleDocument(clock), schemaVersion: SCHEMA_VERSION + 1 };
    expect(() => migrateDocument(doc)).toThrowError(/newer version/);
  });
  it("rejects unknown keys and out-of-range scores", () => {
    const doc = sampleDocument(clock) as unknown as Record<string, unknown>;
    expect(() => migrateDocument({ ...doc, extra: 1 })).toThrow(DocumentError);
    const bad = sampleDocument(clock);
    (bad.ideas[0].scores as { reach: number }).reach = 7;
    expect(() => migrateDocument(bad)).toThrowError(/reach/);
  });
  it("rejects prototype pollution attempts", () => {
    const text =
      '{"type":"ideamatrix","schemaVersion":1,"name":"x","ideas":[],"createdAt":"2026-09-04T10:00:00.000Z","updatedAt":"2026-09-04T10:00:00.000Z","__proto__":{"polluted":true}}';
    expect(() => parseDocument(text)).toThrow(DocumentError);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
  it("rejects a file that is too large", () => {
    const text = "x".repeat(10 * 1024 * 1024 + 1);
    expect(() => parseDocument(text)).toThrowError(/larger/);
  });
});

describe("updateIdea", () => {
  it("applies a partial patch and bumps updatedAt", () => {
    const doc = sampleDocument(clock);
    const later = () => new Date("2026-09-05T10:00:00.000Z");
    const next = updateIdea(doc, "sample-rink", { scores: { reach: 3 } }, later);
    const idea = next.ideas.find((i) => i.id === "sample-rink")!;
    expect(idea.scores).toEqual({ reach: 3, impact: 4, profitability: 2, vision: 5, ease: 4 });
    expect(idea.updatedAt).toBe("2026-09-05T10:00:00.000Z");
    expect(next.updatedAt).toBe("2026-09-05T10:00:00.000Z");
  });
  it("enforces the Confidence gate", () => {
    const doc = sampleDocument(clock);
    // No evidence at all: capped at 2.
    expect(() => updateIdea(doc, "sample-rink", { confidence: 3 }, clock)).toThrowError(/up to 2/);
    // An entry with no behaviour recorded (a compliment) does not help.
    expect(() => updateIdea(doc, "sample-weather", { confidence: 3 }, clock)).toThrowError(/up to 2/);
    // Behaviour recorded but no commitment: capped at 4.
    const { doc: withBehaviour } = addEvidence(
      doc,
      "sample-rink",
      {
        date: "2026-09-04",
        who: "Rink owner",
        whatTheyDoNow: "Checks the ice by hand at midnight.",
        commitment: "",
      },
      clock,
    );
    expect(() => updateIdea(withBehaviour, "sample-rink", { confidence: 4 }, clock)).not.toThrow();
    expect(() => updateIdea(withBehaviour, "sample-rink", { confidence: 5 }, clock)).toThrowError(/up to 4/);
    // A commitment on record allows 5.
    expect(() => updateIdea(doc, "sample-sauna", { confidence: 5 }, clock)).not.toThrow();
  });
  it("rejects unknown fields and managed fields", () => {
    const doc = sampleDocument(clock);
    expect(() => updateIdea(doc, "sample-rink", { nope: 1 } as never, clock)).toThrow();
    expect(() => updateIdea(doc, "sample-rink", { id: "x" } as never, clock)).toThrow();
  });
  it("requires a reason to park and clears it on unpark", () => {
    const doc = sampleDocument(clock);
    expect(() => updateIdea(doc, "sample-rink", { stage: "Parked" }, clock)).toThrowError(/reason/);
    const parked = parkIdea(doc, "sample-rink", "  Nobody has a rink.  ", clock);
    const p = parked.ideas.find((i) => i.id === "sample-rink")!;
    expect(p.stage).toBe("Parked");
    expect(p.parkedReason).toBe("Nobody has a rink.");
    expect(p.scores.reach).toBe(2);
    const back = unparkIdea(parked, "sample-rink", "Exploring", clock);
    const u = back.ideas.find((i) => i.id === "sample-rink")!;
    expect(u.stage).toBe("Exploring");
    expect(u.parkedReason).toBe("");
  });
});

describe("evidence", () => {
  it("adds and removes entries, lowering Confidence when the gate no longer holds", () => {
    const base = sampleDocument(clock);
    const { doc, entryId } = addEvidence(
      base,
      "sample-rink",
      {
        date: "2026-09-04",
        who: "Rink owner",
        whatTheyDoNow: "Checks the ice by hand at midnight.",
        commitment: "",
      },
      clock,
    );
    const raised = updateIdea(doc, "sample-rink", { confidence: 4 }, clock);
    expect(raised.ideas.find((i) => i.id === "sample-rink")!.confidence).toBe(4);
    const removed = removeEvidence(raised, "sample-rink", entryId, clock);
    expect(removed.ideas.find((i) => i.id === "sample-rink")!.confidence).toBe(2);
  });
  it("validates evidence input", () => {
    const base = sampleDocument(clock);
    expect(() =>
      addEvidence(base, "sample-rink", { date: "yesterday", who: "x", whatTheyDoNow: "", commitment: "" }, clock),
    ).toThrow();
  });
});

describe("addIdea and deleteIdea", () => {
  it("adds a blank idea with confidence 1 and deletes by id", () => {
    const { doc, idea } = addIdea(emptyDocument("t", clock), "  New thing ", clock);
    expect(idea.name).toBe("New thing");
    expect(idea.confidence).toBe(1);
    expect(doc.ideas).toHaveLength(1);
    expect(deleteIdea(doc, idea.id, clock).ideas).toHaveLength(0);
    expect(() => deleteIdea(doc, "missing", clock)).toThrow();
  });
});

describe("mergeDocuments", () => {
  const t = (s: string) => () => new Date(s);
  const day = (n: number) => t(`2026-09-0${n}T00:00:00.000Z`);
  /** A matrix with ideas A and B, made on day 1: the base both devices start from. */
  const twoIdeas = () => addIdea(addIdea(emptyDocument("Mine", day(1)), "A", day(1)).doc, "B", day(1)).doc;
  const behaviour = { date: "2026-09-02", who: "A customer", whatTheyDoNow: "Keeps a spreadsheet", commitment: "" };

  it("keeps the newer copy of each idea and every idea from both sides", async () => {
    const { mergeDocuments } = await import("../src/document");
    const base = twoIdeas();
    const [a, b] = base.ideas;
    // This computer edits A later; the other computer edits B earlier and adds C.
    const local = updateIdea(base, a.id, { description: "local A" }, day(3));
    let remote = updateIdea(base, b.id, { description: "remote B" }, day(2));
    remote = addIdea(remote, "C", day(2)).doc;
    const merged = mergeDocuments(local, remote);
    expect(merged.ideas.map((i) => i.name)).toEqual(["A", "B", "C"]);
    expect(merged.ideas[0].description).toBe("local A");
    expect(merged.ideas[1].description).toBe("remote B");
    expect(merged.updatedAt).toBe("2026-09-03T00:00:00.000Z");
    expect(merged.name).toBe("Mine");
  });
  it("takes the name from whichever document was touched last", async () => {
    const { mergeDocuments, renameDocument } = await import("../src/document");
    const base = emptyDocument("Old", day(1));
    const local = renameDocument(base, "Local", day(2));
    const remote = renameDocument(base, "Remote", day(4));
    expect(mergeDocuments(local, remote).name).toBe("Remote");
    expect(mergeDocuments(remote, local).name).toBe("Remote");
  });
  it("with a base, keeps the name only one side changed, whichever document is newer", async () => {
    const { mergeDocuments, renameDocument } = await import("../src/document");
    const base = twoIdeas();
    const local = renameDocument(base, "Renamed here", day(2));
    const remote = updateIdea(base, base.ideas[0].id, { description: "later, elsewhere" }, day(3));
    expect(mergeDocuments(local, remote, base).name).toBe("Renamed here");
    expect(mergeDocuments(remote, local, base).name).toBe("Renamed here");
  });

  it("with a base, keeps a score given on one side and an evidence entry added on the other to the same idea", async () => {
    const { mergeDocuments } = await import("../src/document");
    const base = twoIdeas();
    const id = base.ideas[0].id;
    const local = updateIdea(base, id, { scores: { reach: 4 } }, day(2));
    const remote = addEvidence(base, id, behaviour, day(3)).doc;
    for (const [mine, theirs] of [
      [local, remote],
      [remote, local],
    ]) {
      const idea = mergeDocuments(mine, theirs, base).ideas[0];
      expect(idea.scores.reach).toBe(4);
      expect(idea.evidence).toHaveLength(1);
      expect(idea.evidence[0].who).toBe("A customer");
      expect(idea.updatedAt).toBe("2026-09-03T00:00:00.000Z");
    }
  });
  it("with a base, merges two scores of the same idea given on two sides, one each", async () => {
    const { mergeDocuments } = await import("../src/document");
    const base = twoIdeas();
    const id = base.ideas[0].id;
    const local = updateIdea(base, id, { scores: { reach: 2 }, description: "typed here" }, day(3));
    const remote = updateIdea(base, id, { scores: { ease: 5 }, riskiestAssumption: "typed there" }, day(2));
    const idea = mergeDocuments(local, remote, base).ideas[0];
    expect(idea.scores).toEqual({ reach: 2, impact: null, profitability: null, vision: null, ease: 5 });
    expect(idea.description).toBe("typed here");
    expect(idea.riskiestAssumption).toBe("typed there");
  });
  it("with a base, the side touched last wins a field both sides changed", async () => {
    const { mergeDocuments } = await import("../src/document");
    const base = twoIdeas();
    const id = base.ideas[0].id;
    const local = updateIdea(base, id, { description: "mine, earlier" }, day(2));
    const remote = updateIdea(base, id, { description: "theirs, later" }, day(3));
    expect(mergeDocuments(local, remote, base).ideas[0].description).toBe("theirs, later");
    expect(mergeDocuments(remote, local, base).ideas[0].description).toBe("theirs, later");
  });

  it("keeps evidence added on both sides, the other side's entries first", async () => {
    const { mergeDocuments } = await import("../src/document");
    const base = twoIdeas();
    const id = base.ideas[0].id;
    const local = addEvidence(base, id, { ...behaviour, who: "Here" }, day(2)).doc;
    const remote = addEvidence(base, id, { ...behaviour, who: "There" }, day(3)).doc;
    expect(mergeDocuments(local, remote, base).ideas[0].evidence.map((e) => e.who)).toEqual(["There", "Here"]);
    // The same holds without a base: entries are a set keyed by id, never one list over the other.
    expect(mergeDocuments(local, remote).ideas[0].evidence.map((e) => e.who)).toEqual(["There", "Here"]);
  });
  it("with a base, an evidence entry removed on one side stays removed, and Confidence follows the gate", async () => {
    const { mergeDocuments } = await import("../src/document");
    let base = twoIdeas();
    const id = base.ideas[0].id;
    const { doc: withEvidence, entryId } = addEvidence(base, id, behaviour, day(1));
    base = updateIdea(withEvidence, id, { confidence: 3 }, day(1));
    const local = removeEvidence(base, id, entryId, day(2));
    const remote = updateIdea(base, id, { scores: { impact: 3 } }, day(3));
    const idea = mergeDocuments(local, remote, base).ideas[0];
    expect(idea.evidence).toEqual([]);
    expect(idea.confidence).toBe(2);
    expect(idea.scores.impact).toBe(3);
  });

  it("merges the stage and the parked reason as one, so parking on one side and scoring on the other keeps both", async () => {
    const { mergeDocuments } = await import("../src/document");
    const base = twoIdeas();
    const id = base.ideas[0].id;
    const local = parkIdea(base, id, "No time this year", day(3));
    const remote = updateIdea(base, id, { scores: { vision: 5 } }, day(2));
    for (const [mine, theirs] of [
      [local, remote],
      [remote, local],
    ]) {
      const idea = mergeDocuments(mine, theirs, base).ideas[0];
      expect(idea.stage).toBe("Parked");
      expect(idea.parkedReason).toBe("No time this year");
      expect(idea.scores.vision).toBe(5);
    }
    // Unparked here later than parked there: the later side's stage and reason go together.
    const parkedThere = parkIdea(base, id, "Not now", day(2));
    const unparkedHere = unparkIdea(parkIdea(base, id, "Not now", day(1)), id, "Exploring", day(3));
    const idea = mergeDocuments(unparkedHere, parkedThere, base).ideas[0];
    expect(idea.stage).toBe("Exploring");
    expect(idea.parkedReason).toBe("");
  });

  it("with a base, an idea removed on one side goes unless the other side changed it since", async () => {
    const { mergeDocuments } = await import("../src/document");
    const base = twoIdeas();
    const [a, b] = base.ideas;
    const local = deleteIdea(deleteIdea(base, a.id, day(2)), b.id, day(2));
    const remote = updateIdea(base, b.id, { description: "still working on B" }, day(3));
    const merged = mergeDocuments(local, remote, base);
    expect(merged.ideas.map((i) => i.name)).toEqual(["B"]);
    expect(merged.ideas[0].description).toBe("still working on B");
    expect(mergeDocuments(remote, local, base).ideas.map((i) => i.name)).toEqual(["B"]);
    // Without a base a missing idea is taken as added on the other side, and kept.
    expect(mergeDocuments(local, remote).ideas.map((i) => i.name)).toEqual(["A", "B"]);
  });
  it("produces a document that serialises, whatever the inputs", async () => {
    const { mergeDocuments } = await import("../src/document");
    const base = sampleDocument(day(1));
    const id = base.ideas[0].id;
    const local = parkIdea(base, id, "Parked here", day(2));
    const remote = addEvidence(base, id, behaviour, day(3)).doc;
    expect(() => serializeDocument(mergeDocuments(local, remote, base))).not.toThrow();
    expect(() => serializeDocument(mergeDocuments(local, remote))).not.toThrow();
  });
});
