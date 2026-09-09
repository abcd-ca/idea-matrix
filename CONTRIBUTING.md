# Contributing

Thanks for looking. Idea Matrix is a small project I maintain on my own, so this page is short.

## Before a big change

Open an issue first and say what problem you are solving. Small fixes, copy, and translations can go straight to a pull request.

## Getting set up

Use the Node version in `.node-version`, then:

```
npm ci
npm run dev
```

Open the app in Chrome or Edge. Before you push, run the same checks CI runs:

```
npm run check
```

That is typecheck, lint, the Prettier check, the tests and a static build. `npm run format` rewrites files with Prettier.

## Rules that do not change

- Nothing leaves the machine. No fetch to any server except the storage the user chose, no analytics, no telemetry, no external scripts.
- Never build JSON by hand. Always `serializeDocument` and `parseDocument` from `packages/core`.
- Validate at every boundary with the core schemas.
- No raw HTML rendering of user text.
- The Confidence gate is a rule, not a suggestion. Confidence above 2 needs an evidence entry; 5 needs a commitment.
- Ideas are never deleted casually. Parking with a reason is the normal path.
- Sample data is fictional.
- Feature-detect, never browser-sniff.

If a change seems to need one of these to bend, say so in the issue and we can talk about it.

## Style

Text in the app, the docs and commit messages uses Canadian English spelling ("colour", "licence", "organize"), plain and direct. Where a person speaks, it is first person singular. Prettier handles the code style; there is nothing to argue about.

## Pull requests

- One concern per pull request, from a branch on your fork.
- Say what changed and why. A screenshot helps for anything visual.
- CI must be green. Main only takes pull requests.
- I review and merge. I am one person, so give me a few days.

`CLAUDE.md` describes the codebase for Claude Code; it doubles as a map of where things are if you read it as a person.

## Licence

Contributions are MIT, the same as the rest of the project. By opening a pull request you agree to that.
