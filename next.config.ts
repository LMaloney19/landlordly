import type { NextConfig } from "next";

/**
 * Dev (`next dev`) and production builds (`next build`) use separate output
 * folders so a build never corrupts the running dev cache (Internal Server Error).
 */
const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === "production" ? ".next-build" : ".next",
};

export default nextConfig;
