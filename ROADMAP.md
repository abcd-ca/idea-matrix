# Idea Matrix roadmap

This is the plan for taking the Idea Matrix beyond a Google Sheet. It used to sit on the matrix itself as row 29, "Idea Matrix SaaS", but scoring the tool that replaces the matrix is circular, so on 2026-09-04 I parked that row and moved the thinking here.

## What it is

The same decision matrix as a proper app: the five criteria (Reach, Impact, Profitability, Vision, Ease), Confidence, Potential and Score, colour bands, stage tracking, and a riskiest assumption per idea. No user-editable weights (decided 2026-09-04): the sheet had them, but they are a lever for fooling yourself and one more concept to teach. Potential is the plain average of the five scores scaled 0 to 100, computed in one place so weights could be added later if ever wanted. On top of that, a Claude-driven walkthrough that helps score each idea and prompts for the riskiest assumption, the way I work through ideas in the sheet now.

## What I decided on 2026-09-04

- **Not a business, at least not yet.** No subscription, no billing. It is a free tool.
- **Portfolio first.** The main payoff is showing my capabilities to local entrepreneurs, which is a plausible source of contract work.
- **First audience is BISS**, the Squamish entrepreneurs' meetup. Not a paying customer, but a good place to demo it and collect feedback.
- **Build it and polish it anyway.** I am taking an "if you build it they will come" attitude: ship something nice, demo it, and let the feedback decide what comes next.
- **Multi-user, no accounts of mine.** Each user keeps their own file in their own storage. There is no sign-up with me and no database of mine. See "Storage, privacy and trust" below.
- **The MCP server is the differentiator.** Users should be able to work on their matrix from Claude or another assistant, the way I do now through the local google-sheets MCP server.

## My own ideas

The Google Sheet is retired as the future source of truth on 2026-09-04 but stays exactly as it is: do not delete it or clear my ideas from it. A JSON backup in the draft app format lives outside this folder at `~/Documents/idea-matrix-private/my-ideas.ideamatrix.json` (27 ideas, scales, bands, Reach-is-estimate flags). It is what I will load into the app for my own use. It must never be copied into the app repo.

## Riskiest assumption

BISS members currently write their side-project ideas down somewhere and have at least once struggled to decide which one to work on.

This still matters even though I am building regardless. If people do not write ideas down at all, the app is a portfolio demo and does not need every feature polished. If they do, it is worth finishing properly. Testable at one meetup by asking people how they picked their last project, without mentioning the tool.

## Milestones

Order settled 2026-09-04: local file only for the MVP, then MCP, then Google Drive, then Dropbox. BISS demo-ready once Google Drive is in.

**Status 2026-09-06:** milestone 2 (MCP) is built: `packages/mcp` with seven tools, two prompts, the Markdown resource, the CLI, the Claude Desktop bundle manifest, and ten round-trip tests through the SDK's in-memory transport. Not yet tried: installing the .mcpb in a real Claude Desktop, and publishing the package to npm so the npx command works for others (until then, Claude Code can point at the built file directly).

**Status 2026-09-04:** milestone 1 is built and checked in as the first commit. Working end to end in Chromium: three-step setup, file created and written in place, example matrix, guided tour, matrix table with inline scores and bands, idea detail with the Confidence gate and evidence log, park with reason, Export (JSON, Markdown, CSV), Import CSV, privacy page, return visit reloading from the file. 32 core tests, typecheck, lint and static build pass. Pushed to https://github.com/abcd-ca/idea-matrix on 2026-09-06. Not yet done from the list below: a real test in Chrome on a Mac with the native file dialogs (the automated run stubbed the picker with an in-browser file).

