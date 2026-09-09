import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { parseDocument, sampleDocument, serializeDocument } from "@idea-matrix/core";
import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer } from "../src/server";
import { FileStore, readRefusedMessage } from "../src/store";

let dir: string;
let file: string;
let client: Client;
let close: () => Promise<void>;

async function connect(path: string) {
  const server = createServer(new FileStore(path));
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const c = new Client({ name: "test", version: "0" });
  await c.connect(clientTransport);
  return {
    client: c,
    close: async () => {
      await c.close();
      await server.close();
    },
  };
}

type ToolResult = { content: { type: string; text?: string }[]; isError?: boolean };

async function call(name: string, args: Record<string, unknown> = {}) {
  const result = (await client.callTool({ name, arguments: args })) as ToolResult;
  const text = result.content[0]?.text ?? "";
  return { result, text, data: result.isError ? null : JSON.parse(text) };
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "ideamatrix-"));
  file = join(dir, "ideas.ideamatrix.json");
  await writeFile(file, serializeDocument(sampleDocument(() => new Date("2026-09-04T10:00:00.000Z"))));
  ({ client, close } = await connect(file));
});

afterEach(async () => {
  await close();
});

describe("tools", () => {
  it("lists ideas sorted by score, parked hidden by default", async () => {
    const { data } = await call("list_ideas");
    expect(data.count).toBe(8);
    expect(data.ideas[0].name).toBe("Pop-up sauna bookings");
    expect(data.ideas[0].number).toBe(1);
    expect(data.ideas[7].number).toBe(8);
    expect(data.ideas[0].scoreBand).toBe("worth a look");
    const all = await call("list_ideas", { includeParked: true });
    expect(all.data.count).toBe(9);
  });

  it("gets an idea by id or name, with the confidence gate explained", async () => {
    const byId = await call("get_idea", { idea: "sample-rink" });
    expect(byId.data.name).toBe("Backyard rink monitor");
    expect(byId.data.maxConfidenceAllowedByEvidence).toBe(2);
    expect(byId.data.confidenceGate).toMatch(/evidence entry/);
    const byName = await call("get_idea", { idea: "backyard rink monitor" });
    expect(byName.data.id).toBe("sample-rink");
    const missing = await call("get_idea", { idea: "nope" });
    expect(missing.result.isError).toBe(true);
  });

  it("updates scores and writes the file", async () => {
    const { data } = await call("update_idea", { idea: "sample-rink", reach: 3, ease: 5 });
    expect(data.scores.reach).toBe(3);
    expect(data.potential).toBe(76);
    const onDisk = parseDocument(await readFile(file, "utf8"));
    expect(onDisk.ideas.find((i) => i.id === "sample-rink")!.scores.ease).toBe(5);
  });

  it("refuses Confidence the evidence does not support, then allows it after add_evidence", async () => {
    const refused = await call("update_idea", { idea: "sample-rink", confidence: 4 });
    expect(refused.result.isError).toBe(true);
    expect(refused.text).toMatch(/up to 2/);
    const added = await call("add_evidence", {
      idea: "sample-rink",
      who: "Rink owner",
      whatTheyDoNow: "Checks the ice by hand at midnight.",
    });
    expect(added.data.maxConfidenceAllowedByEvidence).toBe(4);
    expect(added.data.evidence[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const allowed = await call("update_idea", { idea: "sample-rink", confidence: 4 });
    expect(allowed.data.confidence).toBe(4);
    const five = await call("update_idea", { idea: "sample-rink", confidence: 5 });
    expect(five.result.isError).toBe(true);
  });

  it("rejects bad input at the boundary", async () => {
    const tooHigh = await call("update_idea", { idea: "sample-rink", reach: 9 });
    expect(tooHigh.result.isError).toBe(true);
    const parkedViaStage = await call("update_idea", { idea: "sample-rink", stage: "Parked" });
    expect(parkedViaStage.result.isError).toBe(true);
    const nothing = await call("update_idea", { idea: "sample-rink" });
    expect(nothing.result.isError).toBe(true);
  });

  it("parks with a reason and unparks", async () => {
    const parked = await call("park_idea", { idea: "sample-rink", reason: "Nobody has a rink." });
    expect(parked.data.stage).toBe("Parked");
    expect(parked.data.parkedReason).toBe("Nobody has a rink.");
    const back = await call("unpark_idea", { idea: "sample-rink", stage: "Exploring" });
    expect(back.data.stage).toBe("Exploring");
    expect(back.data.parkedReason).toBe("");
  });

  it("adds an idea", async () => {
    const { data } = await call("add_idea", { name: "Snow blower share", description: "Share one per lane." });
    expect(data.stage).toBe("Backlog");
    expect(data.confidence).toBe(1);
    expect(data.description).toBe("Share one per lane.");
    const list = await call("list_ideas");
    expect(list.data.count).toBe(9);
  });

  it("reports a missing file plainly", async () => {
    const other = await connect(join(dir, "missing.ideamatrix.json"));
    const result = (await other.client.callTool({ name: "list_ideas", arguments: {} })) as ToolResult;
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/No matrix file/);
    await other.close();
  });

  it("reports a file it is not allowed to read, and keeps serving", async () => {
    if (process.getuid?.() === 0) return; // root reads anything
    const locked = join(dir, "locked.ideamatrix.json");
    await writeFile(locked, serializeDocument(sampleDocument()));
    await chmod(locked, 0o000);
    const other = await connect(locked);
    const result = (await other.client.callTool({ name: "list_ideas", arguments: {} })) as ToolResult;
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/not allowed to read .*locked\.ideamatrix\.json \(EACCES\)/);
    await chmod(locked, 0o600);
    const again = (await other.client.callTool({ name: "list_ideas", arguments: {} })) as ToolResult;
    expect(again.isError).toBeFalsy();
    await other.close();
  });

  it("names the guarded macOS folder and the setting that opens it", () => {
    const mac = { platform: "darwin" as const, home: "/Users/sam" };
    const text = readRefusedMessage("/Users/sam/Downloads/ideas.ideamatrix.json", "EPERM", mac);
    expect(text).toMatch(/keeping this program out of your Downloads folder/);
    expect(text).toMatch(/Files and Folders/);
    expect(text).toMatch(/turn on Downloads/);
    expect(readRefusedMessage("/Users/sam/Documents/x/ideas.ideamatrix.json", "EPERM", mac)).toMatch(
      /Documents folder/,
    );
    expect(readRefusedMessage("/Users/sam/ideas/ideas.ideamatrix.json", "EPERM", mac)).toMatch(/not allowed to read/);
    expect(
      readRefusedMessage("/Users/sam/Downloads/ideas.ideamatrix.json", "EACCES", {
        platform: "linux",
        home: "/Users/sam",
      }),
    ).toMatch(/not allowed to read/);
  });
});

