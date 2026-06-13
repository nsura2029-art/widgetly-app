"use client";

import { motion } from "framer-motion";
import { WaitlistForm } from "@/components/landing/waitlist-form";
import { FadeIn } from "@/components/shared/fade-in";
import { CountdownBlock } from "@/components/landing/coming-soon-badge";

/**
 * Waitlist call-to-action. Hosts the form, a four-cell countdown, and
 * trust signals (founder note, no-spam assurance).
 */
export function Waitlist() {
  return (
    <section
      id="waitlist"
      className="relative overflow-hidden border-t border-border/60 py-20 sm:py-28 lg:py-32"
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
          <span className="inline-flex items-center rounded-full border border-border/80 bg-white px-3 py-1 text-xs font-medium text-muted shadow-soft">
            Be the first
          </span>
          <h2
            id="waitlist-title"
            className="mt-4 text-display-sm font-semibold tracking-tight text-foreground sm:text-display-md"
          >
            Get early access to Widgetly.
          </h2>
          <p className="mt-4 text-base text-muted sm:text-lg">
            Join the waitlist for launch updates, sneak peeks, and a founders'
            discount when we go live.
          </p>
        </FadeIn>

        <FadeIn delay={0.15} className="mt-10">
          <WaitlistForm />
        </FadeIn>

        <FadeIn delay={0.3} className="mx-auto mt-16 max-w-2xl">
          <div className="mb-6 text-center text-xs font-medium uppercase tracking-wider text-muted">
            Launching in
          </div>
          <CountdownBlock className="mx-auto max-w-md" />

          <motion.blockquote
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-12 text-center"
          >
            <p className="text-base italic text-foreground/80 sm:text-lg">
              &ldquo;We're building the utility platform we always wished
              existed — one search bar away from anything you need.&rdquo;
            </p>
            <footer className="mt-4 text-sm text-muted">
              — The Widgetly team
            </footer>
          </motion.blockquote>
        </FadeIn>
      </div>
    </section>
  );
}
