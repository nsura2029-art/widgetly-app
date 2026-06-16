import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { Inter } from "next/font/google";
import { routing } from "../../../next-intl.config";
import { isSupportedLocale, getDirection } from "@/i18n/config";
import ClientHeader from "@/components/layout/client-header";
import { BreadcrumbNav } from "@/components/layout/breadcrumb-nav";
import { Footer } from "@/components/layout/footer";
import { ConsentProvider } from "@/lib/consent/useConsent";
import { ConsentBanner } from "@/components/consent/ConsentBanner";
import { regionFromCountry, regionFromLocale } from "@/lib/consent/region";
import { getSiteUrl } from "@/lib/utils";
import { CloudflareAnalytics } from "@/components/analytics/CloudflareAnalytics";

import { websiteJsonLd, organizationJsonLd, softwareApplicationJsonLd, faqJsonLd } from "@/lib/seo";
import { FAQS } from "@/lib/constants";

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
  const baseUrl = getSiteUrl();
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
 * Also reads Cloudflare's `cf-ipcountry` header to compute the
 * visitor's consent region. The header is free, populated by the
 * edge for every request, and is the standard server-side signal
 * for GDPR/CCPA region detection. We fall back to a locale-based
 * heuristic when the header is absent (local dev, non-Cloudflare
 * proxies).
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

  // Server-side consent region: cf-ipcountry first, then locale
  // fallback. The result is passed into <ConsentProvider> so the
  // banner can pick the right default toggles (and so the audit
  // record captures where the user was when they made the choice).
  let consentRegion = regionFromLocale(locale);
  try {
    const h = await headers();
    const country = h.get("cf-ipcountry");
    const fromCountry = regionFromCountry(country);
    // Country code is more reliable than locale; only fall back to
    // locale-based if the country is unknown.
    if (fromCountry !== "other") consentRegion = fromCountry;
  } catch {
    // headers() can throw outside of a request context (very rare in
    // App Router; defensive). Stick with the locale-based guess.
  }

  // JSON-LD entities (these are locale-agnostic for now, but could
  // be parameterized in the future)
  const jsonLdWebSite = websiteJsonLd();
  const jsonLdOrg = organizationJsonLd();
  const jsonLdApp = softwareApplicationJsonLd();
  const jsonLdFaq = faqJsonLd(FAQS);

  return (
    <html lang={locale} dir={dir} className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//cdn.jsdelivr.net" />
        {/* Mobile browser chrome color (Android Chrome, Edge mobile,
            Samsung Internet). Single solid color required. */}
        <meta name="theme-color" content="#0F172A" />
        {/* iOS / macOS Safari "Add to Home Screen" hints. With these
            set, the app launches fullscreen without Safari chrome
            and is treated as a standalone web app. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Widgetly" />
        {/* Disable iOS Safari's automatic phone / address / date
            detection — none of those are in our copy and the
            auto-styling would add visual noise. */}
        <meta name="format-detection" content="telephone=no, date=no, address=no" />
        {/* Cloudflare Web Analytics — privacy-respecting, no cookies.
            The token is a public identifier (not a secret). Omitted
            in local dev and any environment that hasn't configured
            NEXT_PUBLIC_CF_ANALYTICS_TOKEN. */}
        <CloudflareAnalytics
          token={process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdApp) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
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

            <main id="main" className="pt-16">
              <BreadcrumbNav />
              {children}
            </main>
            <Footer />
            <ConsentBanner />
          </ConsentProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
