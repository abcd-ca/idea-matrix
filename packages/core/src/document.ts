import {
  documentSchema,
  evidencePatchSchema,
  ideaPatchSchema,
  FILE_TYPE,
  MAX_FILE_BYTES,
  SCHEMA_VERSION,
  type EvidenceInput,
  type Idea,
  type IdeaPatch,
  type MatrixDocument,
  type Stage,
} from "./schema";
import { maxConfidenceAllowed } from "./formulas";

export type Clock = () => Date;
const defaultClock: Clock = () => new Date();

export function newId(): string {
  const bytes = new Uint8Array(12);
  const cryptoObj = (globalThis as unknown as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

export function emptyDocument(name = "My ideas", clock: Clock = defaultClock): MatrixDocument {
  const now = clock().toISOString();
  return {
    type: FILE_TYPE,
    schemaVersion: SCHEMA_VERSION,
    name,
    ideas: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function blankIdea(name: string, clock: Clock = defaultClock): Idea {
  const now = clock().toISOString();
  return {
    id: newId(),
    name,
    description: "",
    stage: "Backlog",
    riskiestAssumption: "",
    scores: { reach: null, impact: null, profitability: null, vision: null, ease: null },
    confidence: 1,
    parkedReason: "",
    evidence: [],
    createdAt: now,
    updatedAt: now,
  };
}

export class DocumentError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "too-large"
      | "not-json"
      | "not-a-matrix"
      | "newer-version"
      | "invalid",
  ) {
    super(message);
    this.name = "DocumentError";
  }
}

/**
 * Parse text from any source into a validated document, migrating older
 * schema versions on the way. Throws DocumentError with a code the UI can
 * turn into a plain sentence.
 */
export function parseDocument(text: string): MatrixDocument {
  if (text.length > MAX_FILE_BYTES) {
    throw new DocumentError("This file is larger than a matrix can be.", "too-large");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new DocumentError("This file is not valid JSON.", "not-json");
  }
  return migrateDocument(raw);
}

export function migrateDocument(raw: unknown): MatrixDocument {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new DocumentError("This file is not an Idea Matrix file.", "not-a-matrix");
  }
  const obj = raw as Record<string, unknown>;
  if (obj.type !== FILE_TYPE) {
    throw new DocumentError("This file is not an Idea Matrix file.", "not-a-matrix");
  }
  const version = obj.schemaVersion;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    throw new DocumentError("This file has no valid schema version.", "invalid");
  }
  if (version > SCHEMA_VERSION) {
    throw new DocumentError(
      "This file was saved by a newer version of Idea Matrix. Reload the page to get the latest version, then open it again.",
      "newer-version",
    );
  }
  // Future migrations go here, one step per version, before final validation.
  const result = documentSchema.safeParse(obj);
  if (!result.success) {
    const first = result.error.issues[0];
    const where = first?.path.length ? ` (${first.path.join(".")})` : "";
    throw new DocumentError(`This file has a problem${where}: ${first?.message ?? "invalid"}.`, "invalid");
  }
  return result.data;
}

export function serializeDocument(doc: MatrixDocument): string {
  // Re-validate so a bug upstream can never write an invalid file.
  const checked = documentSchema.parse(doc);
  return JSON.stringify(checked, null, 2) + "\n";
}

function touch(doc: MatrixDocument, clock: Clock): MatrixDocument {
  return { ...doc, updatedAt: clock().toISOString() };
}

export function addIdea(doc: MatrixDocument, name: string, clock: Clock = defaultClock): { doc: MatrixDocument; idea: Idea } {
  const idea = blankIdea(name.trim() || "Untitled idea", clock);
  return { doc: touch({ ...doc, ideas: [...doc.ideas, idea] }, clock), idea };
}

/** Append already-built ideas (from an import). Ids are regenerated to avoid collisions. */
export function addIdeas(doc: MatrixDocument, ideas: Idea[], clock: Clock = defaultClock): MatrixDocument {
  const existing = new Set(doc.ideas.map((i) => i.id));
  const fresh = ideas.map((idea) => {
    let nextId = idea.id;
    while (existing.has(nextId)) nextId = newId();
    existing.add(nextId);
    return { ...idea, id: nextId };
  });
  return touch({ ...doc, ideas: [...doc.ideas, ...fresh] }, clock);
}

