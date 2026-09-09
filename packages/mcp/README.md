# Idea Matrix for Claude (MCP server and CLI)

Lets Claude Desktop, Claude Code, or any assistant that speaks the Model Context Protocol read and update your Idea Matrix file. It runs on your computer, works on the same file as the app, and applies the same rules: Confidence cannot rise without evidence, and nothing is ever deleted.

Nothing here talks to any server of ours. The only thing that leaves your machine is what your assistant sends to its own provider, on your account.

## Claude Desktop

1. Download `idea-matrix.mcpb` from the [releases page](https://github.com/abcd-ca/idea-matrix/releases).
2. Double-click it (or drag it into Claude Desktop → Settings → Extensions).
3. When asked, pick your matrix file, usually `ideas.ideamatrix.json`, the one the app created.

**Tip for macOS:** keep the file out of Desktop, Documents and Downloads. macOS guards those three folders with a per-app permission, and Claude Desktop does not have it, so the extension cannot read a file there. A folder you make in your home folder, such as `~/Ideas`, works without any setup. If the file is already in one of the guarded folders, move it and update the extension's setting, or allow Claude in System Settings → Privacy & Security → Files and Folders.

Then, in a chat, choose the **Work on my idea matrix** prompt, or just say "show me my idea matrix".

## Claude Code

```
claude mcp add idea-matrix -- npx -y @idea-matrix/mcp mcp --file ~/Ideas/ideas.ideamatrix.json
```

Then `/idea-matrix:idea_matrix` lists your ideas and asks which to work on, or ask in plain words.

## Other MCP clients

Point the client at this command (stdio transport):

```
npx -y @idea-matrix/mcp mcp --file /path/to/ideas.ideamatrix.json
```

Local models work the same way through a client that supports MCP, such as LM Studio or Open WebUI, pointed at a model in Ollama.

## What Claude can do

| Tool                        | What it does                                                                |
| --------------------------- | --------------------------------------------------------------------------- |
| `list_ideas`                | The matrix with scores, Confidence, Potential and Score, sorted by Score    |
| `get_idea`                  | One idea in full, including its evidence log and how high Confidence may go |
| `add_idea`                  | A new idea at Backlog, unscored                                             |
| `update_idea`               | Change text, stage, scores or Confidence. The Confidence gate applies       |
| `add_evidence`              | Record a conversation: who, what they currently do, any commitment          |
| `park_idea` / `unpark_idea` | Set aside with a reason, or bring back                                      |

Two prompts: **idea_matrix** lists the ideas as a numbered list, asks which one to work on (by number, name or id), then runs the scoring conversation (summarise, ask the one or two questions that matter, propose scores with reasons, write only what is agreed); **review_matrix** gives an honest read of the whole matrix without changing anything.

One resource, `ideamatrix://matrix`, is the whole matrix as Markdown.

## The command line

The same package is a small CLI:

```
idea-matrix list   --file ideas.ideamatrix.json
idea-matrix show   --file ideas.ideamatrix.json "Trailhead weather board"
idea-matrix export --file ideas.ideamatrix.json md > ideas.md
idea-matrix init   --file ideas.ideamatrix.json
```

`IDEA_MATRIX_FILE` in the environment saves typing `--file`.

## Two programs, one file

The app and this server both write the same file. The app notices a change on disk within a few seconds and brings it in, so scores set from Claude appear in the browser tab, even while the tab has an edit of its own in progress. Each write here is atomic, and the app checks the file's modified time before each of its own writes: when this server wrote first, the app merges the two copies field by field rather than writing over them.
