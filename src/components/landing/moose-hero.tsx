import * as React from "react";
import { ArrowRight, Rocket, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { MooseMascot } from "@/components/landing/mascots";
import { AnimatedBackground } from "@/components/shared/animated-background";

/**
 * Big Hero Banner for the homepage — Moose mascot on the right, value
 * prop + CTA on the left. Server component so the homepage stays
 * statically prerendered (the same constraint that motivated the
 * `useId()`-based mascot picker in the previous Hero).
 *
 * The layout is two columns on `lg+` (text + CTA on the left in a
 * 5/12 column, mascot on the right in 7/12) and stacked on smaller
 * viewports. The whole banner sits on top of `AnimatedBackground`
 * for the same dotted/soft-fade backdrop the rest of the landing
 * uses, so it visually anchors to the site identity.
 *
 * CTA copy intentionally mirrors the `/suggest/new` page ("Submit Idea
 * & Start Earning Wits") so the visitor sees the same promise on the
 * home banner and the form they land on.
 */
export async function MooseHero() {
  const t = await getTranslations("home.mooseHero");

  return (
    <section
      id="home"
      aria-labelledby="moose-hero-title"
      className="relative overflow-hidden pb-10 sm:pb-14 lg:pb-20"
    >
      <AnimatedBackground />

      <div className="relative container">
        <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-12 lg:gap-10">
          {/* LEFT — text + CTA + hook */}
          <div className="flex min-w-0 flex-col items-start text-left lg:col-span-7">
            <span className="border-primary/20 bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              {t("eyebrow")}
            </span>

            <h1
              id="moose-hero-title"
              className="text-foreground mt-5 text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl"
            >
              {t("title")}
            </h1>

            <p className="text-muted mt-4 max-w-2xl text-lg leading-relaxed sm:text-xl">
              {t("subtitle")}
            </p>

            {/* Sub-CTA card: "Submit your idea → Earn Wits + Real Rewards" */}
            <div className="border-primary/20 bg-primary/5 shadow-soft mt-7 w-full max-w-2xl rounded-2xl border p-5 sm:p-6">
              <p className="text-foreground text-base font-semibold sm:text-lg">
                <Rocket className="text-primary mr-2 inline-block h-5 w-5 align-text-bottom" />
                {t("askPrompt")}
              </p>
              <p className="text-primary mt-2 text-base font-medium">{t("askHeadline")}</p>
              <p className="text-muted mt-2 text-sm leading-relaxed sm:text-base">{t("askBody")}</p>

              <div className="mt-5 flex flex-col gap-3 min-[420px]:flex-row">
                <Button asChild variant="success" size="xl" className="w-full sm:w-auto">
                  <Link href="/suggest/new">
                    {t("cta")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
                  <Link href="/suggest">{t("ctaBrowse")}</Link>
                </Button>
              </div>
            </div>

            {/* Hook line */}
            <p className="text-muted mt-5 max-w-2xl text-sm italic sm:text-base">
              &ldquo;{t("hook")}&rdquo;
            </p>
          </div>

          {/* RIGHT — Moose mascot */}
          <div className="relative mx-auto flex w-full max-w-sm items-center justify-center lg:col-span-5 lg:max-w-none">
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 opacity-60"
              style={{
                background:
                  "radial-gradient(circle at 50% 45%, rgba(167,139,250,0.30) 0%, rgba(167,139,250,0) 65%)",
              }}
            />
            <div className="border-border/60 shadow-soft relative aspect-square w-full max-w-[18rem] overflow-hidden rounded-3xl border bg-white/80 backdrop-blur-sm sm:max-w-[20rem] lg:max-w-[22rem]">
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-50"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, rgba(17, 24, 39, 0.18) 1px, transparent 0)",
                  backgroundSize: "18px 18px",
                }}
              />
              <div className="border-border/50 absolute inset-4 rounded-2xl border bg-white/90 sm:inset-6">
                <div className="flex h-full items-center justify-center">
                  <div className="h-44 w-44 sm:h-52 sm:w-52 lg:h-60 lg:w-60">
                    <MascotFrame />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Thin wrapper around `<MooseMascot />` that re-uses the same idle
 * animations as the random pool mascots (`.wly-mascot-float`,
 * `.wly-mascot-jump`, `.wly-mascot-tilt`). Lives in a separate
 * component so the SSR HTML matches what the client first paints
 * — no conditional rendering, no useState swap, no hydration drift.
 */
function MascotFrame() {
  return (
    <div className="relative h-full w-full" aria-hidden="true">
      <div className="wly-mascot-float h-full w-full">
        <div className="wly-mascot-jump h-full w-full">
          <div className="wly-mascot-tilt h-full w-full">
            <MooseMascot />
          </div>
        </div>
      </div>
    </div>
  );
}
