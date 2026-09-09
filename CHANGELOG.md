# Changelog

One section per release, newest first. `npm run bump` starts the next section from the commits since the previous release; the author trims it before the version reaches main, and the Release workflow uses the section as the release notes.

## 0.1.1 (2026-09-09)

- Google Drive as a second place to keep your matrix. Sign in with Google, pick a folder or an existing file, and the app reads and saves the file in your Drive with the narrowest permission Google offers: only files it created or you picked. Works in any browser, including on a phone. One sign-in covers the whole browser for about an hour; Settings has a Sign out of Google button.
- When two copies of the app save the same file, the later save brings in the other copy's changes idea by idea instead of overwriting them.
- Creating a file in Drive refuses to make a second one with the same name in the same folder, and says so.
- Phones: a tour that points at the cards, dialogs and tour popovers that never clip, fields that do not zoom the page, and a tighter setup wizard.
- A logo, with the favicon, the home-screen icons and the link-preview image generated from it. Headings in Nunito Sans.
- Link previews in chat apps and social sites show the logo and the tagline.
- Import from CSV is gone; Export to CSV stays.
- MCP server: `@idea-matrix/mcp` is on npm, so the `npx` command in Connect to AI agent works. A clear message when macOS keeps Claude Desktop out of a file in Desktop, Documents or Downloads, with the setting that fixes it. The server starts even when the file cannot be read, so the assistant can say what is wrong. Ideas are listed with their ids, so you can refer to one by number or id.
- The repository is public, with contributor guidelines, a security policy and pull request and issue templates.

## 0.1.0 (2026-09-08)

First release.

- The matrix: five scores (Reach, Impact, Profitability, Vision, Ease), Confidence, Potential and Score, colour bands, stages, a riskiest assumption and an evidence log per idea. Confidence cannot rise above 2 without a recorded conversation, or reach 5 without a commitment.
- Your matrix is one JSON file on your computer, saved in place through the File System Access API (Chrome and Edge). No accounts, no server, no telemetry.
- Three-step setup, a guided tour, Export to JSON, Markdown and CSV, Import from CSV, parking with a reason instead of deleting.
- An MCP server and command-line tool, with a one-click Claude Desktop extension, so Claude can read and score your ideas under the same rules.
- A build fingerprint shown in the app, published by CI and on every release, and `npm run verify` to check a running copy against it.
