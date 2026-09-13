import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // mysql2 relies on dynamic requires internally; keep it out of the bundler.
  serverExternalPackages: ["mysql2"],
  // Pin the bundler root to this app. Without it Turbopack walks up to the
  // home directory looking for a lockfile / git root.
  turbopack: { root: process.cwd() },
};

export default nextConfig;
