import { defineConfig } from "tsup";

// One self-contained file, so the Claude Desktop bundle and npx both work
// without a node_modules folder next to it.
export default defineConfig({
  entry: { cli: "src/cli.ts" },
  format: ["esm"],
  platform: "node",
  target: "node20",
  bundle: true,
  noExternal: [/.*/],
  splitting: false,
  sourcemap: false,
  clean: true,
  minify: false,
  banner: { js: "#!/usr/bin/env node" },
});
