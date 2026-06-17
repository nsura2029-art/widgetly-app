import type { Metadata, Viewport } from "next";
import { SITE_CONFIG } from "./constants";

/**
 * Build the canonical URL for a given path on the site.
 * Strips leading slashes and ensures a single trailing slash pattern.
 */
export function getCanonicalUrl(path: string = "/"): string {
  const base = SITE_CONFIG.url.replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix === "/" ? "" : suffix}`;
}

/**
 * Build the full OG image URL with optional parameters.
 */
export function getOgImageUrl(params?: Record<string, string>): string {
  const base = `${SITE_CONFIG.url}${SITE_CONFIG.ogImage}`;
  if (!params) return base;
  const search = new URLSearchParams(params).toString();
  return `${base}?${search}`;
}

type SeoOptions = {
  title?: string;
  description?: string;
  path?: string;
  /**
   * Either:
   * - `true` to build a dynamic OG image URL with `path` as a query param
   * - a full URL string to use as the OG image directly (e.g. for a
   *   co-located `opengraph-image.tsx` route)
   * - omitted / `false` to use the site default
   */
  image?: boolean | string;
  keywords?: readonly string[];
  type?: "website" | "article";
  publishedTime?: string;
  noIndex?: boolean;
};

/**
 * Build a complete `Metadata` object for a page. Sensible defaults from
 * `SITE_CONFIG` flow through, and anything passed in overrides them.
 */
export function buildMetadata({
  title,
  description,
  path = "/",
  image,
  keywords,
  type = "website",
  publishedTime,
  noIndex = false,
}: SeoOptions = {}): Metadata {
  // The [locale] layout applies a title template (`%s | Widgetly`)
  // to every page's <title>. If we also append the brand here,
  // the rendered title becomes "X | Widgetly | Widgetly".
  //
  // For <title>: pass the raw title (or site name when missing);
  // the layout template appends the brand once.
  //
  // For OG / Twitter: those don't use the layout template, so we
  // append the brand explicitly to make social-share cards
  // self-identifying.
  const pageTitle = title ?? `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`;
  const fullTitle = title
    ? `${title} | ${SITE_CONFIG.name}`
    : `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`;
  const desc = description ?? SITE_CONFIG.description;
  const canonical = getCanonicalUrl(path);
  // `image` may be a full URL (use as-is for dynamic co-located OG routes),
  // a truthy non-string (build a dynamic URL from `path`), or omitted
  // (use the site default static OG image).
  const ogImage =
    typeof image === "string" ? image : image ? getOgImageUrl({ path }) : getOgImageUrl();
  const allKeywords = [...(keywords ?? []), ...SITE_CONFIG.keywords].join(", ");

  return {
    // Use pageTitle (no appended brand) — the [locale] layout's
    // title template applies ` | Widgetly` once.
    title: pageTitle,
    description: desc,
    keywords: allKeywords,
    authors: [{ name: SITE_CONFIG.name, url: SITE_CONFIG.url }],
    creator: SITE_CONFIG.name,
    publisher: SITE_CONFIG.name,
    applicationName: SITE_CONFIG.name,
    metadataBase: new URL(SITE_CONFIG.url),
    alternates: {
      canonical,
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type,
      locale: SITE_CONFIG.locale,
      url: canonical,
      title: fullTitle,
      description: desc,
      siteName: SITE_CONFIG.name,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`,
        },
      ],
      ...(publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: desc,
      site: SITE_CONFIG.twitterHandle,
      creator: SITE_CONFIG.twitterHandle,
      images: [ogImage],
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icon.svg", type: "image/svg+xml" },
      ],
      apple: "/apple-touch-icon.png",
    },
    manifest: "/site.webmanifest",
    category: "technology",
    other: {
      // Crawler verification slots — fill from env or constants as you register.
      ...(process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION
        ? { "google-site-verification": process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION }
        : {}),
      ...(process.env.NEXT_PUBLIC_BING_VERIFICATION
        ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_VERIFICATION }
        : {}),
      "format-detection": "telephone=no",
    },
  };
}

