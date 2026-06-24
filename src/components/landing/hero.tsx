"use client";

import { Link } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ComingSoonBadge } from "@/components/landing/coming-soon-badge";
import { RandomMascot } from "@/components/landing/mascots";
import { SearchMockup } from "@/components/landing/search-mockup";
import { AnimatedBackground } from "@/components/shared/animated-background";

/**
 * Hero section — the very first thing visitors see. Translated via
 * next-intl; the audience-rotation words (Students / Teachers / …)
 * are pulled from the `home.hero.audiences` namespace and cycled
 * by the typewriter effect.
 */
export function Hero({ mascotSeed }: { mascotSeed?: number } = {}) {
  const t = useTranslations("home.hero");
  const audiences = [
    t("audiences.students"),
    t("audiences.teachers"),
    t("audiences.professionals"),
    t("audiences.creators"),
    t("audiences.developers"),
    t("audiences.marketers"),
    t("audiences.businesses"),
  ];

  const [audienceIndex, setAudienceIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [phase, setPhase] = useState<"typing" | "pausing" | "deleting">("typing");

  function playKeystroke() {
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
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
      // ignore
    }
  }

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const current = audiences[audienceIndex] ?? "";

    if (phase === "typing") {
      const next = current.slice(0, displayText.length + 1);
      if (next === displayText) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPhase("pausing");
      } else {
        t = setTimeout(
          () => {
            setDisplayText(next);
            playKeystroke();
            if (next === current) setPhase("pausing");
          },
          80 + Math.random() * 60
        );
      }
    } else if (phase === "pausing") {
      t = setTimeout(() => setPhase("deleting"), 900 + Math.random() * 400);
    } else if (phase === "deleting") {
      const next = current.slice(0, Math.max(0, displayText.length - 1));
      t = setTimeout(() => {
        setDisplayText(next);
        if (next === "") {
          setAudienceIndex((i) => (i + 1) % audiences.length);
          setPhase("typing");
        }
      }, 40);
    }

    return () => t && clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayText, phase, audienceIndex]);

  return (
    <section id="home" className="relative overflow-hidden pb-8 sm:pb-12 lg:pb-16">
      <AnimatedBackground />

      <div className="relative container">
        <div className="mx-auto grid max-w-6xl items-center gap-7 min-[500px]:grid-cols-[minmax(0,1fr)_9.5rem] min-[500px]:gap-5 sm:grid-cols-[minmax(0,1fr)_13rem] sm:gap-8 lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-14">
          <div className="flex min-w-0 flex-col items-center text-center min-[500px]:items-start min-[500px]:text-left">
            <ComingSoonBadge />

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="text-foreground sm:text-display-lg lg:text-display-xl mt-7 max-w-[12ch] text-4xl leading-[1.08] font-semibold text-wrap sm:max-w-[13ch] lg:max-w-[15ch]"
            >
              {t("title")}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="text-muted mt-4 max-w-2xl text-base leading-relaxed sm:text-lg"
            >
              <span>{t("subtitle")}</span>{" "}
              <span className="text-foreground font-medium">{displayText}</span>
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.6 }}
              className="text-foreground mt-6 text-base font-medium"
            >
              {t("askPrompt")}
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.6 }}
              className="text-muted mt-2 max-w-xl text-sm"
            >
              {t("askCta")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.6 }}
              className="mt-6 flex w-full max-w-sm flex-col gap-3 min-[390px]:flex-row"
            >
              <Button asChild size="lg" className="w-full">
                <Link href="/suggest">
                  {t("suggestTool")}
                  <ArrowRight className="ml-2" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="w-full">
                <Link href="/tools">
                  {t("browseTools", { defaultValue: "Browse tools" })}
                  <ArrowRight className="ml-2" />
                </Link>
              </Button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="border-border/80 shadow-soft relative mx-auto hidden aspect-square w-full max-w-[13rem] overflow-hidden rounded-xl border bg-white/90 min-[500px]:block lg:max-w-sm"
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-50"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(17, 24, 39, 0.18) 1px, transparent 0)",
                backgroundSize: "18px 18px",
              }}
            />
            <div className="border-border/70 absolute inset-4 rounded-lg border bg-white/80 lg:inset-8">
              <div className="flex h-full items-center justify-center">
                <RandomMascot
                  seed={mascotSeed}
                  className="h-24 w-24 sm:h-32 sm:w-32 lg:h-44 lg:w-44"
                />
              </div>
            </div>
          </motion.div>

          <div className="min-[500px]:col-span-2 lg:col-span-1 lg:col-start-1">
            <SearchMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
