import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

// next-intl plugin: wires the request config so server components can
// call getTranslations()/getLocale() with the right messages bundle.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  // Permanent (308) URL redirects. Runs at the request layer before
  // the page resolves, so it's safe to chain — the destination is the
  // canonical and the source is the historical/short URL.
  //
  // Note: the previous /blog/:slug → /blog/post/:slug redirect was the
  // band-aid for the URL mismatch (the blog index + SEO schema already
  // pointed at /blog/[slug]). After moving the route to /blog/[slug],
  // the redirect is no longer needed and would create a self-loop.
  async redirects() {
    return [
      // Shorter alias for the legal terms page.
      {
        source: "/terms",
        destination: "/terms-and-conditions",
        permanent: true,
      },
    ];
  },
  // -------------------------------------------------------------------------
  // HTTP response headers — Cloudflare cache + browser cache hints.
  //
  // Cloudflare `_headers` (public/_headers) only applies to static assets
  // served from the Worker's [assets] binding, NOT to dynamic HTML responses
  // from Next.js SSR. So we set Cache-Control here, via Next.js `headers()`,
  // for dynamic routes.
  //
  // The Cloudflare Cache Rule (configured in the dashboard) is the
  // belt-and-suspenders that catches any route that doesn't get a header
  // here. See docs/operations/cloudflare-optimization.md § 4.
  //
  // Caching strategy:
  //   - HTML for marketing/content routes: s-maxage=300 + SWR=1d so the
  //     edge serves 99% of requests without invoking the Worker. No more
  //     1102s on prerendered pages.
  //   - API + diag routes: no-store so D1 / KV writes always hit.
  //   - sitemap + robots: short edge cache, they're small and rarely change.
  // -------------------------------------------------------------------------
  async headers() {
    const CACHE_HTML = "public, s-maxage=300, stale-while-revalidate=86400";
    const CACHE_SITEMAP = "public, s-maxage=3600";
    const CACHE_IMMUTABLE = "public, max-age=31536000, immutable";
    const NO_STORE = "no-store, no-cache, must-revalidate";

    return [
      // Locale-prefixed HTML (marketing + tools + blog + legal + suggest UI)
      { source: "/en", headers: [{ key: "Cache-Control", value: CACHE_HTML }] },
      { source: "/es", headers: [{ key: "Cache-Control", value: CACHE_HTML }] },
      { source: "/fr", headers: [{ key: "Cache-Control", value: CACHE_HTML }] },
      {
        source: "/en/:path*",
        headers: [{ key: "Cache-Control", value: CACHE_HTML }],
      },
      {
        source: "/es/:path*",
        headers: [{ key: "Cache-Control", value: CACHE_HTML }],
      },
      {
        source: "/fr/:path*",
        headers: [{ key: "Cache-Control", value: CACHE_HTML }],
      },

      // sitemap + robots — short edge cache
      {
        source: "/:path*/sitemap.xml",
        headers: [{ key: "Cache-Control", value: CACHE_SITEMAP }],
      },
      {
        source: "/:path*/robots.txt",
        headers: [{ key: "Cache-Control", value: CACHE_SITEMAP }],
      },

      // API + diag — never cache
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: NO_STORE },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
      {
        source: "/diag/:path*",
        headers: [
          { key: "Cache-Control", value: NO_STORE },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },

      // Static assets — hashed filenames are safe to cache forever
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: CACHE_IMMUTABLE }],
      },
      {
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: CACHE_IMMUTABLE }],
      },
      {
        source: "/icons/:path*",
        headers: [{ key: "Cache-Control", value: CACHE_IMMUTABLE }],
      },
      {
        source: "/images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000" }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
