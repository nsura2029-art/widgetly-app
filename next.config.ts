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
  // Security headers are applied via public/_headers (Cloudflare convention).
  // For Workers, `headers()` here is no longer the right place since static
  // export is gone and the response is produced by the worker at request time.
};

export default nextConfig;
