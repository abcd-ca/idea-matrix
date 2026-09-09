# Security

Idea Matrix has no server of its own: the app is a folder of static files, the matrix lives in a file the user chose, and the MCP server runs on the user's machine. That keeps the surface small, but not zero. Things I would want to hear about:

- Any way the web app could send a user's ideas anywhere other than the storage they chose.
- Any way a crafted matrix file, CSV, or MCP tool input could run code, escape validation, or corrupt a file.
- Anything wrong with the build fingerprint or the release process that could let a served copy differ from the public code.

## Reporting

Please do not open a public issue for a vulnerability. Use GitHub's private vulnerability reporting on this repository, or reach me through [abcd.ca](https://abcd.ca). I will acknowledge within a few days and say what I plan to do.

## Scope

The web app at ideamatrix.io, the `@idea-matrix/mcp` package and Claude Desktop bundle, and the GitHub Actions workflows in this repository.
