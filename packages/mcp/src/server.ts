import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  BANDS,
  CONFIDENCE_INFO,
  STAGES,
  addEvidence,
  addIdea,
  band,
  confidenceGateMessage,
  exportMarkdown,
  findIdea,
  maxConfidenceAllowed,
  parkIdea,
  potential,
  score,
  unparkIdea,
  updateIdea,
  type Idea,
  type MatrixDocument,
  type Scores,
} from "@idea-matrix/core";
import { z } from "zod";
import { FileStore, StoreError } from "./store";
import { SHOW_IDS_RULE, reviewPrompt, walkthroughPrompt } from "./walkthrough";

export const SERVER_NAME = "idea-matrix";
export const SERVER_VERSION = "0.1.0";
// Set by tsup at build time; running from source (tsx, vitest) has no build.
declare const __BUILD_COMMIT__: string | undefined;
export const SERVER_COMMIT: string = typeof __BUILD_COMMIT__ === "string" ? __BUILD_COMMIT__ : "source";

const scoreArg = z.number().int().min(1).max(5);
const profitabilityArg = z.number().int().min(0).max(5);
const activeStages = STAGES.filter((s) => s !== "Parked") as [string, ...string[]];

function bandLabel(value: number | null): string {
  const b = band(value);
  return b ? BANDS[b].advice : "needs all five scores";
}

function summary(idea: Idea) {
  const p = potential(idea.scores);
  const s = score(p, idea.confidence);
  return {
    id: idea.id,
    name: idea.name,
    stage: idea.stage,
    scores: idea.scores,
    confidence: idea.confidence,
    potential: p,
    potentialBand: bandLabel(p),
    score: s,
    scoreBand: s === null ? null : bandLabel(s),
    hasRiskiestAssumption: idea.riskiestAssumption.trim() !== "",
    evidenceEntries: idea.evidence.length,
    updatedAt: idea.updatedAt,
  };
}

