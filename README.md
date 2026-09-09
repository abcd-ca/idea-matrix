# Idea Matrix

Score your project ideas, and keep the file yourself.

Use it at [ideamatrix.io](https://ideamatrix.io). Nothing to install, nothing to sign up for. If you would rather have it as an app with its own window and icon, Chrome and Edge can install it (the button is in Settings; on an iPhone or iPad it is Share, then Add to Home Screen), and once loaded it works without a connection.

Idea Matrix is a small web app for people with more ideas than time. Each idea gets a value of 1 to 5 for Reach, Impact, Profitability, Vision and Ease (Profitability may also be 0, for something deliberately non-commercial), and their average becomes a **Potential** from 0 to 100. A separate **Confidence** score records how much real evidence sits behind those numbers, and **Score** is Potential × Confidence ÷ 5. Score only rises when you have talked to real people, so the newest, shiniest idea cannot jump the queue.

The scoring philosophy comes from [_The Mom Test_](https://www.momtestbook.com/), Rob Fitzpatrick's short book on how to talk to customers without being lied to: ask about people's lives and what they already do, not about your idea, and treat only commitments as proof. In matrix terms, your scores are hunches until other people's behaviour backs them up. Every idea carries a riskiest assumption and an evidence log, and Confidence cannot go above 2 until that log records what someone actually does about the problem.

## Nothing leaves your machine

There are no accounts and no server behind it. Your matrix is one JSON file that you keep: on your computer, in a folder that your iCloud, Dropbox, OneDrive or Google Drive client syncs, or (coming later) directly in Google Drive or Dropbox. The site you load is static. It holds no data, no tokens and no telemetry, and you can confirm that yourself by watching the Network tab while you use it.

Saving a file in place needs the File System Access API, which today means Chrome or Edge. The app detects the feature, not the browser, so support switches on by itself when others ship it.

## Languages

The app speaks Canadian English, French (Canada), American English and Spanish; pick one under **Settings → This device**, or on the first screen of setup, and the choice stays with that browser rather than with your file. The French and Spanish translations were made by an AI and have not yet been checked by a native speaker, so corrections are welcome as pull requests: the text lives in `apps/web/src/locales`, and `CONTRIBUTING.md` explains the layout.

## Dark mode

The app follows your system's light or dark setting by default. To keep it one way on a device, pick **Light** or **Dark** under **Settings → This device**; like the language, the choice stays with that browser rather than with your file.

## AI assistants

`packages/mcp` is a small program that lets an AI assistant such as Claude, Claude Code, ChatGPT or Perplexity read and update your matrix through the Model Context Protocol, on your machine, against the same file and the same rules as the app. Any assistant that can run a local MCP server works: it ships as a one-click Claude Desktop extension and as an `npx` command for everything else, and it doubles as a command-line tool. The **Connect to AI agent** button in the app shows the steps; `packages/mcp/README.md` has the full instructions. The assistant walks you through scoring; you assign the numbers, and Confidence still cannot rise without a recorded conversation.

## Running it locally

Requires Node 22 (see `.node-version`).

```
npm install
npm run dev
```

Then open http://localhost:3000 in Chrome or Edge.

Other scripts:

```
npm run check       # typecheck, lint, test, build
npm test            # core package tests (vitest)
npm run build       # static export to apps/web/out
```

## Layout

- `packages/core` holds the file format (zod schemas), the formulas, the Confidence gate, CSV and Markdown export, and the fictional example matrix. No React and no browser APIs, so the MCP server and CLI share it.
- `apps/web` is the Next.js app, exported as a static site.
- `packages/mcp` is the MCP server, Claude Desktop bundle and CLI, built on the core package.
- The decisions behind the design and what comes next live in a roadmap I keep outside the repo.

## Contributing

Pull requests are welcome; `CONTRIBUTING.md` has the setup and the house style. Every pull request runs typecheck, lint, the Prettier check, tests and a build. A few rules that will not change:

- Never build JSON by hand; always stringify a parsed document.
- Validate every input at the boundary with the schemas in `packages/core`.
- No raw HTML rendering of user text.
- No telemetry, no analytics, no calls to anyone's server.

## Licence

MIT. See `LICENSE`.

## Verify the build

Every build carries a fingerprint, so you can check that the copy you are using is the code in this repo and not something else. The fingerprint is the SHA-256 of a `sha256sum`-style list of every file the site serves. Both the list (`build.sha256`) and a summary with the commit and version (`build.json`) are served next to the app, and the app shows the fingerprint under **Settings → This build** and on the privacy page, with the commit it was built from. CI computes the same fingerprint for that commit and prints it in the job summary you reach from the commit's checks on GitHub, and every release lists it together with the SHA-256 of `idea-matrix.mcpb`.

To check a running copy yourself, with nothing but Node installed:

```
git clone https://github.com/abcd-ca/idea-matrix.git
cd idea-matrix
npm run verify -- https://ideamatrix.io
```

That downloads `build.json`, fetches every file it lists, hashes each one, and recomputes the fingerprint from what was actually served. Then compare the fingerprint with the one GitHub shows for that commit. To go one step further, check out the commit, run `npm ci && npm run build`, and compare `apps/web/out/build.sha256` with the served one.

For the Claude Desktop extension, `shasum -a 256 idea-matrix.mcpb` on your download should match the release notes, and `idea-matrix version` prints the commit the bundle was built from.

## Maintainer

Idea Matrix is made and maintained by [Andrew Blair](https://abcd.ca), who builds apps and tools like this one for clients. Contributions are welcome through pull requests, and everyone who has landed one is on the [contributors page](https://github.com/abcd-ca/idea-matrix/graphs/contributors).
