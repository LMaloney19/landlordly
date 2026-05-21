import type { NextConfig } from "next";

/**
 * Local production builds use `.next-build` so `next build` does not clobber a
 * running dev server cache. Vercel always expects the default `.next` output.
 */
const nextConfig: NextConfig = {
  distDir:
    process.env.VERCEL === "1"
      ? ".next"
      : process.env.NODE_ENV === "production"
        ? ".next-build"
        : ".next",
};

export default nextConfig;