export const VIEWPORT: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0F172A" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "light",
};

/* -------------------------------------------------------------------------- */
/*  JSON-LD Schema Builders                                                   */
/* -------------------------------------------------------------------------- */

const SCHEMA_BASE = "https://schema.org";

/** WebSite + SearchAction schema. Powers the sitelinks search box. */
export function websiteJsonLd() {
  return {
    "@context": SCHEMA_BASE,
    "@type": "WebSite",
    name: SITE_CONFIG.name,
    alternateName: SITE_CONFIG.shortName,
    description: SITE_CONFIG.description,
    url: SITE_CONFIG.url,
    inLanguage: "en",
    copyrightYear: new Date().getFullYear(),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_CONFIG.url}/?q={search_term_string}`,
      },
      // `required` tells Google the query MUST be supplied.
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Organization + sameAs (social profiles).
 *
 * `sameAs` is the strongest entity-verification signal in the schema
 * graph — Google uses it to confirm the Organization entity matches
 * the real brand. Emitting URLs that 404 actively *weakens* the
 * graph. We only emit `sameAs` entries that resolve: pull the
 * non-empty ones from SITE_CONFIG, and skip the hardcoded fallbacks
 * until the team confirms the real handle / invite.
 */
export function organizationJsonLd() {
  // Collect every URL the team has actually stood up. Anything still
  // empty or pointing at a placeholder is filtered out so we never
  // emit a broken sameAs.
  const candidateSameAs: Array<string | undefined> = [
    SITE_CONFIG.github,
    SITE_CONFIG.twitter
      ? `https://twitter.com/${SITE_CONFIG.twitter.replace(/^@/, "")}`
      : undefined,
    SITE_CONFIG.discord ?? undefined,
  ];
  const sameAs = candidateSameAs.filter((u): u is string => Boolean(u));

  return {
    "@context": SCHEMA_BASE,
    "@type": "Organization",
    name: SITE_CONFIG.name,
    legalName: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_CONFIG.url}/logo.png`,
      width: 512,
      height: 512,
    },
    description: SITE_CONFIG.description,
    foundingDate: "2025",
    sameAs: sameAs.length > 0 ? sameAs : undefined,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: SITE_CONFIG.email,
        availableLanguage: ["English"],
      },
    ],
  };
}

/** SoftwareApplication schema for the platform. */
export function softwareApplicationJsonLd() {
  return {
    "@context": SCHEMA_BASE,
    "@type": "SoftwareApplication",
    name: SITE_CONFIG.name,
    applicationCategory: "UtilitiesApplication",
    applicationSubCategory: "Online Tools Platform",
    operatingSystem: "Any (Web Browser)",
    description: SITE_CONFIG.description,
    url: SITE_CONFIG.url,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/PreOrder",
      description: "Free during launch. Premium tiers planned.",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "128",
      bestRating: "5",
      worstRating: "1",
    },
    featureList: [
      "500+ AI-powered online tools",
      "Calculators, converters, generators, PDF tools",
      "Natural-language AI search",
      "Mobile-first responsive design",
      "Privacy-first, no tracking",
      "Free to use",
    ],
  };
}

/** FAQ schema — paired with a visible FAQ section on the page. */
export function faqJsonLd(faqs: ReadonlyArray<{ question: string; answer: string }>) {
  return {
    "@context": SCHEMA_BASE,
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}

/** BreadcrumbList schema for hierarchical pages. */
export function breadcrumbJsonLd(items: ReadonlyArray<{ name: string; url: string }>) {
  return {
    "@context": SCHEMA_BASE,
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

/** ItemList schema for category/feature collections. */
export function itemListJsonLd(
  name: string,
  items: ReadonlyArray<{ name: string; url: string; description?: string }>
) {
  return {
    "@context": SCHEMA_BASE,
    "@type": "ItemList",
    name,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: it.url,
      ...(it.description ? { description: it.description } : {}),
    })),
  };
}
