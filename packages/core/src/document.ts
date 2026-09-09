import {
  CRITERIA,
  documentSchema,
  evidencePatchSchema,
  ideaPatchSchema,
  FILE_TYPE,
  MAX_FILE_BYTES,
  SCHEMA_VERSION,
  type EvidenceEntry,
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

/**
 * An error the UI can show. The message is core's English sentence; the
 * code is what a translation keys off, with `values` for its placeholders
 * (`confidence-needs-evidence` carries `allowed`).
 */
export type DocumentErrorCode =
  | "too-large"
  | "not-json"
  | "not-a-matrix"
  | "newer-version"
  | "invalid"
  | "no-such-idea"
  | "confidence-needs-evidence"
  | "park-needs-reason"
  | "unpark-needs-stage";

export class DocumentError extends Error {
  constructor(
    message: string,
    public readonly code: DocumentErrorCode,
    public readonly values: Record<string, string | number> = {},
  ) {
    super(message);
    this.name = "DocumentError";
  }
}

const noSuchIdea = () => new DocumentError("No such idea.", "no-such-idea");

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

export function addIdea(
  doc: MatrixDocument,
  name: string,
  clock: Clock = defaultClock,
): { doc: MatrixDocument; idea: Idea } {
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
  if (!current) throw noSuchIdea();
  let next: Idea = { ...current, ...clean, scores: { ...current.scores, ...(clean.scores ?? {}) } };

  const allowed = maxConfidenceAllowed(next.evidence);
  if (next.confidence > allowed) {
    throw new DocumentError(
      `The evidence log only supports Confidence up to ${allowed} so far.`,
      "confidence-needs-evidence",
      {
        allowed,
      },
    );
  }
  if (next.stage === "Parked" && next.parkedReason.trim() === "") {
    throw new DocumentError("A parked idea needs a reason.", "park-needs-reason");
  }
  if (next.stage !== "Parked" && current.stage === "Parked" && clean.stage !== undefined) {
    next = { ...next, parkedReason: "" };
  }
  next = { ...next, updatedAt: clock().toISOString() };
  return touch({ ...doc, ideas: doc.ideas.map((i) => (i.id === ideaId ? next : i)) }, clock);
}

export function parkIdea(
  doc: MatrixDocument,
  ideaId: string,
  reason: string,
  clock: Clock = defaultClock,
): MatrixDocument {
  return updateIdea(doc, ideaId, { stage: "Parked", parkedReason: reason.trim() }, clock);
}

export function unparkIdea(
  doc: MatrixDocument,
  ideaId: string,
  stage: Stage = "Backlog",
  clock: Clock = defaultClock,
): MatrixDocument {
  if (stage === "Parked") throw new DocumentError("Unparking needs a stage other than Parked.", "unpark-needs-stage");
  return updateIdea(doc, ideaId, { stage }, clock);
}

export function deleteIdea(doc: MatrixDocument, ideaId: string, clock: Clock = defaultClock): MatrixDocument {
  if (!findIdea(doc, ideaId)) throw noSuchIdea();
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
  if (!current) throw noSuchIdea();
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

export function removeEvidence(
  doc: MatrixDocument,
  ideaId: string,
  entryId: string,
  clock: Clock = defaultClock,
): MatrixDocument {
  const current = findIdea(doc, ideaId);
  if (!current) throw noSuchIdea();
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

/**
 * Reconcile two copies of the same matrix: this device's document (`local`)
 * and the one another copy of the app has written to the shared file
 * (`remote`). `base` is the document both started from, when the caller has
 * it: what this device last loaded from or saved to the file. With a base the
 * merge is three-way and field by field: a field only one side changed keeps
 * that change, whatever the other side did to the rest of the idea, so a
 * score given on the phone and an evidence entry typed at the desk both
 * survive. Only when both sides changed the same field does the side whose
 * idea was touched last win it. Without a base there is no telling who
 * changed what, so a field that differs goes to the side touched last.
 *
 * The parts of an idea that merge as one unit: each of the five scores on its
 * own; the stage together with the parked reason (a parked idea always keeps
 * its reason); the evidence log as a set keyed by entry id, so entries added
 * on both sides are all kept and, with a base, an entry removed on one side
 * stays removed. Confidence is then held to what the merged evidence
 * supports, so the gate holds after a merge as it does after an edit.
 *
 * Ideas present in only one copy are kept, because a missing idea is far more
 * often "added over there" than "deleted here". With a base the app knows
 * which it was: an idea in the base that one side removed goes, unless the
 * other side changed it since, in which case the edit wins over the removal
 * and nothing is lost silently. The matrix name follows the same field rule.
 */
export function mergeDocuments(
  local: MatrixDocument,
  remote: MatrixDocument,
  base: MatrixDocument | null = null,
): MatrixDocument {
  const localIsNewer = local.updatedAt >= remote.updatedAt;
  const baseIdeas = new Map<string, Idea>();
  for (const idea of base?.ideas ?? []) baseIdeas.set(idea.id, idea);
  const localIdeas = new Map<string, Idea>();
  for (const idea of local.ideas) localIdeas.set(idea.id, idea);
  const remoteIdeas = new Map<string, Idea>();
  for (const idea of remote.ideas) remoteIdeas.set(idea.id, idea);

  /** An idea one side has and the other does not: kept unless the other side deliberately removed it. */
  const keepLone = (idea: Idea): boolean => {
    if (!base) return true;
    const before = baseIdeas.get(idea.id);
    return before === undefined || !sameIdea(idea, before);
  };

  // Remote order for ideas both copies know, then anything only local knows.
  const ideas: Idea[] = [];
  for (const theirs of remote.ideas) {
    const ours = localIdeas.get(theirs.id);
    if (ours) ideas.push(mergeIdea(ours, theirs, baseIdeas.get(theirs.id)));
    else if (keepLone(theirs)) ideas.push(theirs);
  }
  for (const ours of local.ideas) {
    if (!remoteIdeas.has(ours.id) && keepLone(ours)) ideas.push(ours);
  }

  return {
    type: local.type,
    schemaVersion: local.schemaVersion,
    name: pickField(local.name, remote.name, base?.name, localIsNewer, (a, b) => a === b),
    ideas,
    createdAt: earlier(local.createdAt, remote.createdAt),
    updatedAt: later(local.updatedAt, remote.updatedAt),
  };
}

/**
 * The three-way rule for one field. A side that still has the base value did
 * not touch the field, so the other side's value is the change to keep. When
 * both moved, or when there is no base to compare with, the side touched last
 * wins. Equal values need no decision.
 */
function pickField<T>(
  ours: T,
  theirs: T,
  before: T | undefined,
  oursIsNewer: boolean,
  same: (a: T, b: T) => boolean,
): T {
  if (same(ours, theirs)) return ours;
  if (before !== undefined) {
    if (same(ours, before)) return theirs;
    if (same(theirs, before)) return ours;
  }
  return oursIsNewer ? ours : theirs;
}

function mergeIdea(ours: Idea, theirs: Idea, before: Idea | undefined): Idea {
  const oursIsNewer = ours.updatedAt >= theirs.updatedAt;
  const field = <K extends keyof Idea>(key: K): Idea[K] =>
    pickField(ours[key], theirs[key], before?.[key], oursIsNewer, (a, b) => a === b);
  const scores = { ...ours.scores };
  for (const key of CRITERIA) {
    scores[key] = pickField(ours.scores[key], theirs.scores[key], before?.scores[key], oursIsNewer, (a, b) => a === b);
  }
  const parking = pickField(
    { stage: ours.stage, parkedReason: ours.parkedReason },
    { stage: theirs.stage, parkedReason: theirs.parkedReason },
    before ? { stage: before.stage, parkedReason: before.parkedReason } : undefined,
    oursIsNewer,
    (a, b) => a.stage === b.stage && a.parkedReason === b.parkedReason,
  );
  const evidence = mergeEvidence(ours, theirs, before);
  return {
    id: ours.id,
    name: field("name"),
    description: field("description"),
    stage: parking.stage,
    riskiestAssumption: field("riskiestAssumption"),
    scores,
    confidence: Math.min(field("confidence"), maxConfidenceAllowed(evidence)),
    parkedReason: parking.parkedReason,
    evidence,
    createdAt: earlier(ours.createdAt, theirs.createdAt),
    updatedAt: later(ours.updatedAt, theirs.updatedAt),
  };
}

/**
 * The evidence log as a set keyed by entry id: the other side's order first,
 * then what only this side has. An entry both sides have but wrote
 * differently follows the field rule; one that only one side has is an
 * addition to keep, unless the base shows the other side removed it.
 */
function mergeEvidence(ours: Idea, theirs: Idea, before: Idea | undefined): EvidenceEntry[] {
  const oursIsNewer = ours.updatedAt >= theirs.updatedAt;
  const baseEntries = new Map<string, EvidenceEntry>();
  for (const entry of before?.evidence ?? []) baseEntries.set(entry.id, entry);
  const ourEntries = new Map<string, EvidenceEntry>();
  for (const entry of ours.evidence) ourEntries.set(entry.id, entry);
  const theirEntries = new Map<string, EvidenceEntry>();
  for (const entry of theirs.evidence) theirEntries.set(entry.id, entry);

  const keepLone = (entry: EvidenceEntry): boolean => {
    if (!before) return true;
    const was = baseEntries.get(entry.id);
    return was === undefined || !sameEvidence(entry, was);
  };

  const merged: EvidenceEntry[] = [];
  for (const entry of theirs.evidence) {
    const mine = ourEntries.get(entry.id);
    if (mine) merged.push(pickField(mine, entry, baseEntries.get(entry.id), oursIsNewer, sameEvidence));
    else if (keepLone(entry)) merged.push(entry);
  }
  for (const entry of ours.evidence) {
    if (!theirEntries.has(entry.id) && keepLone(entry)) merged.push(entry);
  }
  return merged;
}

function sameEvidence(a: EvidenceEntry, b: EvidenceEntry): boolean {
  return (
    a.id === b.id &&
    a.date === b.date &&
    a.who === b.who &&
    a.whatTheyDoNow === b.whatTheyDoNow &&
    a.commitment === b.commitment
  );
}

function sameIdea(a: Idea, b: Idea): boolean {
  return (
    a.name === b.name &&
    a.description === b.description &&
    a.stage === b.stage &&
    a.riskiestAssumption === b.riskiestAssumption &&
    CRITERIA.every((key) => a.scores[key] === b.scores[key]) &&
    a.confidence === b.confidence &&
    a.parkedReason === b.parkedReason &&
    a.evidence.length === b.evidence.length &&
    a.evidence.every((entry, i) => sameEvidence(entry, b.evidence[i]))
  );
}

const earlier = (a: string, b: string): string => (a <= b ? a : b);
const later = (a: string, b: string): string => (a >= b ? a : b);
