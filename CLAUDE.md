# Idea Matrix (app repo)

A local-first web app for scoring project ideas. Read `README.md` for what it is. `ROADMAP.md`, the reasons behind the design and what comes next, and `CLAUDE.local.md`, anything about my own ideas and accounts, are both private: gitignored, present only in my working copy, and never to be moved into tracked files or quoted in commit messages.

## Layout

- `packages/core`: schema (zod), formulas, the Confidence gate, CSV and Markdown, sample data. Pure TypeScript, no React, no browser APIs. Tests in `packages/core/test` (vitest).
- `packages/mcp`: the MCP server, CLI and Claude Desktop bundle (`manifest.json`). `src/server.ts` registers the tools, prompts and resource; `src/store.ts` is the atomic read-modify-write file store; `src/walkthrough.ts` holds the prompt text. Bundled to one file with tsup; `npm run bundle -w packages/mcp` builds `dist/idea-matrix.mcpb`. Tests use the SDK's in-memory transport.
- `apps/web`: Next.js app router, static export (`output: "export"`). shadcn/ui on Base UI, Tailwind 4, Zustand, TanStack Table, driver.js for the guided tour, idb-keyval for the IndexedDB cache.
- `apps/web/src/lib/store.ts` is the Zustand store; `apps/web/src/lib/file-session.ts` owns the file handle, autosave and the external-change watcher; `apps/web/src/lib/storage/local-file.ts` wraps the File System Access API.

## Commands

- `npm run dev` from the repo root starts the app (open it in Chrome or Edge).
- `npm run check` runs typecheck, lint, the Prettier check, tests and the static build, the same as CI. Run it before saying a change is done. `npm run format` rewrites files with Prettier; there is nothing to configure beyond `.prettierrc.json`.
- Two TypeScripts on purpose: each workspace typechecks with TypeScript 7, the native compiler, while the root pins TypeScript 5 for typescript-eslint and tsup, which need the old compiler API until 7.1 ships a new one. Leave both in place until then.
- End-to-end tests: `npm run test:e2e` runs the Playwright suite in `apps/web/e2e` (Chromium only, in CI after the build; two projects, the desktop specs under `e2e/` and the phone-layout specs under `e2e/phone/` on a phone viewport with touch emulation) against the static export, so run `npm run build` first when `apps/web/out` is missing or stale. The tests stand in for the file dialogs by replacing `window.showSaveFilePicker` and `window.showOpenFilePicker` with functions that return a handle from the browser's origin private file system, a real `FileSystemFileHandle`, so the app's file code runs unchanged and a test reads the file back through a second handle. `@playwright/test` is pinned to 1.62 because the Chromium that ships with 1.63 crashes when such a handle comes back out of IndexedDB after a reload; try a later release when one exists.
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

Text in the UI, docs and commit messages uses Canadian English spelling, first person singular where a person speaks, and few em-dashes. Plain and direct, not preachy: "explore which ones deserve your time" rather than "be honest with yourself".

Once the app is localized (a later roadmap step), English is no longer the only copy: every copy edit also updates the locale files, and any sentence that appears in more than one place comes from one shared constant (see `CONFIDENCE_GATE_SUMMARY` in core and `apps/web/src/lib/overview.ts`).

## Git

Main takes pull requests only, with a green CI check; GitHub enforces that now the repo is public. Do not commit or push unless asked. When asked to commit and the working tree holds unrelated changes, make one commit per concern rather than one commit for everything.

Every feature or fix gets its own branch and its own worktree, never a checkout of the main clone. Features are `feature/<short-name>`, fixes are `fix/<short-name>`. The worktrees live beside the clone, one directory per branch, named after it:

```
git worktree add ../worktrees/feature/<short-name> -b feature/<short-name> main
cd ../worktrees/feature/<short-name> && npm ci
```

Work, run `npm run check`, commit and push from that directory; the main clone stays on `main`. When the pull request has merged, `git worktree remove ../worktrees/feature/<short-name>` and delete the local branch; the remote branch deletes itself on merge.
