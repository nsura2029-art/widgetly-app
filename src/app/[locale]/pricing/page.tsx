import type { Metadata } from "next";
import { Check, Sparkles, User } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SignUpButton } from "@clerk/nextjs";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { buildMetadata } from "@/lib/seo";
import { getQuotaSettings } from "@/lib/quota/server";

/**
 * /[locale]/pricing
 *
 * Two free tiers for now: Anonymous and Registered. The numbers
 * come from `usage_quota_settings` so they stay in sync with
 * /admin/quotas — admins change the cap in one place, the public
 * site reflects it everywhere.
 *
 * Why a single page instead of a marketing-flow split:
 *   - Both tiers are free, so there's no checkout.
 *   - The "conversion" from Anonymous to Registered is just
 *     "click Sign in / Sign up" — no plan change.
 *   - We keep the layout in one place so the comparison table
 *     stays in sync with the admin copy.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    title: "Pricing",
    description:
      "Widgetly is free, with two ways to use it: anonymous (1 page per day) and registered (5 pages per day, with saved suggestions and early access).",
    path: `/${locale}/pricing`,
    keywords: ["pricing", "free", "quota", "anonymous", "registered", "Widgetly"],
  });
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricing");
  const tAnon = await getTranslations("pricing.anonymous");
  const tReg = await getTranslations("pricing.registered");

  // Pull the live limits from D1. If the table is empty / D1 is
  // unbound, fall back to the migration defaults (1 / 5).
  let anonLimit = 1;
  let regLimit = 5;
  try {
    const settings = await getQuotaSettings();
    anonLimit = settings.anonymous.pagesPer24h;
    regLimit = settings.registered.pagesPer24h;
  } catch {
    // safeQuery already swallows errors and returns defaults;
    // this try/catch is belt-and-suspenders.
  }

  return (
    <PageShell width="wide" asArticle>
      <header className="mx-auto max-w-3xl text-center">
        <span className="border-primary/20 bg-primary/10 text-primary inline-flex rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase">
          {t("subtitle").length > 0 ? t("title") : "Pricing"}
        </span>
        <h1 className="text-foreground mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          {t("title")}
        </h1>
        <p className="text-muted mt-3 text-base leading-relaxed sm:text-lg">{t("subtitle")}</p>
      </header>

      <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2">
        <PricingCard
          name={tAnon("name")}
          price={tAnon("price")}
          tagline={tAnon("tagline")}
          cta={tAnon("cta")}
          icon={<User className="h-5 w-5" />}
          accent="default"
          highlight={false}
        >
          <PricingFeature>{tAnon("featureDailyPages", { count: anonLimit })}</PricingFeature>
          <PricingFeature>{tAnon("featureNoAccount")}</PricingFeature>
          <PricingFeature>{tAnon("featureBrowse")}</PricingFeature>
          <PricingFeature>{tAnon("featureSuggest")}</PricingFeature>
        </PricingCard>

        <PricingCard
          name={tReg("name")}
          price={tReg("price")}
          tagline={tReg("tagline")}
          cta={tReg("cta")}
          icon={<Sparkles className="h-5 w-5" />}
          accent="primary"
          highlight={true}
        >
          <PricingFeature>{tReg("featureDailyPages", { count: regLimit })}</PricingFeature>
          <PricingFeature>{tReg("featureAccount")}</PricingFeature>
          <PricingFeature>{tReg("featureEarlyAccess")}</PricingFeature>
          <PricingFeature>{tReg("featureNoAds")}</PricingFeature>
        </PricingCard>
      </div>

      <p className="text-muted-foreground mx-auto mt-10 max-w-2xl text-center text-sm">
        {t("moreComing")}
      </p>
    </PageShell>
  );
}

function PricingCard({
  name,
  price,
  tagline,
  cta,
  icon,
  accent,
  highlight,
  children,
}: {
  name: string;
  price: string;
  tagline: string;
  cta: string;
  icon: React.ReactNode;
  accent: "default" | "primary";
  highlight: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        "border-border/60 shadow-soft relative flex flex-col rounded-2xl border bg-white/80 p-6 backdrop-blur sm:p-8 " +
        (highlight ? "ring-primary/30 ring-2" : "")
      }
    >
      {highlight && (
        <span className="bg-primary text-primary-foreground absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-[11px] font-semibold tracking-wider uppercase">
          Popular
        </span>
      )}
      <div className="flex items-center gap-2">
        <span
          className={
            "inline-flex h-9 w-9 items-center justify-center rounded-lg " +
            (accent === "primary"
              ? "bg-primary/10 text-primary"
              : "bg-muted/30 text-muted-foreground")
          }
        >
          {icon}
        </span>
        <span className="text-foreground text-lg font-semibold">{name}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-foreground text-4xl font-semibold tracking-tight">{price}</span>
      </div>
      <p className="text-muted-foreground mt-1 text-sm">{tagline}</p>

      <ul className="mt-5 space-y-2.5">{children}</ul>

      <div className="mt-7">
        {accent === "primary" ? (
          <SignUpButton mode="modal">
            <Button className="w-full" size="lg">
              {cta}
            </Button>
          </SignUpButton>
        ) : (
          <Button asChild variant="outline" className="w-full" size="lg">
            <Link href="/">{cta}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function PricingFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="text-foreground/90 flex items-start gap-2.5 text-sm">
      <Check className="text-primary mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </li>
  );
}