function detail(idea: Idea) {
  const allowed = maxConfidenceAllowed(idea.evidence);
  return {
    ...summary(idea),
    description: idea.description,
    riskiestAssumption: idea.riskiestAssumption,
    parkedReason: idea.parkedReason,
    evidence: idea.evidence,
    confidenceMeaning: CONFIDENCE_INFO.levels[idea.confidence],
    maxConfidenceAllowedByEvidence: allowed,
    confidenceGate: confidenceGateMessage(allowed) || "Evidence supports any Confidence value.",
    createdAt: idea.createdAt,
  };
}

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function fail(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

function explain(e: unknown): string {
  if (e instanceof StoreError) return e.message;
  if (e instanceof z.ZodError) return e.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ");
  return e instanceof Error ? e.message : String(e);
}

function resolveIdea(doc: MatrixDocument, ref: string): Idea | undefined {
  const byId = findIdea(doc, ref);
  if (byId) return byId;
  const wanted = ref.trim().toLowerCase();
  return doc.ideas.find((i) => i.name.trim().toLowerCase() === wanted);
}

/**
 * Build the MCP server over one matrix file. Every tool reads the file
 * fresh, applies a pure change from the core package, and writes it back,
 * so the same validation and the same Confidence gate apply as in the app.
 */
export function createServer(store: FileStore): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        "The idea-matrix tools read and update the person's Idea Matrix file. Every tool reads the file fresh and applies the same rules as the app: Confidence cannot rise without evidence, and ideas are parked with a reason, never deleted. " +
        SHOW_IDS_RULE,
    },
  );

  server.registerTool(
    "list_ideas",
    {
      title: "List ideas",
      description:
        "List the ideas in the matrix with their scores, Confidence, Potential and Score, sorted by Score and numbered from 1 in that order. Parked ideas are left out unless includeParked is true. Use get_idea for the full text of one idea. " +
        SHOW_IDS_RULE,
      inputSchema: {
        includeParked: z.boolean().optional().describe("Include parked ideas (default false)."),
        stage: z.enum(STAGES).optional().describe("Only ideas at this stage."),
      },
    },
    async ({ includeParked, stage }) => {
      try {
        const doc = await store.read();
        const rows = doc.ideas
          .filter((i) => (includeParked ? true : i.stage !== "Parked"))
          .filter((i) => (stage ? i.stage === stage : true))
          .map(summary)
          .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
          .map((row, index) => ({ number: index + 1, ...row }));
        return ok({ matrix: doc.name, file: store.path, count: rows.length, ideas: rows });
      } catch (e) {
        return fail(explain(e));
      }
    },
  );

  server.registerTool(
    "get_idea",
    {
      title: "Get one idea",
      description:
        "The full record for one idea: description, riskiest assumption, scores with Potential and Score, the evidence log, and how high Confidence may go given that evidence. Accepts the idea id or its exact name.",
      inputSchema: { idea: z.string().min(1).describe("Idea id, or its exact name.") },
    },
    async ({ idea }) => {
      try {
        const doc = await store.read();
        const found = resolveIdea(doc, idea);
        if (!found) return fail(`No idea called "${idea}". Use list_ideas to see the names and ids.`);
        return ok(detail(found));
      } catch (e) {
        return fail(explain(e));
      }
    },
  );

  server.registerTool(
    "add_idea",
    {
      title: "Add an idea",
      description:
        "Add a new idea to the matrix at stage Backlog with Confidence 1 and no scores. Score it afterwards with update_idea once the person has answered your questions.",
      inputSchema: {
        name: z.string().min(1).max(200),
        description: z.string().max(20000).optional(),
        riskiestAssumption: z.string().max(20000).optional(),
      },
    },
    async ({ name, description, riskiestAssumption }) => {
      try {
        let created: Idea | undefined;
        await store.update((doc) => {
          const result = addIdea(doc, name);
          created = result.idea;
          let next = result.doc;
          if (description !== undefined || riskiestAssumption !== undefined) {
            next = updateIdea(next, result.idea.id, {
              ...(description !== undefined ? { description } : {}),
              ...(riskiestAssumption !== undefined ? { riskiestAssumption } : {}),
            });
            created = findIdea(next, result.idea.id);
          }
          return next;
        });
        return ok(created ? detail(created) : { added: true });
      } catch (e) {
        return fail(explain(e));
      }
    },
  );

  server.registerTool(
    "update_idea",
    {
      title: "Update an idea",
      description:
        "Change fields on one idea. Send only the fields that should change. Scores are 1 to 5 (Profitability may be 0 for a deliberately non-commercial idea). Confidence is capped by the evidence log: above 2 needs an entry with what someone currently does, 5 needs a commitment; add the conversation with add_evidence first. To park an idea use park_idea, which requires a reason.",
      inputSchema: {
        idea: z.string().min(1).describe("Idea id, or its exact name."),
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(20000).optional(),
        riskiestAssumption: z.string().max(20000).optional(),
        stage: z.enum(activeStages).optional().describe("Any stage except Parked."),
        reach: scoreArg.optional(),
        impact: scoreArg.optional(),
        profitability: profitabilityArg.optional(),
        vision: scoreArg.optional(),
        ease: scoreArg.optional(),
        confidence: scoreArg.optional(),
      },
    },
    async ({
      idea,
      name,
      description,
      riskiestAssumption,
      stage,
      reach,
      impact,
      profitability,
      vision,
      ease,
      confidence,
    }) => {
      try {
        let updated: Idea | undefined;
        await store.update((doc) => {
          const found = resolveIdea(doc, idea);
          if (!found) throw new StoreError(`No idea called "${idea}". Use list_ideas to see the names and ids.`);
          const scorePatch: Partial<Scores> = {};
          if (reach !== undefined) scorePatch.reach = reach;
          if (impact !== undefined) scorePatch.impact = impact;
          if (profitability !== undefined) scorePatch.profitability = profitability;
          if (vision !== undefined) scorePatch.vision = vision;
          if (ease !== undefined) scorePatch.ease = ease;
          const patch = {
            ...(name !== undefined ? { name } : {}),
            ...(description !== undefined ? { description } : {}),
            ...(riskiestAssumption !== undefined ? { riskiestAssumption } : {}),
            ...(stage !== undefined ? { stage: stage as Idea["stage"] } : {}),
            ...(Object.keys(scorePatch).length > 0 ? { scores: scorePatch } : {}),
            ...(confidence !== undefined ? { confidence } : {}),
          };
          if (Object.keys(patch).length === 0) throw new StoreError("Nothing to change: send at least one field.");
          const next =
            found.stage === "Parked" && stage !== undefined
              ? updateIdea(unparkIdea(doc, found.id, stage as Idea["stage"]), found.id, patch)
              : updateIdea(doc, found.id, patch);
          updated = findIdea(next, found.id);
          return next;
        });
        return ok(updated ? detail(updated) : { updated: true });
      } catch (e) {
        return fail(explain(e));
      }
    },
  );

  server.registerTool(
    "add_evidence",
    {
      title: "Record a conversation",
      description:
        "Add an entry to an idea's evidence log: who the person talked to, what that person currently does about the problem (past and present behaviour only), and any commitment they made. This is what allows Confidence to rise. Returns the new maximum Confidence the evidence supports.",
      inputSchema: {
        idea: z.string().min(1).describe("Idea id, or its exact name."),
        who: z.string().min(1).max(200).describe("Who was spoken to, e.g. 'Strata council chair'."),
        whatTheyDoNow: z
          .string()
          .max(20000)
          .describe(
            "What they currently do about the problem. Leave empty if the conversation produced only opinions.",
          ),
        commitment: z
          .string()
          .max(20000)
          .optional()
          .describe("Money, an introduction, a pilot, their time. Empty if nothing."),
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe("YYYY-MM-DD, defaults to today."),
      },
    },
    async ({ idea, who, whatTheyDoNow, commitment, date }) => {
      try {
        let updated: Idea | undefined;
        await store.update((doc) => {
          const found = resolveIdea(doc, idea);
          if (!found) throw new StoreError(`No idea called "${idea}".`);
          const result = addEvidence(doc, found.id, {
            date: date ?? new Date().toISOString().slice(0, 10),
            who,
            whatTheyDoNow,
            commitment: commitment ?? "",
          });
          updated = findIdea(result.doc, found.id);
          return result.doc;
        });
        return ok(updated ? detail(updated) : { added: true });
      } catch (e) {
        return fail(explain(e));
      }
    },
  );

  server.registerTool(
    "park_idea",
    {
      title: "Park an idea",
      description:
        "Set an idea aside with a one-sentence reason. Parking keeps every field as history and takes the idea out of the matrix. Ideas are never deleted.",
      inputSchema: {
        idea: z.string().min(1).describe("Idea id, or its exact name."),
        reason: z.string().min(1).max(20000),
      },
    },
    async ({ idea, reason }) => {
      try {
        let updated: Idea | undefined;
        await store.update((doc) => {
          const found = resolveIdea(doc, idea);
          if (!found) throw new StoreError(`No idea called "${idea}".`);
          const next = parkIdea(doc, found.id, reason);
          updated = findIdea(next, found.id);
          return next;
        });
        return ok(updated ? detail(updated) : { parked: true });
      } catch (e) {
        return fail(explain(e));
      }
    },
  );

  server.registerTool(
    "unpark_idea",
    {
      title: "Bring a parked idea back",
      description: "Return a parked idea to the matrix at the given stage (default Backlog). Clears the parked reason.",
      inputSchema: {
        idea: z.string().min(1).describe("Idea id, or its exact name."),
        stage: z.enum(activeStages).optional(),
      },
    },
    async ({ idea, stage }) => {
      try {
        let updated: Idea | undefined;
        await store.update((doc) => {
          const found = resolveIdea(doc, idea);
          if (!found) throw new StoreError(`No idea called "${idea}".`);
          const next = unparkIdea(doc, found.id, (stage as Idea["stage"] | undefined) ?? "Backlog");
          updated = findIdea(next, found.id);
          return next;
        });
        return ok(updated ? detail(updated) : { unparked: true });
      } catch (e) {
        return fail(explain(e));
      }
    },
  );

  server.registerResource(
    "matrix",
    "ideamatrix://matrix",
    {
      title: "The whole matrix as Markdown",
      description: "Every idea with its scores, Potential, Score and evidence, in the same Markdown the app exports.",
      mimeType: "text/markdown",
    },
    async (uri) => {
      const doc = await store.read();
      return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: exportMarkdown(doc) }] };
    },
  );

  server.registerPrompt(
    "idea_matrix",
    {
      title: "Work on my idea matrix",
      description:
        "Lists the ideas as a numbered list and asks which one to work on, then runs the scoring conversation: read the idea, ask the one or two questions that matter, propose scores with reasons, write only what is agreed. Name an idea to skip the list.",
      argsSchema: { idea: z.string().optional().describe("Name of the idea to work on (optional).") },
    },
    ({ idea }) => ({
      messages: [{ role: "user", content: { type: "text", text: walkthroughPrompt(idea || undefined) } }],
    }),
  );

  server.registerPrompt(
    "review_matrix",
    {
      title: "Review the whole matrix",
      description:
        "An honest read of the matrix: what to talk to customers about next, inconsistent scores, ideas to park, missing assumptions. Changes nothing.",
    },
    () => ({
      messages: [{ role: "user", content: { type: "text", text: reviewPrompt() } }],
    }),
  );

  return server;
}
