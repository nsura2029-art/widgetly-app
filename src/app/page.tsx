import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { Categories } from "@/components/landing/categories";
import { SocialProof } from "@/components/landing/social-proof";
import { Waitlist } from "@/components/landing/waitlist";
import { FaqSection } from "@/components/landing/faq-section";
import { SeoCopy } from "@/components/landing/seo-copy";
import { CtaStrip } from "@/components/landing/cta-strip";
import { AdZone } from "@/components/ads/ad-zone";

/**
 * Single-page landing — sections composed in a deliberate funnel:
 * Hero → Features → Categories → SocialProof → Waitlist → CtaStrip → SEO copy
 * → FAQ. The SEO copy and FAQ are below the fold but are
 * server-rendered, fully indexable, and load instantly because they ship
 * with the initial HTML. Ad zones are clearly labelled placeholders and
 * will be swapped for ad-network scripts once monetisation is enabled.
 * The global Footer is rendered by the root layout.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <AdZone slot="header" />
      <Features />
      <Categories />
      <SocialProof />
      <Waitlist />
      <AdZone slot="in-content" />
      <CtaStrip />
      <SeoCopy />
      <FaqSection />
      <AdZone slot="footer" />
    </>
  );
}