describe("prompts and resources", () => {
  it("offers the walkthrough and review prompts", async () => {
    const prompts = await client.listPrompts();
    expect(prompts.prompts.map((p) => p.name).sort()).toEqual(["idea_matrix", "review_matrix"]);
    const p = await client.getPrompt({ name: "idea_matrix", arguments: { idea: "Backyard rink monitor" } });
    const text = (p.messages[0].content as { text: string }).text;
    expect(text).toContain('"Backyard rink monitor"');
    expect(text).toContain("Only when I agree");
    expect(text).toContain("commitment counts as proof");
    const bare = await client.getPrompt({ name: "idea_matrix", arguments: {} });
    expect((bare.messages[0].content as { text: string }).text).toContain("numbered list");
    expect((bare.messages[0].content as { text: string }).text).toContain("the id in square brackets");
  });

  it("tells every assistant to show ids, without being asked", async () => {
    expect(client.getInstructions()).toMatch(/id in square brackets/);
    const tools = await client.listTools();
    const list = tools.tools.find((t) => t.name === "list_ideas");
    expect(list?.description).toMatch(/id in square brackets/);
  });

  it("serves the matrix as markdown", async () => {
    const r = await client.readResource({ uri: "ideamatrix://matrix" });
    expect(r.contents[0].mimeType).toBe("text/markdown");
    expect((r.contents[0] as { text: string }).text).toContain("## Pop-up sauna bookings");
  });
});
