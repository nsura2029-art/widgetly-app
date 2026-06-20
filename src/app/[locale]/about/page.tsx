import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import {
  Globe,
  Sparkles,
  Shield,
  Zap,
  Gift,
  Eye,
  ArrowRight,
  Mail,
  Github,
  Twitter,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "About Widgetly",
  description:
    "Widgetly is a small, browser-first tools platform built on Cloudflare's global edge. EU-hosted, no signup, transparent data practices.",
  path: "/about",
  keywords: ["about widgetly", "browser-first tools", "EU tools platform", "no signup"],
});

/**
 * Why Widgetly? — six card grid (mirrors CloudConvert's "Why CloudConvert?"
 * pattern but adapted to Widgetly's actual model). Icons map to the
 * concrete capability, not generic values, so each card is recognisable
 * in one glance.
 */
const WHY_ICONS = {
  browserFirst: Globe,
  noSignup: Sparkles,
  eu: Shield,
  speed: Zap,
  free: Gift,
  transparent: Eye,
} as const;

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  return (
    <PageShell width="wide">
      {/* Hero card — origin story */}
      <header className="border-border/60 shadow-soft rounded-2xl border bg-white p-6 sm:p-10">
        <Badge variant="secondary" className="self-start">
          {t("title")}
        </Badge>
        <h1 className="text-foreground mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("subtitle")}
        </h1>
        <p className="text-muted mt-4 max-w-2xl text-base leading-relaxed sm:text-lg">
          {t("intro")}
        </p>
      </header>

      {/* By the numbers — 4 stat cards */}
      <section className="mt-8" aria-labelledby="about-stats-title">
        <h2 id="about-stats-title" className="sr-only">
          {t("statsTitle")}
        </h2>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(["tools", "browserFirst", "euHosted", "noSignup"] as const).map((key) => (
            <li
              key={key}
              className="border-border/60 shadow-soft rounded-2xl border bg-white p-4 sm:p-6"
            >
              <div className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
                {t(`stats.${key}.value`)}
              </div>
              <p className="text-muted mt-1 text-xs leading-relaxed sm:text-sm">
                {t(`stats.${key}.label`)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* What we believe — 4 short statements (CloudConvert's "beliefs" pattern) */}
      <section className="mt-12" aria-labelledby="about-beliefs-title">
        <div className="mb-6 max-w-2xl">
          <h2
            id="about-beliefs-title"
            className="text-foreground text-2xl font-semibold tracking-tight"
          >
            {t("beliefsTitle")}
          </h2>
          <p className="text-muted mt-3 text-sm leading-relaxed">{t("beliefsIntro")}</p>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2">
          {(["focus", "privacy", "free", "honest"] as const).map((key, idx) => (
            <li
              key={key}
              className="border-border/60 shadow-soft rounded-2xl border bg-white p-5 sm:p-6"
            >
              <div className="flex items-baseline gap-3">
                <span
                  aria-hidden="true"
                  className="text-primary text-xs font-semibold tabular-nums"
                >
                  0{idx + 1}
                </span>
                <h3 className="text-foreground text-base font-semibold">
                  {t(`beliefs.${key}.title`)}
                </h3>
              </div>
              <p className="text-muted mt-2 text-sm leading-relaxed">{t(`beliefs.${key}.body`)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Why Widgetly — 6-card grid (CloudConvert's "Why CloudConvert?" pattern) */}
      <section className="mt-14" aria-labelledby="about-why-title">
        <div className="mb-6 max-w-2xl">
          <h2
            id="about-why-title"
            className="text-foreground text-2xl font-semibold tracking-tight"
          >
            {t("whyTitle")}
          </h2>
          <p className="text-muted mt-3 text-sm leading-relaxed">{t("whyIntro")}</p>
        </div>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(["browserFirst", "noSignup", "eu", "speed", "free", "transparent"] as const).map(
            (key) => {
              const Icon = WHY_ICONS[key];
              return (
                <li
                  key={key}
                  className="border-border/60 shadow-soft h-full rounded-2xl border bg-white p-5 sm:p-6"
                >
                  <span className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <h3 className="text-foreground mt-4 text-base font-semibold">
                    {t(`why.${key}.title`)}
                  </h3>
                  <p className="text-muted mt-2 text-sm leading-relaxed">{t(`why.${key}.body`)}</p>
                </li>
              );
            }
          )}
        </ul>
      </section>

      {/* Contact — simple card, no fake team section */}
      <section className="mt-14" aria-labelledby="about-contact-title">
        <div className="border-border/60 shadow-soft rounded-2xl border bg-white p-6 sm:p-10">
          <h2
            id="about-contact-title"
            className="text-foreground text-2xl font-semibold tracking-tight"
          >
            {t("contactTitle")}
          </h2>
          <p className="text-muted mt-3 max-w-2xl text-base leading-relaxed">{t("contactBody")}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href={`mailto:${t("contactEmail")}`}
              className="border-border/60 text-foreground hover:bg-muted/5 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              {t("contactEmail")}
              <span className="sr-only"> — {t("contactEmailLabel")}</span>
            </a>
            <Link
              href="https://github.com/widgetly"
              className="border-border/60 text-foreground hover:bg-muted/5 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              GitHub
            </Link>
            <Link
              href="https://twitter.com/widgetly"
              className="border-border/60 text-foreground hover:bg-muted/5 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors"
            >
              <Twitter className="h-4 w-4" aria-hidden="true" />
              Twitter
            </Link>
          </div>

          <div className="border-border/60 mt-8 flex flex-col items-start justify-between gap-3 border-t pt-6 sm:flex-row sm:items-center">
            <p className="text-muted text-xs leading-relaxed">{t("footerNote")}</p>
            <Link
              href="/tools"
              className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
            >
              {t("stats.tools.value")} {t("stats.tools.label").toLowerCase()}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
