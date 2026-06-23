import { setRequestLocale } from "next-intl/server";
import { softwareApplicationJsonLd } from "@/lib/seo";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { Categories } from "@/components/landing/categories";
import { SocialProof } from "@/components/landing/social-proof";
import { CategoriesShowcase } from "@/components/landing/categories-showcase";
import { SeoCopy } from "@/components/landing/seo-copy";
// CtaStrip + AdZone are disabled pre-launch; kept here for easy re-enable.
// import { CtaStrip } from "@/components/landing/cta-strip";
// import { AdZone } from "@/components/ads/ad-zone";

// Static prerendering (the default in App Router for pages without
// dynamic data sources). The home page has no per-request data —
// everything is the same for every visitor — so we let Next.js
// prerender it at build time and serve from Cloudflare's edge cache.
//
// Previous setup was `export const dynamic = "force-dynamic"` so the
// mascot picker could use Math.random() per request. That worked but
// had two costs:
//
//   1. Every home-page request hit the Worker runtime for full SSR,
//      not the edge cache. A spike in traffic or a slow render could
//      push the Worker over its CPU/memory limits and return a
//      Cloudflare 1102 ('Worker exceeded resource limits') error to
//      real visitors. We saw this in production on 2026-06-18 around
//      01:07 UTC.
//
//   2. SSR cost on every request — wasteful when the output is the
//      same for every visitor. With 150KB+ HTML + framer-motion + all
//      landing sections, each request was O(component-tree) work.
//
// Trade-off: every visitor sees the same mascot (the one picked by
// React's useId() at build time). The mascot still varies per
// component instance, just not per visitor. Acceptable for an MVP;
// revisit when we have a real reason for per-visitor variation.

/**
 * Single-page landing — sections composed in a deliberate funnel:
 * Hero → Features → Categories → SocialProof → SEO copy →
 * CategoriesShowcase.
 *
 * The Waitlist section was removed in 2026-06 per product decision:
 * the public launch is close enough that the friction of email signup
 * outweighs the lead-capture benefit. The `/api/waitlist` endpoint and
 * the waitlist D1 table remain in place — we may re-enable the section
 * in a future iteration, e.g. for a beta program.
 *
 * The CategoriesShowcase (above the footer) replaces the previous
 * `<FaqSection />`. Rationale: bottom-of-page decisions convert better
 * than mid-page Q&A for a 500+ tools platform. The FAQ content still
 * ships in the i18n bundle under `faq.items.*` and `home.faq.*` so it
 * stays available for a dedicated `/faq` route (TODO) and for any
 * later re-introduction.
 *
 * The SEO copy is below the fold but is server-rendered, fully
 * indexable, and loads instantly because it ships with the initial HTML.
 *
 * `setRequestLocale` is required by next-intl for static rendering —
 * it scopes the in-request locale so server components can resolve
 * `getTranslations()` without re-deriving it.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // JSON-LD for the home page only — moved out of the root layout
  // so they only appear where the visible content matches the
  // schema. See [locale]/layout.tsx for the rationale.
  // (FAQPage schema removed in lockstep with the visible FAQ section —
  // Google penalises schema that doesn't match visible content.)
  const jsonLdApp = softwareApplicationJsonLd();

  return (
    <>
      {/* SoftwareApplication (the platform). WebSite + Organization are
          emitted by the root layout. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdApp) }}
      />
      {/* No mascotSeed prop — RandomMascot falls back to useId() so
          every visitor sees the build-time pick. Stable for hydration. */}
      <Hero />
      <Features />
      <Categories />
      <SocialProof />
      <SeoCopy />
      <CategoriesShowcase />
    </>
  );
}
