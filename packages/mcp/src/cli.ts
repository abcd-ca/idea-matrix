import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { exportCsv, exportMarkdown, potential, score, serializeDocument } from "@idea-matrix/core";
import { resolve } from "node:path";
import { createServer, SERVER_COMMIT, SERVER_VERSION } from "./server";
import { FileStore, StoreError } from "./store";

const USAGE = `idea-matrix ${SERVER_VERSION} (built from commit ${SERVER_COMMIT})

Usage:
  idea-matrix mcp    --file <path>            Start the MCP server (stdio) over a matrix file
  idea-matrix list   --file <path> [--all]    List ideas, sorted by Score
  idea-matrix show   --file <path> <idea>     Show one idea by id or exact name
  idea-matrix export --file <path> <format>   Print the matrix as json, md or csv
  idea-matrix init   --file <path> [--name N] Create an empty matrix file

The file can also be given with the IDEA_MATRIX_FILE environment variable.

Claude Code:
  claude mcp add idea-matrix -- npx -y @idea-matrix/mcp mcp --file ~/Documents/ideas.ideamatrix.json
`;

interface Args {
  command: string | undefined;
  positional: string[];
  flags: Record<string, string | true>;
}

function parseArgs(argv: string[]): Args {
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(a);
    }
  }
  const [command, ...rest] = positional;
  return { command, positional: rest, flags };
}

function fileFrom(args: Args): string {
  const flag = args.flags.file;
  const path = typeof flag === "string" ? flag : process.env.IDEA_MATRIX_FILE;
  if (!path) {
    throw new StoreError("Tell me where the matrix file is: --file <path>, or set IDEA_MATRIX_FILE.");
  }
  return resolve(path.replace(/^~(?=$|\/)/, process.env.HOME ?? "~"));
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const out = (text: string) => process.stdout.write(text.endsWith("\n") ? text : `${text}\n`);

  if (!args.command || args.flags.help || args.command === "help") {
    out(USAGE);
    return args.command ? 0 : 1;
  }
  if (args.flags.version || args.command === "version") {
    out(`idea-matrix ${SERVER_VERSION} (built from commit ${SERVER_COMMIT})`);
    return 0;
  }

  const store = new FileStore(fileFrom(args));

  switch (args.command) {
    case "mcp": {
      // Fail early with a readable message if the file is missing or broken.
      await store.read();
      const server = createServer(store);
      await server.connect(new StdioServerTransport());
      // Keep running until the client closes stdin.
      await new Promise<void>((resolveDone) => {
        process.stdin.on("close", () => resolveDone());
        process.stdin.on("end", () => resolveDone());
      });
      return 0;
    }
    case "list": {
      const doc = await store.read();
      const rows = doc.ideas
        .filter((i) => args.flags.all || i.stage !== "Parked")
        .map((i) => {
          const p = potential(i.scores);
          return { i, p, s: score(p, i.confidence) };
        })
        .sort((a, b) => (b.s ?? -1) - (a.s ?? -1));
      out(`${doc.name} · ${rows.length} ideas · ${store.path}\n`);
      const pad = (v: string | number | null, w: number) => String(v ?? "–").padStart(w);
      out(`${"Score".padStart(5)} ${"Pot.".padStart(5)} ${"Conf".padStart(4)}  ${"Stage".padEnd(21)} Idea`);
      for (const { i, p, s } of rows) {
        out(`${pad(s, 5)} ${pad(p, 5)} ${pad(i.confidence, 4)}  ${i.stage.padEnd(21)} ${i.name}  [${i.id}]`);
      }
      return 0;
    }
    case "show": {
      const ref = args.positional[0];
      if (!ref) throw new StoreError("Which idea? Give its id or exact name.");
      const doc = await store.read();
      const idea =
        doc.ideas.find((i) => i.id === ref) ?? doc.ideas.find((i) => i.name.toLowerCase() === ref.toLowerCase());
      if (!idea) throw new StoreError(`No idea called "${ref}".`);
      const p = potential(idea.scores);
      out(JSON.stringify({ ...idea, potential: p, score: score(p, idea.confidence) }, null, 2));
      return 0;
    }
    case "export": {
      const format = args.positional[0] ?? "md";
      const doc = await store.read();
      if (format === "json") out(serializeDocument(doc));
      else if (format === "md" || format === "markdown") out(exportMarkdown(doc));
      else if (format === "csv") out(exportCsv(doc));
      else throw new StoreError(`Unknown format "${format}". Use json, md or csv.`);
      return 0;
    }
    case "init": {
      const name = typeof args.flags.name === "string" ? args.flags.name : "My ideas";
      await store.init(name);
      out(`Created ${store.path}`);
      return 0;
    }
    default:
      out(USAGE);
      throw new StoreError(`Unknown command "${args.command}".`);
  }
}

main()
  .then((code) => process.exit(code))
  .catch((e: unknown) => {
    process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  });
