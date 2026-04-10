import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleapis.com" },
    ],
    unoptimized: true,
  },
  serverExternalPackages: ["bcryptjs", "better-sqlite3"],
};

export default nextConfig;
