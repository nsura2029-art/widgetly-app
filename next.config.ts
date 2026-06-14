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
  // Security headers are applied via public/_headers (Cloudflare convention).
};

export default withNextIntl(nextConfig);