1. **MVP: local file only.** Next.js static export, TypeScript, shadcn/ui and Tailwind, TanStack Table. JSON document, IndexedDB cache, File System Access API in Chrome and Edge with the alert for other browsers. Matrix table as the home screen with colour bands, stage chips and inline score editing; an idea detail view with the scale meanings and the Confidence rubric beside the scores. First run is three separate screens, one decision each, and each must be completed before the next: (1) where the file lives; (2) open an existing matrix file (file dialog, or the provider's picker, filtered to .ideamatrix.json and validated before loading) or create a new one (save dialog on this computer, folder picker in Drive, the app folder in Dropbox, default name ideas.ideamatrix.json); (3) only after creating, what goes in it: the fictional example or nothing. Opening an existing file skips step 3. CSV import is not part of first run; it lives in Settings as a one-time import of rows (e.g. from the spreadsheet template; this is how my own ideas move across, and they never touch the repo). A guided tour instead of an intro carousel: pointer callouts on the real matrix screen (driver.js or similar), five stops in order: stage chips, the five scores with their scales, Confidence with its rubric, Potential and the colour bands, Score. Runs once after setup; Help → "Show me around" replays it. Never assume the user knows what Reach, Impact, Ease, Confidence, Potential or Score mean. Parking: never delete an idea; "Park this idea…" (and choosing Parked in the Stage dropdown) opens a dialog that requires a one-sentence reason, sets Stage to Parked, keeps every field, and hides the idea from the default matrix. Parked ideas live under Parked in the left rail or behind a "Show parked" toggle, still showing Potential and Score as history, with an Unpark action back to Backlog. Delete exists only as a secondary link inside the Park dialog, for accidental entries. Evidence log (added 2026-09-04): each idea carries a list of conversation entries with three fields, who, what they currently do about the problem, and any commitment. Confidence above 2 requires an entry with the second field filled; 5 requires a commitment. This is a plain form rule, no model involved; the MCP walkthrough later can read the log and coach on it. The Confidence tour stop states the three Mom Test rules: talk about their life not your idea, ask what they did not what they would do, only a commitment counts as proof. Schema version and migrations, the Export dropdown (JSON, Markdown, CSV), the in-app trust page. Open source from the first commit.
2. **MCP server.** One Node package that is both a CLI and an MCP server against the local file: read a row, update a row, append an idea, park an idea, plus the "next idea" walkthrough as a built-in prompt. One-click Claude Desktop bundle and an npx command. Test with Claude Code and my local model.
3. **Google Drive target.** Browser-only sign-in, `drive.file` scope, Google Picker, revision check. Google brand verification submitted as soon as the milestone starts because it takes days. Use Claude's Chrome integration for the Google Cloud console setup. If preview deployments need Drive sign-in, give a long-lived branch a fixed domain in Vercel.
4. **BISS demo.** Collect feedback before deciding on a Tauri wrapper, OneDrive, encryption, or anything commercial.
5. **Dropbox target.** OAuth with PKCE in the browser, app folder, built-in revision check.

## Storage, privacy and trust

Settled 2026-09-04 after a long discussion. Tauri is a "maybe, later"; MCP is locked in but last.

The trust story is "nothing leaves your machine except to storage you own", which a user can verify in the network tab, rather than "trust my encryption", which they cannot.

- **One JSON document per matrix.** Human-readable, diffable, future-proof, and it is the export format. A top-level type field and a schema version identify it and drive migrations. Not SQLite: every save rewrites the whole file anyway, so SQLite would be an awkward container.
- **The document lives in memory while the app is open.** Potential and Score are computed in the browser. Edits apply to the in-memory document and the UI redraws at once.
- **IndexedDB is a cache, not a home.** It holds a working copy, the file handle or file id, and the last known revision, so the app opens instantly and survives a dropped connection. The user's own storage is the truth.
- **Write back about a second after each change**, not on a timer. Whole file each time. Check the remote revision first; on a mismatch (another computer saved first), download, reapply the edit, retry.
- **Save targets behind one interface**, chosen on first run with "where do you want to keep your ideas?", and changeable later from Settings ("move my matrix": copy the document to the new place, confirm it is there, switch, and leave the old file untouched). The document is in memory anyway, so a move is a save to a different target:
  1. **A file on this computer.** Chrome and Edge only, through the File System Access API. One file dialog on day one, one "Resume" click on each return, silent autosave in between. This quietly covers iCloud Drive, Dropbox, OneDrive and Google Drive folders for anyone running the sync client. Safari and Firefox users see an alert that this option needs Chrome or Edge, and are offered the cloud options instead. No download-based fallback. Detect the feature (`showSaveFilePicker` in `window`), not the browser, so support switches on by itself when another browser ships it; CLAUDE.md carries a reminder to re-check Safari and Firefox and update the alert wording.
  2. **Google Drive.** Browser-only sign-in through Google Identity Services, `drive.file` scope (only files the app creates or the user opens through the picker), Google Picker for choosing the folder or file. Non-sensitive scope, so app approval is brand verification only. Finish that before the BISS demo. Also the path for phones.
  3. **Dropbox.** OAuth with PKCE in the browser, app-folder access, built-in revision check on upload. Deferred until the MVP, MCP and Google Drive are working.
  4. OneDrive deferred until someone asks. iCloud has no usable browser file API; it is covered by option 1 on a Mac.
- **The OAuth token stays in the browser.** No server-side token exchange and no refresh tokens in any database of mine. My host serves the page and holds no idea text, no tokens and no file ids. The site can be a static export.
- **Bring your own AI, through MCP only.** No API keys in the app and no per-user cost to me. I considered a copy-and-paste "Discuss with AI" prompt and rejected it as clunky. MCP is the AI path, and it comes straight after the MVP.
- **No login system.** The local file needs none, and Google Drive's OAuth is the only sign-in the Drive target needs. No accounts of mine, ever.
- **A privacy and trust page inside the app.** Things the user can check for themselves: the network tab, where the file sits, the source. Plain statement that Google or Dropbox can see the file (it is plain JSON in their storage) and that the MCP server hands idea text to whichever assistant they connected. Keep third-party scripts to the two provider scripts and set a strict content security policy, because the token in the browser is only as safe as the page.
- **Optional later: encrypt the file before upload** for people who do not want Google or Dropbox to see it. Nothing else in the design changes.
- **Export and import.** One Export dropdown with three formats: JSON (a copy of the matrix file itself, which always round-trips; useful for cloud users wanting a local copy or anyone wanting a dated backup), Markdown (one section per idea, for reading and keeping), CSV (one row per idea, for a spreadsheet). Import from CSV (rows from a spreadsheet); opening a JSON file is just the normal open.
- **Open source.** MIT or Apache-2.0, no-telemetry promise in the README.
- **Sharing a matrix with someone else is out of scope.**

## Why an app rather than a sheet template

Decided 2026-09-04. The app enforces the Confidence rules and scale meanings at the point of scoring; it has no formula or dropdown maintenance (the sheet's "extend past row 32" problem); it gives every user MCP without a service account, which no non-technical person would set up for a Google Sheet; and the data-ownership story is stronger. Without MCP the sheet would be enough. With it, the app is the product and the sheet is the import source.

## Repo and delivery

- **Public GitHub repo under my account**, me as the only collaborator. Public is required for forks and pull requests from others. Branch protection on main: pull requests required, including mine, checks must pass.
- **Vercel deploys main to production.** Every branch and pull request gets a preview deployment automatically, so there is no staging branch. Revisit only at the Google Drive milestone, where sign-in needs a registered origin: a fixed domain on a long-lived branch solves it.
- **GitHub Actions on every pull request:** typecheck, lint, tests, build. Forks run with restricted permissions and no secrets, which is fine because the build needs none (a Google client ID is public by design).
- **Agent workflow:** the Claude Code GitHub action reviews pull requests when mentioned. My own features go through branches and pull requests so the same checks apply.
- **Local development:** plain `next dev` over http. Google and Dropbox both accept http://localhost as an origin and redirect, so no Caddy and no certificates. Next has a built-in HTTPS flag for the dev server if ever needed.
- **My own ideas never enter the repo.** Matrix files are gitignored. A fictional sample file lives in the repo for the "start with the example" door and for tests.

## Stack

Next.js, TypeScript, Vercel. shadcn/ui with Tailwind for components (accessible, current default in the Next.js world, does not impose a look the way Material does; Bootstrap would date the portfolio piece). TanStack Table for the matrix. Zustand for state rather than useState or Redux: its persist middleware takes a custom storage adapter, and idb-keyval makes IndexedDB one in a few lines, so the cache comes for free. The save target is separate: subscribe to the store, debounce, write the whole document. Mobile: the detail view works on narrow screens and the table collapses to a card list.

## Landscape (researched 2026-09-04)

Nothing combines human-scored weighted criteria, an evidence-based Confidence multiplier, a riskiest-assumption field, stage tracking and a user-owned file with no account. Nearest neighbours: generic weighted decision-matrix calculators (DecTrack, ToolNest: free, no account, but localStorage only, no confidence or stages); AI idea validators (Idea Score, Preuve, IdeaProof, WorthBuild: paid, cloud, AI assigns the score, widely mocked for handing out 75/100 to anything); PM tools (Productboard, airfocus, Ducalis: weighted scoring behind paid or team tiers); Notion and Sheets templates (the real competitor for my audience); tweakidea (Claude Code CLI, AI scores one idea at a time). The local-first, verify-in-the-network-tab angle is unoccupied in this niche, and an MCP server over a file in the user's own Drive would be the first of its kind found.

What this means for the plan:
- Headline: local-first plus the Mom Test framing ("your scores are hunches until you talk to people"). Contrast with AI validators.
- The AI walks you through scoring; you assign the number. Never "AI scores your idea".
- Import from the Google Sheet template early. Template-to-app is the only plausible adoption route.
- Realistic ceiling if published (Show HN, Indie Hackers): a few hundred stars and a handful of regulars. Fine for a portfolio piece.

## Untrusted input

Rules from 2026-09-04. The idea text, the file, the pasted-back AI block and later the MCP tool inputs are all untrusted.

- **Never build JSON by hand.** Always `JSON.stringify` and `JSON.parse`, in the app and in the MCP server. That is the whole answer to quotes and odd symbols.
- **Validate at every boundary with a schema** (zod or similar): file load, import, the pasted-back AI block, MCP tool inputs. Allowlist fields, enforce 1 to 5 ranges and the Stage values, reject unknown keys, cap file size. Schema validation also blocks prototype-pollution tricks.
- **No raw HTML rendering.** React's default escaping only. If descriptions ever get Markdown, render through a sanitiser. Strict content security policy; the only external scripts are the Google and Dropbox sign-in scripts. This is what protects the token in the browser.
- **The AI's answer is a proposal, not a command.** Wrap idea text in clear delimiters in the prompt and say it is data. Validate the pasted-back block, restrict it to the idea under discussion, and show a diff for the user to confirm before applying. Same for MCP: narrow tools, named fields only, no shell, no URL fetching.
- **A file someone else sends you is hostile until validated.** Parsing JSON never runs code; the risk is only where the content flows, so the two rules above cover it.

## Open questions

- Whether to wrap it in Tauri later for non-developers. It would remove the browser restriction on the local-file option and bundle the MCP server. Mac signing is covered by my existing Apple membership; Windows signing may be free through SignPath Foundation if the project is open source.
- Whether two computers editing at once ever matters enough to split the document into one file per idea.
- Which assistants people at BISS actually use, which decides how much the Claude Desktop bundle matters versus other MCP clients.
