import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { ArrowRight, Bell, Sparkles, Zap, Lock, Smartphone, Check } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { buildMetadata } from "@/lib/seo";
import {
  getAllToolStaticParams,
  getToolPage,
  getToolPagesInCategory,
  toolDescription,
  toolKeywords,
} from "@/lib/tools-pages";
import { TOOLS_CATEGORIES } from "@/lib/tools-categories";
import { SITE_CONFIG } from "@/lib/constants";
import { getIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

/**
 * Pre-resolved icons for the 12 category entries. Each category
 * has a fixed icon name in `tools-categories.ts`, so we resolve
 * them once at module load and look up by slug during render.
 * Same pattern as `FEATURED` in tools-banner.tsx — avoids
 * `react-hooks/static-components` lint complaints about creating
 * components inside render functions.
 */
const CATEGORY_ICON_NAMES: Record<string, string> = {
  pdf: "FileText",
  image: "Image",
  video: "Video",
  ai: "Sparkles",
  calculators: "Calculator",
  converters: "ArrowLeftRight",
  seo: "Search",
  developer: "Code",
  business: "Briefcase",
  education: "GraduationCap",
  writing: "PenLine",
};
const CATEGORY_ICONS: Record<string, ReturnType<typeof getIcon>> = Object.fromEntries(
  Object.entries(CATEGORY_ICON_NAMES).map(([slug, name]) => [slug, getIcon(name)]),
);

type Params = { category: string; tool: string };

/**
 * Static generation for every (category, tool) combo. Backed by
 * `tools-pages.ts`, which iterates both the detailed mega-menu
 * subgroups and the per-category `examples` fallback so every
 * sub-tool gets its own indexable URL.
 *
 * For 12 categories × 5-30 sub-tools each, this generates ~150-
 * 200 static pages. Pre-rendered at build time so they ship as
 * zero-cold-start HTML via Cloudflare Workers.
 *
 * `dynamic = "force-static"` is required: without it Next.js
 * falls back to dynamic SSR for this segment because the page
 * uses async server-component features. Same pattern as
 * /blog/[slug] (which is also force-static).
 */
export const dynamic = "force-static";

export function generateStaticParams(): Params[] {
  return getAllToolStaticParams();
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { category, tool } = await params;
  const toolPage = getToolPage(category, tool);
  if (!toolPage) {
    return buildMetadata({
      title: "Tool not found",
      path: `/tools/${category}/${tool}`,
      noIndex: true,
    });
  }
  return buildMetadata({
    title: `${toolPage.name} — Free Online ${toolPage.name} Tool`,
    description: toolDescription(toolPage),
    path: `/tools/${toolPage.categorySlug}/${toolPage.slug}`,
    keywords: toolKeywords(toolPage),
  });
}

export default async function ToolDetailPage({ params }: { params: Promise<Params> }) {
  const { category, tool } = await params;

  const toolPage = getToolPage(category, tool);
  if (!toolPage) notFound();

  const cat = TOOLS_CATEGORIES.find((c) => c.slug === toolPage.categorySlug);
  if (!cat) notFound();

  const t = await getTranslations("toolPage");
  // Icon is pre-resolved in tools-pages.ts so the lint rule about
  // creating components during render doesn't fire here.
  const Icon = toolPage.Icon;

  // Related tools: same category, exclude current, take first 6.
  const relatedTools = getToolPagesInCategory(toolPage.categorySlug)
    .filter((p) => p.slug !== toolPage.slug)
    .slice(0, 6);

  // Other categories for the explore rail.
  const otherCategories = TOOLS_CATEGORIES.filter((c) => c.slug !== toolPage.categorySlug).slice(
    0,
    6,
  );

  // Per-tool page schema: WebApplication + BreadcrumbList.
  // WebApplication is the right schema.org type for online tools —
  // it powers rich results like "Try {tool name}" buttons.
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: toolPage.name,
      description: toolDescription(toolPage),
      url: `${SITE_CONFIG.url}/tools/${toolPage.categorySlug}/${toolPage.slug}`,
      applicationCategory: "UtilitiesApplication",
      applicationSubCategory: cat.name,
      operatingSystem: "Any (Web Browser)",
      browserRequirements: "Requires JavaScript",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/PreOrder",
      },
      isPartOf: {
        "@type": "WebSite",
        name: SITE_CONFIG.name,
        url: SITE_CONFIG.url,
      },
      provider: {
        "@type": "Organization",
        name: SITE_CONFIG.name,
        url: SITE_CONFIG.url,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: SITE_CONFIG.url,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Tools",
          item: `${SITE_CONFIG.url}/tools`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: t("schemaBreadcrumbCategory", { categoryName: cat.name }),
          item: `${SITE_CONFIG.url}/tools/${cat.slug}`,
        },
        {
          "@type": "ListItem",
          position: 4,
          name: t("schemaBreadcrumbTool", { toolName: toolPage.name }),
          item: `${SITE_CONFIG.url}/tools/${cat.slug}/${toolPage.slug}`,
        },
      ],
    },
  ];

  return (
    <PageShell width="wide" asArticle>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb (visible) */}
      <nav
        aria-label="Breadcrumb"
        className="text-muted-foreground mb-6 flex flex-wrap items-center gap-1.5 text-xs"
      >
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/tools" className="hover:text-foreground transition-colors">
          Tools
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href={`/tools/${cat.slug}`}
          prefetch={false}
          className="hover:text-foreground transition-colors"
        >
          {cat.name}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-foreground font-medium">{toolPage.name}</span>
      </nav>

      {/* Hero */}
      <header className="grid items-start gap-8 md:grid-cols-[auto_minmax(0,1fr)] md:gap-10">
        {/* Big colored tool icon */}
        <div
          className={cn(
            "flex h-20 w-20 items-center justify-center rounded-2xl shadow-sm md:h-24 md:w-24",
            // Accent background — same accent color as the mega-menu tile
            // for the same tool, so visual identity carries across surfaces.
            toolAccentBg(toolPage.accent),
          )}
          aria-hidden="true"
        >
          <Icon className="h-10 w-10 text-white md:h-12 md:w-12" />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{cat.name}</Badge>
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
              <Sparkles className="mr-1 h-3 w-3" />
              {t("comingSoonBadge")}
            </Badge>
          </div>
          <h1 className="text-foreground mt-4 text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            {t("headline", { toolName: toolPage.name })}
          </h1>
          <p className="text-muted mt-4 max-w-2xl text-base leading-relaxed sm:text-lg">
            {t("intro", { toolName: toolPage.name })}
          </p>

          {/* Email signup CTA — points at the waitlist anchor on home */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/#waitlist"
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors"
            >
              <Bell className="h-4 w-4" />
              {t("getNotifiedCta", { toolName: toolPage.name })}
            </Link>
            <Link
              href={`/tools/${cat.slug}`}
              prefetch={false}
              className="text-muted-foreground hover:text-foreground text-sm font-medium underline-offset-4 hover:underline"
            >
              ← {cat.name}
            </Link>
          </div>
          <p className="text-muted-foreground mt-2 max-w-md text-xs">
            {t("getNotifiedSubtitle", { toolName: toolPage.name })}
          </p>
        </div>
      </header>

      {/* What this tool will do */}
      <section className="mt-12 sm:mt-16">
        <h2 className="text-foreground text-xl font-semibold sm:text-2xl">
          {t("whatItWillDoTitle")}
        </h2>
        <p className="text-muted mt-2 max-w-2xl text-sm sm:text-base">
          {t("featuresIntro", {
            toolName: toolPage.name,
            categoryName: cat.name.toLowerCase(),
          })}
        </p>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          <Feature icon={<Check className="h-4 w-4" />} text={t("featureFree")} />
          <Feature icon={<Lock className="h-4 w-4" />} text={t("featurePrivate")} />
          <Feature icon={<Zap className="h-4 w-4" />} text={t("featureFast")} />
          <Feature icon={<Smartphone className="h-4 w-4" />} text={t("featureMobile")} />
          <Feature icon={<Bell className="h-4 w-4" />} text={t("featureNoSignup")} />
        </ul>
      </section>

      {/* Related tools — same category */}
      {relatedTools.length > 0 ? (
        <section className="mt-12 sm:mt-16">
          <h2 className="text-foreground text-xl font-semibold sm:text-2xl">
            {t("relatedToolsTitle", { categoryName: cat.name })}
          </h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relatedTools.map((rel) => {
              const RelIcon = rel.Icon;
              return (
                <li key={rel.slug}>
                  <Link
                    href={`/tools/${rel.categorySlug}/${rel.slug}`}
                    prefetch={false}
                    className="border-border/60 hover:border-primary/40 group flex items-center gap-3 rounded-xl border bg-white p-3.5 transition-colors"
                  >
                    <span
                      className={cn(
                        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                        toolAccentBg(rel.accent),
                      )}
                      aria-hidden="true"
                    >
                      <RelIcon className="h-4 w-4 text-white" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-foreground truncate text-sm font-semibold">
                        {rel.name}
                      </div>
                      <div className="text-muted truncate text-xs">{t("comingSoonBadge")}</div>
                    </div>
                    <ArrowRight
                      className="text-muted group-hover:text-foreground h-4 w-4 shrink-0 transition-colors"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* Other categories */}
      <section className="mt-12 sm:mt-16">
        <h2 className="text-foreground text-xl font-semibold sm:text-2xl">
          {t("exploreOtherCategoriesTitle")}
        </h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {otherCategories.map((o) => {
            const OIcon = CATEGORY_ICONS[o.slug] ?? getIcon("Sparkles");
            return (
              <li key={o.slug}>
                <Link
                  href={`/tools/${o.slug}`}
                  className="border-border/60 hover:border-primary/40 group flex items-center gap-3 rounded-xl border bg-white p-3.5 transition-colors"
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      catAccentBg(o.accent),
                    )}
                    aria-hidden="true"
                  >
                    <OIcon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-foreground truncate text-sm font-semibold">{o.name}</div>
                    <div className="text-muted truncate text-xs">{o.pitch}</div>
                  </div>
                  <ArrowRight
                    className="text-muted group-hover:text-foreground h-4 w-4 shrink-0 transition-colors"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </PageShell>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="border-border/60 flex items-start gap-2.5 rounded-lg border bg-white p-3 text-sm">
      <span className="text-primary mt-0.5 shrink-0">{icon}</span>
      <span className="text-foreground/90">{text}</span>
    </li>
  );
}

/** Map accent color key (from tools-subgroups) to Tailwind class
 *  for the icon tile background. Same palette as the mega-menu
 *  tile classes (ACCENT_TILE_CLASSES in tools-banner.tsx). */
function toolAccentBg(accent: string): string {
  const map: Record<string, string> = {
    red: "bg-red-500",
    green: "bg-green-500",
    blue: "bg-blue-500",
    indigo: "bg-indigo-500",
    purple: "bg-purple-500",
    orange: "bg-orange-500",
    pink: "bg-pink-500",
    teal: "bg-teal-500",
    amber: "bg-amber-500",
    cyan: "bg-cyan-500",
  };
  return map[accent] ?? "bg-primary";
}

/** Map category accent key (primary/secondary/accent from
 *  constants) to a tinted background for category tiles in the
 *  "Other categories" rail. */
function catAccentBg(accent: "primary" | "secondary" | "accent"): string {
  const map = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/10 text-secondary",
    accent: "bg-accent/10 text-accent",
  } as const;
  return map[accent];
}
