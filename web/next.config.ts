import path from 'node:path';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@plateato/core'],
  experimental: {
    // @plateato/core is a symlinked local package living outside web/ (in
    // ../packages/core) — Turbopack won't resolve modules outside the app
    // root without this.
    externalDir: true,
  },
  turbopack: {
    // Turbopack only resolves files above this directory; without it,
    // ../packages/core (a sibling of web/) is unreachable even via symlink.
    root: path.join(__dirname, '..'),
  },
};

export default nextConfig;
