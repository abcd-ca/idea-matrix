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

## Editing or adding a language

Every string the app shows lives in `apps/web/src/locales/<language>/<namespace>.json`: `common`, `setup`, `matrix`, `idea`, `settings`, `tour`, `privacy` and `whatsnew`, plus `core` for the text that comes from `packages/core` (scale labels, questions and level meanings, stage descriptions, formulas, bands, the Confidence gate, the errors it can raise, the labels in a Markdown or CSV export) and `sample` for the words of the nine example ideas, whose English also lives in core (`SAMPLE_TEXT`). `en-CA` is the source of truth. `en-US` holds only the strings whose spelling differs from `en-CA`; everything it leaves out falls back to the Canadian text. `fr-CA` and `es` are full translations, made by an AI, and corrections from people who speak the language are the most welcome pull requests there are.

- To fix a translation, edit the value in that language's file and leave the key alone. `{{name}}` is a placeholder the app fills in; `<a>…</a>`, `<b>…</b>`, `<strong>…</strong>`, `<code>…</code>` mark text the app wraps in a link or emphasis, so keep the tags and translate what is inside them; a self-closing tag such as `<file/>` stands for something the app inserts whole (a file name, an icon) and must stay as it is.
- Keep the scale words consistent throughout a language: Reach, Impact, Profitability, Vision, Ease, Confidence, Potential and Score each get one translation, used everywhere. Product names (Idea Matrix, Google Drive, Claude, The Mom Test) stay as they are.
- To change English copy, edit `en-CA` first, then update the other three (or, for `en-US`, add or remove an override). A sentence that appears in more than one place comes from one key; do not paste it twice.
- To add a language, copy the `en-CA` folder to a new tag (for example `pt-BR`), translate every file, write `core.json` and `sample.json` from the keys in the `fr-CA` ones, add the tag to `LANGUAGES` and its own name to `LANGUAGE_NAMES` in `apps/web/src/lib/preferences.ts`, add it to `resources` in `apps/web/src/lib/i18n.ts`, and add its unit-test expectation to `apps/web/test/preferences.test.ts`. The inline script in the root layout picks the new tag up from `LANGUAGES` by itself. Dates come from `Intl` with the language tag, so nothing else needs translating.
- The MCP server and CLI stay English. So does the build-planning offer in the sidebar and on the privacy page (`consulting` in `common.json`, `who.p2` in `privacy.json`): the sessions are held in English, so those keys exist only in `en-CA` and the other languages fall back to them on purpose. Do not add translations for them.

`npm run check` catches a JSON file that will not parse and a key that Prettier would format differently; it does not catch a missing key, which simply falls back to English on screen, so click through the app in the language you changed.

## Pull requests

- One concern per pull request, from a branch on your fork.
- A pull request that adds a feature people will see also adds an entry to `apps/web/src/lib/whats-new.ts`, with its title and one sentence in every language; a bug fix does not.
- Say what changed and why. A screenshot helps for anything visual.
- CI must be green. Main only takes pull requests.
- I review and merge. I am one person, so give me a few days.

`CLAUDE.md` describes the codebase for Claude Code; it doubles as a map of where things are if you read it as a person.

## Licence

Contributions are MIT, the same as the rest of the project. By opening a pull request you agree to that.
