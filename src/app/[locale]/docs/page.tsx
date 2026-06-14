import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { buildMetadata } from "@/lib/seo";
import { SwaggerStylesheets } from "./SwaggerStylesheets";

export const metadata: Metadata = buildMetadata({
  title: "API Documentation",
  description:
    "Interactive API reference for the Widgetly public HTTP API: waitlist, tool suggestions, and contact form. Powered by Swagger UI, served from the OpenAPI 3.0 spec at /api/openapi.json.",
  path: "/docs",
  keywords: ["widgetly api", "openapi", "swagger", "api documentation", "rest api"],
});

/**
 * GET /docs
 *
 * Interactive API documentation rendered by Swagger UI. The page
 * is server-rendered as a single HTML document; the only client
 * work is loading the Swagger UI bundle from /api-docs/* and the
 * OpenAPI spec from /api/openapi.json.
 *
 * The Swagger UI assets are static files copied to
 * `public/api-docs/` at install time (see `public/api-docs/`).
 * The custom initializer at `widgetly-initializer.js` points the
 * UI at our spec, enables the "Try it out" panel, and sets the
 * layout to StandaloneLayout so we don't need to render our own
 * top bar inside the doc.
 *
 * Why a Next.js page and not a route handler returning text/html?
 * Because we want `/docs` to be a real, bookmarkable Next.js
 * page with proper metadata — sitemap, canonical, OG tags, and
 * all the rest of the framework features.
 */
export default function DocsPage() {
  return (
    <div className="bg-background min-h-screen">
      {/* The Swagger UI stylesheets, injected after hydration.
          See `SwaggerStylesheets.tsx` for the rationale. */}
      <SwaggerStylesheets />

      {/* Top nav. The Swagger UI's StandaloneLayout provides its own
          header; ours sits above it so the docs feel like part of
          the Widgetly site, not a separate tool. */}
      <header className="border-border/60 border-b bg-white/90 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <span className="bg-brand-gradient flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white">
              W
            </span>
            Widgetly API
          </Link>
          <div className="text-muted flex items-center gap-3 text-xs">
            <a
              href="/api/openapi.json"
              className="hover:text-foreground underline-offset-4 hover:underline"
            >
              OpenAPI 3.0 spec
            </a>
            <span aria-hidden>·</span>
            <Link href="/" className="hover:text-foreground underline-offset-4 hover:underline">
              Back to widgetly.app
            </Link>
          </div>
        </div>
      </header>

      {/* The Swagger UI mounts into this element. The custom
          initializer at /api-docs/widgetly-initializer.js calls
          `SwaggerUIBundle({ url: '/api/openapi.json', dom_id: '#swagger-ui', ... })`. */}
      <section id="swagger-ui" className="min-h-[calc(100vh-3.5rem)]" />

      {/* The custom initializer points the UI at /api/openapi.json
          and enables the "Try it out" panel. The "Servers" dropdown
          in the UI lets readers flip between production, staging,
          and localhost without editing the spec. */}
      <script src="/api-docs/swagger-ui-bundle.js" charSet="UTF-8" async />
      <script src="/api-docs/swagger-ui-standalone-preset.js" charSet="UTF-8" async />
      <script src="/api-docs/widgetly-initializer.js" charSet="UTF-8" async />
    </div>
  );
}
