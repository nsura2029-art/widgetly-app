"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE_CONFIG } from "@/lib/constants";
import { FadeIn } from "@/components/shared/fade-in";

/**
 * Final CTA strip just above the footer — converts visitors who scrolled
 * the whole page without joining the waitlist.
 */
export function CtaStrip() {
  return (
    <section className="relative py-16 sm:py-20">
      <div className="container">
        <FadeIn>
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
            className="relative overflow-hidden rounded-3xl border border-border/80 bg-dark p-8 text-white shadow-soft-lg sm:p-12"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-0 opacity-60"
              style={{
                background:
                  "radial-gradient(60% 80% at 80% 20%, rgba(91,108,255,0.4), transparent 60%), radial-gradient(50% 60% at 20% 100%, rgba(168,85,247,0.35), transparent 60%)",
              }}
            />
            <div className="relative z-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div className="max-w-xl">
                <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Build with us.
                </h3>
                <p className="mt-2 text-sm text-white/70 sm:text-base">
                  Widgetly is open source and built in public. Star us on
                  GitHub, contribute, or just follow along.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="bg-white text-dark hover:bg-white/90 hover:text-dark"
                >
                  <a
                    href={SITE_CONFIG.github}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <Github />
                    Star on GitHub
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="#waitlist">
                    Join Waitlist
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </FadeIn>
      </div>
    </section>
  );
}
