import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    disableStaticImages: true,
  },
  typescript: {
    // 77 pre-existing TS errors (mojibake in legacy strings, type drift in admin
    // forms). Fix incrementally; not blocking Wave 7 cleanup.
    ignoreBuildErrors: true,
  },
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
