import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const privateRobotsHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const utilityRobotsHeaders = [
  { key: "X-Robots-Tag", value: "noindex, follow" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    disableStaticImages: true,
  },
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/admin",
        headers: privateRobotsHeaders,
      },
      {
        source: "/admin/:path*",
        headers: privateRobotsHeaders,
      },
      {
        source: "/premium",
        headers: privateRobotsHeaders,
      },
      {
        source: "/premium/:path*",
        headers: privateRobotsHeaders,
      },
      {
        source: "/meu-perfil",
        headers: privateRobotsHeaders,
      },
      {
        source: "/meus-materiais",
        headers: privateRobotsHeaders,
      },
      {
        source: "/ferramentas/salvos",
        headers: privateRobotsHeaders,
      },
      {
        source: "/login",
        headers: utilityRobotsHeaders,
      },
      {
        source: "/configuracoes-cookies",
        headers: utilityRobotsHeaders,
      },
    ];
  },
};

export default nextConfig;
