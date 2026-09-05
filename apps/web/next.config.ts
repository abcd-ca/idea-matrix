import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A static site: the host serves files and holds no data, no tokens, no accounts.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@idea-matrix/core"],
  reactStrictMode: true,
  // Do not let Next write AGENTS.md / CLAUDE.md into apps/web; the repo root owns those.
  agentRules: false,
};

export default nextConfig;
