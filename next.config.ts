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
  // For Workers, `headers()` here is no longer the right place since static
  // export is gone and the response is produced by the worker at request time.
};

export default nextConfig;
