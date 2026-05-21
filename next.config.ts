import type { NextConfig } from "next";

/** Use default `.next` so Vercel and `next start` work without extra config. */
const nextConfig: NextConfig = {
  distDir:
    process.env.VERCEL === "1" || process.env.CI === "true"
      ? ".next"
      : process.env.NODE_ENV === "production"
        ? ".next-build"
        : ".next",
};

export default nextConfig;
