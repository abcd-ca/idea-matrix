import { z } from "zod";

/**
 * The Idea Matrix file format, version 1.
 *
 * Every boundary (file load, import, MCP tool input) parses through these
 * schemas. Unknown keys are rejected so a hand-edited or hostile file cannot
 * smuggle fields in. Never build JSON by hand; always stringify a parsed
 * document.
 */

export const SCHEMA_VERSION = 1;
export const FILE_TYPE = "ideamatrix";
export const FILE_EXTENSION = ".ideamatrix.json";

export const STAGES = ["Backlog", "Exploring", "Talking to customers", "Validated", "Building", "Parked"] as const;
export type Stage = (typeof STAGES)[number];

export const CRITERIA = ["reach", "impact", "profitability", "vision", "ease"] as const;
export type Criterion = (typeof CRITERIA)[number];

const MAX_TEXT = 20_000;
const MAX_NAME = 200;
const MAX_IDEAS = 2_000;
const MAX_EVIDENCE = 500;

const shortText = z.string().max(MAX_NAME);
const longText = z.string().max(MAX_TEXT);
const isoDateTime = z.iso.datetime({ offset: true });
const id = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, "ids are letters, digits, _ and -");

/** A score from 1 to 5, or null when not yet scored. */
export const scoreSchema = z.number().int().min(1).max(5).nullable();
/** Profitability additionally allows 0 for a deliberately non-commercial idea. */
export const profitabilitySchema = z.number().int().min(0).max(5).nullable();
export const confidenceSchema = z.number().int().min(1).max(5);

export const scoresSchema = z
  .object({
    reach: scoreSchema,
    impact: scoreSchema,
    profitability: profitabilitySchema,
    vision: scoreSchema,
    ease: scoreSchema,
  })
  .strict();
export type Scores = z.infer<typeof scoresSchema>;

export const evidenceEntrySchema = z
  .object({
    id,
    date: z.iso.date(),
    who: shortText,
    whatTheyDoNow: longText,
    commitment: longText,
  })
  .strict();
export type EvidenceEntry = z.infer<typeof evidenceEntrySchema>;

export const ideaSchema = z
  .object({
    id,
    name: shortText,
    description: longText,
    stage: z.enum(STAGES),
    riskiestAssumption: longText,
    scores: scoresSchema,
    confidence: confidenceSchema,
    parkedReason: longText,
    evidence: z.array(evidenceEntrySchema).max(MAX_EVIDENCE),
    createdAt: isoDateTime,
    updatedAt: isoDateTime,
  })
  .strict();
export type Idea = z.infer<typeof ideaSchema>;

export const documentSchema = z
  .object({
    type: z.literal(FILE_TYPE),
    schemaVersion: z.literal(SCHEMA_VERSION),
    name: shortText,
    ideas: z.array(ideaSchema).max(MAX_IDEAS),
    createdAt: isoDateTime,
    updatedAt: isoDateTime,
  })
  .strict();
export type MatrixDocument = z.infer<typeof documentSchema>;

/** Fields a caller may change on an idea. Everything else is managed. */
export const ideaPatchSchema = z
  .object({
    name: shortText.optional(),
    description: longText.optional(),
    stage: z.enum(STAGES).optional(),
    riskiestAssumption: longText.optional(),
    scores: scoresSchema.partial().optional(),
    confidence: confidenceSchema.optional(),
    parkedReason: longText.optional(),
  })
  .strict();
export type IdeaPatch = z.infer<typeof ideaPatchSchema>;

export const evidencePatchSchema = evidenceEntrySchema.omit({ id: true }).strict();
export type EvidenceInput = z.infer<typeof evidencePatchSchema>;

/** Largest file the app will attempt to parse, in bytes. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
