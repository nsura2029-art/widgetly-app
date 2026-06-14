import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  // `output: "export"` was removed in Next 16. OpenNext handles the
  // Workers output via its own adapter (see wrangler.toml).
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
  async redirects() {
    return [
      // Blog post URL restructure (2026-Q3): /blog/[slug] → /blog/post/[slug].
      // Old post URLs keep working for external links and search
      // engines until the new structure is fully indexed.
      {
        source: "/blog/:slug",
        destination: "/blog/post/:slug",
        permanent: true,
      },
      // Shorter alias for the legal terms page.
      {
        source: "/terms",
        destination: "/terms-and-conditions",
        permanent: true,
      },
    ];
  },
  // Security headers are applied via public/_headers (Cloudflare convention).
  // For Workers, `headers()` here is no longer the right place since static
  // export is gone and the response is produced by the worker at request time.
};

export default nextConfig;
