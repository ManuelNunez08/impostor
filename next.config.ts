import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix workspace root warning
  experimental: {
    turbo: {
      root: __dirname,
    },
  },
};

export default nextConfig;
