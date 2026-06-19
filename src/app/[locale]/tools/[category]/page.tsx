import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import {
  FileText,
  Image as ImageIcon,
  Video,
  Sparkles,
  Calculator,
  ArrowLeftRight,
  Search,
  Code,
  Briefcase,
  GraduationCap,
  PenLine,
  type LucideIcon,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/layout/page-shell";
import { buildMetadata } from "@/lib/seo";
import {
  TOOLS_CATEGORIES,
  getAllToolsCategorySlugs,
  getToolsCategory,
  getToolsCategoryKeywords,
} from "@/lib/tools-categories";
import { SITE_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { RecordCategoryVisit } from "@/lib/history";

const ICONS: Record<string, LucideIcon> = {
  FileText,
  Image: ImageIcon,
  Video,
  Sparkles,
  Calculator,
  ArrowLeftRight,
  Search,
  Code,
  Briefcase,
  GraduationCap,
  PenLine,
};

const ACCENT_CLASSES: Record<"primary" | "secondary" | "accent", string> = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  accent: "bg-accent/10 text-accent",
};

type Params = { category: string };

export function generateStaticParams(): Params[] {
  return getAllToolsCategorySlugs().map((category) => ({ category }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { category } = await params;
  const cat = getToolsCategory(category);
  if (!cat) {
    return buildMetadata({ title: "Tools", path: `/tools/${category}`, noIndex: true });
  }
  return buildMetadata({
    title: `${cat.name} — ${cat.headline}`,
    description: cat.intro,
    path: `/tools/${cat.slug}`,
    keywords: getToolsCategoryKeywords(cat),
  });
}

export default async function ToolsCategoryPage({ params }: { params: Promise<Params> }) {
  const { category } = await params;
  const cat = getToolsCategory(category);
  if (!cat) notFound();

  const Icon = ICONS[cat.icon] ?? FileText;
  // Sibling categories for the "explore more" rail.
  const others = TOOLS_CATEGORIES.filter((c) => c.slug !== cat.slug).slice(0, 4);

  // JSON-LD: WebPage + BreadcrumbList + ItemList of examples. The
  // examples are real strings, not invented links — they are real
  // tool names listed on the page so the ItemList is on-the-level.
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: cat.headline,
      description: cat.intro,
      url: `${SITE_CONFIG.url}/tools/${cat.slug}`,
      isPartOf: { "@type": "WebSite", name: SITE_CONFIG.name, url: SITE_CONFIG.url },
      inLanguage: "en",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_CONFIG.url },
        { "@type": "ListItem", position: 2, name: "Tools", item: `${SITE_CONFIG.url}/tools` },
        {
          "@type": "ListItem",
          position: 3,
          name: cat.name,
          item: `${SITE_CONFIG.url}/tools/${cat.slug}`,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: cat.name,
      itemListElement: cat.examples.map((name, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name,
        url: `${SITE_CONFIG.url}/tools/${cat.slug}#${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      })),
    },
  ];

  return (
    <PageShell width="wide" asArticle>
      <script
        type="application/ld+json"
        // Server-rendered JSON-LD; no user input, no XSS surface.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Local-only "recently visited" recording. Mounts on the
          client, writes to localStorage, no network call. */}
      <RecordCategoryVisit slug={cat.slug} />

      <div className="grid items-start gap-10 md:gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Left — pitch */}
        <div className="flex flex-col">
          <Badge variant="secondary" className="self-start">
            {cat.name}
          </Badge>
          <h1 className="text-foreground mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            {cat.headline}.
          </h1>
          <p className="text-muted mt-5 max-w-md text-base leading-relaxed">{cat.intro}</p>

          <ul className="mt-8 flex flex-wrap gap-2">
            {cat.keywords.secondary.slice(0, 6).map((k) => (
              <li
                key={k}
                className="border-border/60 bg-muted/5 text-muted rounded-full border px-2.5 py-1 text-xs"
              >
                {k}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/suggest"
              className="text-foreground inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
            >
              Don&apos;t see a tool? Suggest one
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Right — examples list */}
        <div className="border-border/60 shadow-soft rounded-2xl border bg-white p-6 sm:p-8">
          <h2 className="text-foreground text-xl font-semibold">
            {cat.examples.length}+ tools in {cat.name.toLowerCase()}
          </h2>
          <p className="text-muted mt-1.5 text-sm">
            A handful of the most-used tools in this category. New ones ship every month.
          </p>
          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {cat.examples.map((name) => {
              const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
              return (
                <li key={name} id={slug}>
                  <Link
                    href={`/tools/${cat.slug}/${slug}`}
                    prefetch={false}
                    className="border-border/60 bg-muted/5 hover:border-primary/40 hover:bg-muted/10 group flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors"
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                        ACCENT_CLASSES[cat.accent]
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="text-foreground flex-1 font-medium">{name}</span>
                    <span
                      className="text-muted-foreground group-hover:text-primary text-xs font-medium transition-colors"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Explore more */}
      <div className="mt-16">
        <h2 className="text-foreground text-lg font-semibold">More tool categories</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {others.map((o) => {
            const OIcon = ICONS[o.icon] ?? FileText;
            return (
              <Link
                key={o.slug}
                href={`/tools/${o.slug}`}
                prefetch={false}
                className="border-border/60 hover:border-primary/40 group flex items-center gap-3 rounded-xl border bg-white p-3.5 transition-colors"
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    ACCENT_CLASSES[o.accent]
                  )}
                >
                  <OIcon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-foreground truncate text-sm font-semibold">{o.name}</div>
                  <div className="text-muted truncate text-xs">{o.pitch}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}