export function findIdea(doc: MatrixDocument, ideaId: string): Idea | undefined {
  return doc.ideas.find((i) => i.id === ideaId);
}

/**
 * Apply a validated patch. Enforces the Confidence gate and the Parked rule
 * (a parked idea must carry a reason; leaving Parked clears it).
 */
export function updateIdea(
  doc: MatrixDocument,
  ideaId: string,
  patch: IdeaPatch,
  clock: Clock = defaultClock,
): MatrixDocument {
  const clean = ideaPatchSchema.parse(patch);
  const current = findIdea(doc, ideaId);
  if (!current) throw new Error("No such idea.");
  let next: Idea = { ...current, ...clean, scores: { ...current.scores, ...(clean.scores ?? {}) } };

  const allowed = maxConfidenceAllowed(next.evidence);
  if (next.confidence > allowed) {
    throw new Error(
      `The evidence log only supports Confidence up to ${allowed} so far.`,
    );
  }
  if (next.stage === "Parked" && next.parkedReason.trim() === "") {
    throw new Error("A parked idea needs a reason.");
  }
  if (next.stage !== "Parked" && current.stage === "Parked" && clean.stage !== undefined) {
    next = { ...next, parkedReason: "" };
  }
  next = { ...next, updatedAt: clock().toISOString() };
  return touch({ ...doc, ideas: doc.ideas.map((i) => (i.id === ideaId ? next : i)) }, clock);
}

export function parkIdea(doc: MatrixDocument, ideaId: string, reason: string, clock: Clock = defaultClock): MatrixDocument {
  return updateIdea(doc, ideaId, { stage: "Parked", parkedReason: reason.trim() }, clock);
}

export function unparkIdea(doc: MatrixDocument, ideaId: string, stage: Stage = "Backlog", clock: Clock = defaultClock): MatrixDocument {
  if (stage === "Parked") throw new Error("Unparking needs a stage other than Parked.");
  return updateIdea(doc, ideaId, { stage }, clock);
}

export function deleteIdea(doc: MatrixDocument, ideaId: string, clock: Clock = defaultClock): MatrixDocument {
  if (!findIdea(doc, ideaId)) throw new Error("No such idea.");
  return touch({ ...doc, ideas: doc.ideas.filter((i) => i.id !== ideaId) }, clock);
}

export function addEvidence(
  doc: MatrixDocument,
  ideaId: string,
  input: EvidenceInput,
  clock: Clock = defaultClock,
): { doc: MatrixDocument; entryId: string } {
  const clean = evidencePatchSchema.parse(input);
  const current = findIdea(doc, ideaId);
  if (!current) throw new Error("No such idea.");
  const entry = { id: newId(), ...clean };
  const next: Idea = {
    ...current,
    evidence: [...current.evidence, entry],
    updatedAt: clock().toISOString(),
  };
  return {
    doc: touch({ ...doc, ideas: doc.ideas.map((i) => (i.id === ideaId ? next : i)) }, clock),
    entryId: entry.id,
  };
}

export function removeEvidence(doc: MatrixDocument, ideaId: string, entryId: string, clock: Clock = defaultClock): MatrixDocument {
  const current = findIdea(doc, ideaId);
  if (!current) throw new Error("No such idea.");
  const evidence = current.evidence.filter((e) => e.id !== entryId);
  const allowed = maxConfidenceAllowed(evidence);
  const next: Idea = {
    ...current,
    evidence,
    confidence: Math.min(current.confidence, allowed),
    updatedAt: clock().toISOString(),
  };
  return touch({ ...doc, ideas: doc.ideas.map((i) => (i.id === ideaId ? next : i)) }, clock);
}

export function renameDocument(doc: MatrixDocument, name: string, clock: Clock = defaultClock): MatrixDocument {
  return touch({ ...doc, name: name.trim() || doc.name }, clock);
}
