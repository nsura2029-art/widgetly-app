import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageShell } from "@/components/layout/page-shell";
import { buildMetadata } from "@/lib/seo";

import { RewardPreview } from "./reward-preview";
import { SuggestionForm } from "./suggestion-form";

export const metadata: Metadata = buildMetadata({
  title: "Submit a Tool Idea — Earn Wits, Badges & Cash",
  description:
    "Tell us what to build next. Submit a tool idea and earn +50 Wits on the spot, more as upvotes roll in, and cash rewards the day it ships.",
  path: "/suggest/new",
});

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function NewSuggestionPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("suggest.formNew");

  return (
    <PageShell width="wide">
      {/* Hero — full-width so it doesn't get squeezed by the right column.
          Uses the existing eyebrow / headline / subtitle / intro pattern
          from the rest of the site so the page reads as part of the
          family. */}
      <header className="max-w-3xl">
        <span className="border-primary/20 bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          {t("heroEyebrow")}
        </span>
        <h1 className="text-foreground mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          {t("heroTitle")}
        </h1>
        <p className="text-primary mt-3 text-lg font-medium">{t("heroSubtitle")}</p>
        <p className="text-muted mt-3 max-w-2xl text-base leading-relaxed">{t("heroIntro")}</p>
      </header>

      {/* Two-column layout on desktop: form on the left (primary action),
          reward preview on the right (sticky). Single column on mobile
          where the order is form → reward preview (we want the form
          above the fold, not the rewards). */}
      <div className="mt-10 grid gap-8 lg:grid-cols-5 lg:gap-10">
        <div className="lg:col-span-3">
          <SuggestionForm />
        </div>
        <div className="lg:col-span-2">
          <RewardPreview />
        </div>
      </div>
    </PageShell>
  );
}
