# Idea Matrix

Score your side-project ideas honestly, and keep the file yourself.

Idea Matrix is a small web app for people with more ideas than time. Each idea gets five scores from 1 to 5 (Reach, Impact, Profitability, Vision, Ease), which average into a **Potential** from 0 to 100. A separate **Confidence** score records how much real evidence sits behind those numbers, and **Score** is Potential × Confidence ÷ 5. Score only rises when you have talked to real people, so the newest, shiniest idea cannot jump the queue.

The scoring philosophy comes from *The Mom Test*: your scores are hunches until other people's behaviour backs them up. Every idea carries a riskiest assumption and an evidence log, and Confidence cannot go above 2 until that log records what someone actually does about the problem.

## Nothing leaves your machine

There are no accounts and no server of ours. Your matrix is one JSON file that you keep: on your computer, in a folder that your iCloud, Dropbox, OneDrive or Google Drive client syncs, or (coming later) directly in Google Drive or Dropbox. The site you load is static. It holds no data, no tokens and no telemetry, and you can confirm that yourself by watching the Network tab while you use it.

Saving a file in place needs the File System Access API, which today means Chrome or Edge. The app detects the feature, not the browser, so support switches on by itself when others ship it.

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

- `packages/core` holds the file format (zod schemas), the formulas, the Confidence gate, CSV and Markdown export, CSV import, and the fictional example matrix. No React and no browser APIs, so the future MCP server and CLI share it.
- `apps/web` is the Next.js app, exported as a static site.
- `ROADMAP.md` records the decisions behind the design and what comes next.

## Contributing

Pull requests are welcome. Every pull request runs typecheck, lint, tests and a build. A few rules that will not change:

- Never build JSON by hand; always stringify a parsed document.
- Validate every input at the boundary with the schemas in `packages/core`.
- No raw HTML rendering of user text.
- No telemetry, no analytics, no calls to anyone's server.

## Licence

MIT. See `LICENSE`.
