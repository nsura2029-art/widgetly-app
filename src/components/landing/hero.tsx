"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComingSoonBadge } from "@/components/landing/coming-soon-badge";
import { SearchMockup } from "@/components/landing/search-mockup";
import { AnimatedBackground } from "@/components/shared/animated-background";

/**
 * Hero section — the very first thing visitors see.
 * Designed to feel Linear / Vercel / Stripe: tight typography,
 * generous whitespace, single focused message, one big search mockup.
 */
export function Hero() {
  const AUDIENCES = [
    "Students",
    "Teachers",
    "Professionals",
    "Creators",
    "Developers",
    "Marketers",
    "Businesses",
  ];

  const [audienceIndex, setAudienceIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [phase, setPhase] = useState<"typing" | "pausing" | "deleting">("typing");

  // play a subtle keystroke sound using WebAudio
  function playKeystroke() {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 1000 + Math.random() * 600;
      g.gain.value = 0.002;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.06);
      setTimeout(() => {
        o.stop();
        ctx.close();
      }, 80);
    } catch {
      // ignore if audio not available
    }
  }

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const current = AUDIENCES[audienceIndex] ?? "";

    if (phase === "typing") {
      const next = current.slice(0, displayText.length + 1);
      if (next === displayText) {
        setPhase("pausing");
      } else {
        t = setTimeout(() => {
          setDisplayText(next);
          playKeystroke();
          if (next === current) setPhase("pausing");
        }, 80 + Math.random() * 60);
      }
    } else if (phase === "pausing") {
      t = setTimeout(() => setPhase("deleting"), 900 + Math.random() * 400);
    } else if (phase === "deleting") {
      const next = current.slice(0, Math.max(0, displayText.length - 1));
      t = setTimeout(() => {
        setDisplayText(next);
        if (next === "") {
          setAudienceIndex((i) => (i + 1) % AUDIENCES.length);
          setPhase("typing");
        }
      }, 40);
    }

    return () => t && clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayText, phase, audienceIndex]);

  return (
    <section
      id="home"
      className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28 lg:pt-32 lg:pb-36"
    >
      <AnimatedBackground />

      <div className="container relative">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <ComingSoonBadge />

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 text-display-md font-semibold tracking-tight text-foreground sm:text-display-lg lg:text-display-xl whitespace-nowrap"
          >
            Every tool you need in one place
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg"
          >
            At your fingertips. Fast, simple, and 100% free.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="mt-6 text-base font-medium text-foreground"
          >
            Can’t find a tool you need?
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="mt-2 max-w-xl text-sm text-muted"
          >
            Tell us what you want — we’ll build it for you.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.6 }}
            className="mt-6 flex w-full max-w-sm gap-3"
          >
            <Button asChild size="lg" className="w-full">
              <Link href="/suggest">
                👉 Suggest a Tool
                <ArrowRight className="ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" className="w-full">
              <Link href="#waitlist">
                👉 Join Waitlist
                <ArrowRight className="ml-2" />
              </Link>
            </Button>
          </motion.div>

          <div className="mt-12 w-full">
            <SearchMockup />
          </div>
 
        </div>
      </div>
    </section>
  );
}
