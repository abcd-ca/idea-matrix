import type { NextConfig } from "next";
import { buildCommit } from "../../scripts/build-commit.mjs";

// Baked in at build time so the app can say which commit it was built from.
// The build id is the commit too, so two builds of the same commit produce the
// same files and the same fingerprint (see scripts/fingerprint.mjs).
const commit = buildCommit();

// Vercel sets this for skew protection, and Next would bake it into every
// chunk and HTML file. A static site has no server to skew against, and the
// value differs per deployment, so it would make the build unreproducible.
delete process.env.NEXT_DEPLOYMENT_ID;

const nextConfig: NextConfig = {
  // A static site: the host serves files and holds no data, no tokens, no accounts.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@idea-matrix/core"],
  reactStrictMode: true,
  env: { NEXT_PUBLIC_BUILD_COMMIT: commit },
  generateBuildId: async () => commit,
  // Do not let Next write AGENTS.md / CLAUDE.md into apps/web; the repo root owns those.
  agentRules: false,
};

export default nextConfig;
