# Changelog

One section per release, newest first. `npm run bump` starts the next section from the commits since the previous release; the author trims it before the version reaches main, and the Release workflow uses the section as the release notes.

## 0.1.0 (2026-09-08)

First release.

- The matrix: five scores (Reach, Impact, Profitability, Vision, Ease), Confidence, Potential and Score, colour bands, stages, a riskiest assumption and an evidence log per idea. Confidence cannot rise above 2 without a recorded conversation, or reach 5 without a commitment.
- Your matrix is one JSON file on your computer, saved in place through the File System Access API (Chrome and Edge). No accounts, no server, no telemetry.
- Three-step setup, a guided tour, Export to JSON, Markdown and CSV, Import from CSV, parking with a reason instead of deleting.
- An MCP server and command-line tool, with a one-click Claude Desktop extension, so Claude can read and score your ideas under the same rules.
- A build fingerprint shown in the app, published by CI and on every release, and `npm run verify` to check a running copy against it.
