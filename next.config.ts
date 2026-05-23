import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },

  // NOTE: www → apex redirect is handled by Vercel at the edge (Domain
  // Settings in the Vercel dashboard). Do NOT add a Next.js redirect for the
  // host here — it caused a redirect loop with Vercel's edge routing.

  async redirects() {
    return [
      // The Rachio Rebate Calculator was renamed to the Water Savings
      // Calculator. Google still indexes the old URL (with and without
      // trailing slash) and is throwing 404s. Permanent redirect preserves
      // any link equity and stops the 404s for real users coming in from
      // stale SERP entries.
      {
        source: "/smart-controllers/rachio-rebate-calculator",
        destination: "/smart-controllers/water-savings-calculator",
        permanent: true,
      },
      {
        source: "/smart-controllers/rachio-rebate-calculator/",
        destination: "/smart-controllers/water-savings-calculator",
        permanent: true,
      },
    ]
  },

  async headers() {
    const securityHeaders = [
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(self)",
      },
    ]

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      // Make robots.txt and llms.txt highly cacheable
      {
        source: "/robots.txt",
        headers: [
          { key: "Content-Type", value: "text/plain; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=86400" },
        ],
      },
      {
        source: "/llms.txt",
        headers: [
          { key: "Content-Type", value: "text/plain; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=86400" },
        ],
      },
      {
        source: "/pricing.md",
        headers: [
          { key: "Content-Type", value: "text/markdown; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=86400" },
        ],
      },
    ]
  },
}

export default nextConfig
