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
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Hero />
      <Features />
      <Categories />
      <SocialProof />
      <Waitlist />
      <SeoCopy />
      <FaqSection />
    </>
  );
}
