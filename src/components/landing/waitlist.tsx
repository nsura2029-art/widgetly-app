"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { WaitlistForm } from "@/components/landing/waitlist-form";
import { FadeIn } from "@/components/shared/fade-in";
import { CountdownBlock } from "@/components/landing/coming-soon-badge";

/**
 * Waitlist call-to-action. Hosts the form, a four-cell countdown, and
 * trust signals (founder note, no-spam assurance). The pill, title,
 * subtitle, countdown label, and founder quote are translated.
 */
export function Waitlist() {
  const t = useTranslations("home.waitlist");
  return (
    <section
      id="waitlist"
      className="border-border/60 relative overflow-hidden border-t py-8 sm:py-12 lg:py-14"
      aria-labelledby="waitlist-title"
    >
      {/* Background gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(91,108,255,0.08), transparent 70%), radial-gradient(50% 40% at 80% 100%, rgba(168,85,247,0.08), transparent 70%)",
        }}
      />

      <div className="container">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <span className="border-border/80 text-muted shadow-soft inline-flex items-center rounded-full border bg-white px-3 py-1 text-xs font-medium">
            {t("pill")}
          </span>
          <h2
            id="waitlist-title"
            className="text-display-sm text-foreground sm:text-display-md mt-4 font-semibold tracking-tight"
          >
            {t("title")}
          </h2>
          <p className="text-muted mt-4 text-base sm:text-lg">{t("subtitle")}</p>
        </FadeIn>

        <FadeIn delay={0.15} className="mt-10">
          <WaitlistForm />
        </FadeIn>

        <FadeIn delay={0.3} className="mx-auto mt-16 max-w-2xl">
          <div className="text-muted mb-6 text-center text-xs font-medium tracking-wider uppercase">
            {t("countdown.label")}
          </div>
          <CountdownBlock className="mx-auto max-w-md" />

          <motion.blockquote
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-12 text-center"
          >
            <p className="text-foreground/80 text-base italic sm:text-lg">{t("founderQuote")}</p>
            <footer className="text-muted mt-4 text-sm">{t("founderAttribution")}</footer>
          </motion.blockquote>
        </FadeIn>
      </div>
    </section>
  );
}
