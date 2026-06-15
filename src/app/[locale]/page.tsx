import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { Categories } from "@/components/landing/categories";
import { SocialProof } from "@/components/landing/social-proof";
import { Waitlist } from "@/components/landing/waitlist";
import { FaqSection } from "@/components/landing/faq-section";
import { SeoCopy } from "@/components/landing/seo-copy";
// CtaStrip + AdZone are disabled pre-launch; kept here for easy re-enable.
// import { CtaStrip } from "@/components/landing/cta-strip";
// import { AdZone } from "@/components/ads/ad-zone";

// Opt into per-request rendering. Required so the mascot seed (generated
// below with Math.random) is fresh on every visit. Without this, Next.js
// would cache the rendered HTML at build time and every visitor would
// see the same mascot. For a marketing landing page, the SSR cost is
// trivial and the per-request variation is the whole point.
export const dynamic = "force-dynamic";

/**
 * Single-page landing — sections composed in a deliberate funnel:
 * Hero → Features → Categories → SocialProof → Waitlist → SEO copy → FAQ.
 * The SEO copy and FAQ are below the fold but are server-rendered, fully
 * indexable, and load instantly because they ship with the initial HTML.
 *
 * `setRequestLocale` is required by next-intl for static rendering —
 * it scopes the in-request locale so server components can resolve
 * `getTranslations()` without re-deriving it.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Per-request random seed for the hero mascot picker. Generated on
  // the server (where Math.random() is stable within a single render)
  // and passed down so the SSR HTML and the client hydration see the
  // SAME pick. Without this, useId() alone would give every visitor
  // the same mascot (stable for hydration, but not actually random).
  // Rounded to a small int so the prop is cheap to serialize.
  // Math.random is fine here — this is a server component, it runs
  // exactly once per request. The react-hooks/purity rule is overly
  // broad for server components (it can't tell this isn't a client
  // component) so we disable it locally.
  // eslint-disable-next-line react-hooks/purity
  const mascotSeed = Math.floor(Math.random() * 1_000_000);

  return (
    <>
      <Hero mascotSeed={mascotSeed} />
      <Features />
      <Categories />
      <SocialProof />
      <Waitlist />
      <SeoCopy />
      <FaqSection />
    </>
  );
}
