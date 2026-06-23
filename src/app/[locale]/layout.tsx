import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { routing } from "../../../next-intl.config";
import { isSupportedLocale, getDirection } from "@/i18n/config";
import ClientHeader from "@/components/layout/client-header";
import { ToolsBanner } from "@/components/layout/tools-banner";
import { BreadcrumbNav } from "@/components/layout/breadcrumb-nav";
import { Footer } from "@/components/layout/footer";
import { ScrollToHash } from "@/components/layout/scroll-to-hash";
import { ConsentProvider } from "@/lib/consent/useConsent";
import { ConsentBanner } from "@/components/consent/ConsentBanner";
import { regionFromLocale } from "@/lib/consent/region";
import { SITE_CONFIG } from "@/lib/constants";

import { websiteJsonLd, organizationJsonLd } from "@/lib/seo";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

/**
 * Static params for all supported locales. With localePrefix: 'always'
 * every URL is /<locale>/... so we generate one entry per locale.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Per-locale metadata. Sets the canonical URL to the locale-prefixed
 * path, plus `<link rel="alternate" hreflang>` for every supported
 * locale (and x-default → /en).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return {};

  const t = await getTranslations({ locale, namespace: "site" });
  const baseUrl = SITE_CONFIG.url;
  const localePath = `/${locale}`;

  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = `${baseUrl}/${l}`;
  }
  languages["x-default"] = `${baseUrl}/en`;

  return {
    title: {
      default: t("name"),
      template: `%s | ${t("name")}`,
    },
    alternates: {
      canonical: localePath,
      languages,
    },
    openGraph: {
      locale: locale.replace("-", "_"),
      siteName: t("name"),
    },
  };
}

/**
 * The [locale] layout — sets <html lang/dir>, wraps in
 * NextIntlClientProvider, and renders the shared chrome (header, footer,
 * breadcrumb). Per-request locale resolution via next-intl's helpers.
 *
 * The consent region is derived from locale here (cheap, static)
 * and refined client-side inside <ConsentProvider> via a fetch to
 * /api/diag/consent (which reads cf-ipcountry server-side). This
 * keeps the layout free of `headers()` calls — `headers()` in a
 * server component opts every page into dynamic rendering, which
 * caused Cloudflare Worker 1102 errors on 2026-06-18. The
 * client-side fetch gives us the actual region a moment after
 * mount; the locale-based default is what GDPR/CCPA users see
 * before the fetch resolves.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure the locale is one we support. The middleware should have
  // already redirected, but defend against malformed URLs anyway.
  if (!isSupportedLocale(locale)) notFound();

  // Enables static rendering for this locale (per next-intl docs)
  setRequestLocale(locale);

  // Provide messages to client components
  const messages = await getMessages();
  const dir = getDirection(locale);

  // Locale-based consent region as the static default. Refined
  // client-side via /api/diag/consent. Do NOT add `headers()` here
  // — see the block comment above.
  const consentRegion = regionFromLocale(locale);

  // JSON-LD entities (these are locale-agnostic for now, but could
  // be parameterized in the future).
  //
  // FAQPage + SoftwareApplication are NOT emitted here. They're
  // page-specific and live where they're actually meaningful:
  //   - FAQPage: on the home page (the only page with a visible
  //     FAQ section). Per Google guidelines, FAQPage schema must
  //     match visible FAQ content; emitting it on every page
  //     would be misleading and could be flagged as structured
  //     data spam.
  //   - SoftwareApplication: on the home page (the platform as a
  //     whole). Per-tool pages already emit WebApplication via
  //     tools/[category]/[tool]/page.tsx — emitting both
  //     SoftwareApplication (platform) and WebApplication (tool)
  //     on tool pages would be redundant.
  //
  // We DO emit WebSite (with SearchAction for sitelinks) and
  // Organization globally because they're site-wide identity
  // signals that don't conflict with per-page schemas.
  const jsonLdWebSite = websiteJsonLd();
  const jsonLdOrg = organizationJsonLd();

  // Clerk is conditionally wrapped. When the publishable key
  // env var is missing (e.g. local dev without Clerk, or stage
  // before the secrets are set), we skip ClerkProvider entirely.
  // Client components call `useSafeUser()` (which checks the same
  // env var at module load) and return a signed-out stub. The
  // server-side Clerk helpers (`auth()`, `getUser()`, etc.) will
  // throw when the secret key is also missing — callers should
  // catch that and treat the user as anonymous. The `/api/conversions/*`
  // and `/api/suggest*` routes already handle this.
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  const inner = (
    <html lang={locale} dir={dir} className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* DNS prefetch is a low-cost resolution hint, not a script
            load — but if we later add a real Google Analytics tag, it
            should be moved into <ConsentGate category="analytics"> so
            it doesn't fire before the user opts in. */}
        <link rel="dns-prefetch" href="//www.google-analytics.com" />
        <link rel="dns-prefetch" href="//cdn.jsdelivr.net" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
        />
      </head>
      <body className="bg-background min-h-screen font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ConsentProvider region={consentRegion}>
            <a
              href="#main"
              className="focus:bg-foreground focus:text-background sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:px-3 focus:py-2 focus:text-sm"
            >
              Skip to content
            </a>
            <ClientHeader />

            <main id="main">
              <ToolsBanner />
              <BreadcrumbNav />
              {children}
            </main>
            <Footer />
            <ConsentBanner />
            {/* Watches for hash changes on cross-page navigation and
                scrolls the matching element into view. Fixes a Next.js
                App Router quirk where hash links fail on soft
                navigations. See component file for details. */}
            <ScrollToHash />
          </ConsentProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );

  return clerkEnabled ? <ClerkProvider>{inner}</ClerkProvider> : inner;
}
