import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray lockfile in the home directory would otherwise be picked as the workspace root.
  turbopack: { root: process.cwd() },
  // `next dev` would otherwise append its own boilerplate block to CLAUDE.md (our source of truth) on every run.
  agentRules: false,
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
