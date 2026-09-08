# Idea Matrix (app repo)

A local-first web app for scoring side-project ideas. Read `README.md` for what it is and `ROADMAP.md` for why it is built this way and what comes next. Private context, including anything about my own ideas, lives in `CLAUDE.local.md`, which is gitignored; never move any of it into tracked files.

## Layout

- `packages/core`: schema (zod), formulas, the Confidence gate, CSV and Markdown, sample data. Pure TypeScript, no React, no browser APIs. Tests in `packages/core/test` (vitest).
- `packages/mcp`: the MCP server, CLI and Claude Desktop bundle (`manifest.json`). `src/server.ts` registers the tools, prompts and resource; `src/store.ts` is the atomic read-modify-write file store; `src/walkthrough.ts` holds the prompt text. Bundled to one file with tsup; `npm run bundle -w packages/mcp` builds `dist/idea-matrix.mcpb`. Tests use the SDK's in-memory transport.
- `apps/web`: Next.js app router, static export (`output: "export"`). shadcn/ui on Base UI, Tailwind 4, Zustand, TanStack Table, driver.js for the guided tour, idb-keyval for the IndexedDB cache.
- `apps/web/src/lib/store.ts` is the Zustand store; `apps/web/src/lib/file-session.ts` owns the file handle, autosave and the external-change watcher; `apps/web/src/lib/storage/local-file.ts` wraps the File System Access API.

## Commands

- `npm run dev` from the repo root starts the app (open it in Chrome or Edge).
- `npm run check` runs typecheck, lint, tests and the static build, the same as CI. Run it before saying a change is done.
- `npm run bump -- patch|minor|major` sets the version in every package and in the extension manifest, and starts the next `CHANGELOG.md` section from the commits since the previous release; trim it to what a user would care about. Commit that on a branch; when it reaches main, the Release workflow tags it and publishes the GitHub Release with that section as the notes, plus the Claude Desktop bundle and the build fingerprint. Nobody pushes tags by hand.

## Rules that do not change

- **Nothing leaves the machine.** No fetch to any server, no analytics, no telemetry, no external scripts. The only network traffic is loading the page itself. If a feature seems to need a server, stop and say so.
- **Never build JSON by hand.** Always `serializeDocument` / `parseDocument` from core.
- **Validate at every boundary** with the core schemas. Unknown keys are rejected on purpose.
- **No raw HTML rendering** of user text. No `dangerouslySetInnerHTML`. (The tour's popover text is built only from the app's own constants.)
- **The Confidence gate is a rule, not a suggestion.** Confidence above 2 needs an evidence entry with "what they do now"; 5 needs a commitment. Enforced in `updateIdea`; the UI mirrors it.
- **Ideas are never deleted casually.** Parking with a reason is the normal path.
- **No user-editable weights.** Potential is the plain average scaled to 100.
- **Sample data is fictional.** Never add anything that looks like a real idea of mine.
- **Feature-detect, never browser-sniff.** `supportsLocalFile()` is the only check.

## Writing conventions

Text in the UI, docs and commit messages uses Canadian English spelling, first person singular where a person speaks, and few em-dashes.

## Git

Main is protected; work on branches and open pull requests. Do not commit or push unless asked.
