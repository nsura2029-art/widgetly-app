import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, Lightbulb } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { BreadcrumbConfig } from "@/components/layout/breadcrumb-nav";
import { SITE_CONFIG } from "@/lib/constants";
import { isD1Configured } from "@/lib/d1/server";
import {
  getSuggestionByIdOrSlug,
  normalizeCategory,
  type SuggestionRecord,
  type SuggestionStatus,
} from "@/lib/d1/suggestions";
import { buildMetadata } from "@/lib/seo";
import { SUGGESTIONS, getAllSuggestionSlugs } from "@/lib/suggestions-seed";
import { UpvoteButton } from "./UpvoteButton";
import {
  StatusBadge,
  formatSuggestionDate,
  initials,
  type PublicSuggestion,
} from "../suggestion-ui";

type Params = { slug: string };

export const revalidate = 60;
export const dynamicParams = true;

export function generateStaticParams(): Params[] {
  return getAllSuggestionSlugs().map((slug) => ({ slug }));
}

function seedToSuggestion(slug: string): PublicSuggestion | null {
  const suggestion = SUGGESTIONS.find((item) => item.slug === slug);
  if (!suggestion) return null;
  return {
    id: SUGGESTIONS.indexOf(suggestion) + 1,
    slug: suggestion.slug,
    toolName: suggestion.name,
    description: suggestion.description,
    useCase: suggestion.reasons.join(" "),
    category: normalizeCategory(suggestion.category),
    urgency: "medium",
    status:
      suggestion.status === "shipped"
        ? "live"
        : suggestion.status === "in_development"
          ? "building"
          : "in_review",
    upvotes: suggestion.voteCount,
    createdAt: suggestion.submittedAt,
    updatedAt: suggestion.shippedAt ?? suggestion.developmentStartedAt ?? suggestion.acceptedAt,
    builtAt: suggestion.shippedAt ?? null,
  };
}

async function readSuggestion(slug: string): Promise<PublicSuggestion | null> {
  if (isD1Configured()) {
    const live = await getSuggestionByIdOrSlug(slug);
    if (live) {
      const liveSuggestion: SuggestionRecord = live;
      const { email: _email, ...publicSuggestion } = liveSuggestion;
      return publicSuggestion;
    }
  }
  return seedToSuggestion(slug);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const suggestion = await readSuggestion(slug);
  if (!suggestion) return { title: "Suggestion Not Found" };
  return buildMetadata({
    title: `${suggestion.toolName} - Suggest a Tool`,
    description: suggestion.description.slice(0, 155),
    path: `/suggest/${suggestion.slug}`,
    type: "article",
    image: `${SITE_CONFIG.url}/suggest/${suggestion.slug}/opengraph-image`,
    keywords: [suggestion.toolName, suggestion.category, "Widgetly suggestion", "tool request"],
  });
}

export default async function SuggestionPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const suggestion = await readSuggestion(slug);
  if (!suggestion) notFound();

  const related = SUGGESTIONS.filter((item) => item.slug !== suggestion.slug)
    .filter((item) => normalizeCategory(item.category) === suggestion.category)
    .slice(0, 3);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: suggestion.toolName,
      description: suggestion.description,
      url: `${SITE_CONFIG.url}/suggest/${suggestion.slug}`,
      isPartOf: { "@type": "WebSite", name: SITE_CONFIG.name, url: SITE_CONFIG.url },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_CONFIG.url },
        { "@type": "ListItem", position: 2, name: "Suggest", item: `${SITE_CONFIG.url}/suggest` },
        {
          "@type": "ListItem",
          position: 3,
          name: suggestion.toolName,
          item: `${SITE_CONFIG.url}/suggest/${suggestion.slug}`,
        },
      ],
    },
    suggestion.status === ("live" satisfies SuggestionStatus)
      ? {
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: `How to use ${suggestion.toolName}`,
          description: suggestion.useCase || suggestion.description,
          step: [
            { "@type": "HowToStep", name: "Open the tool", text: "Open the Widgetly tool page." },
            {
              "@type": "HowToStep",
              name: "Add your input",
              text: "Paste text, upload a file, or enter the values the tool asks for.",
            },
            {
              "@type": "HowToStep",
              name: "Download or copy the result",
              text: "Review the output and save it when it looks right.",
            },
          ],
        }
      : null,
  ].filter(Boolean);

  return (
    <PageShell width="wide">
      <BreadcrumbConfig customLabels={{ [suggestion.slug]: suggestion.toolName }} suppressSchema />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-border/60 shadow-soft rounded-2xl border bg-white/80 p-6 backdrop-blur sm:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={suggestion.status} />
          <span className="border-border bg-muted/5 text-muted-foreground inline-flex rounded-full border px-2.5 py-1 text-xs font-medium">
            {suggestion.category}
          </span>
        </div>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h1 className="text-foreground text-4xl font-semibold tracking-tight sm:text-5xl">
              {suggestion.toolName}
            </h1>
            <p className="text-muted mt-4 max-w-3xl text-lg leading-relaxed">
              {suggestion.description}
            </p>
            <div className="text-muted mt-5 flex flex-wrap items-center gap-4 text-sm">
              <span className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold">
                {initials(suggestion.toolName)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                Submitted {formatSuggestionDate(suggestion.createdAt)}
              </span>
            </div>
          </div>
          <UpvoteButton
            id={suggestion.id}
            slug={suggestion.slug}
            initialCount={suggestion.upvotes}
          />
        </div>
      </header>

      <section className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="border-border/60 shadow-soft rounded-2xl border bg-white/80 p-6 backdrop-blur sm:p-8">
          <h2 className="text-foreground flex items-center gap-2 text-2xl font-semibold">
            <Lightbulb className="text-primary h-5 w-5" aria-hidden="true" />
            Use case
          </h2>
          <p className="text-foreground/90 mt-4 leading-relaxed">{suggestion.useCase}</p>
        </div>

        <aside className="border-border/60 bg-muted/5 rounded-2xl border p-5">
          <h2 className="text-foreground text-base font-semibold">Help shape the roadmap</h2>
          <p className="text-muted mt-2 text-sm leading-relaxed">
            Upvotes tell us which tools matter most. Anonymous votes count once; signed-in users get
            weighted votes when accounts are available.
          </p>
          <Button asChild className="mt-5 w-full">
            <Link href="/suggest/new">
              Suggest another tool
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </aside>
      </section>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-foreground text-xl font-semibold">
            More {suggestion.category} ideas
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {related.map((item) => (
              <Link
                key={item.slug}
                href={`/suggest/${item.slug}`}
                className="border-border/60 hover:border-primary/40 shadow-soft rounded-2xl border bg-white/80 p-5 transition-colors"
              >
                <div className="text-muted text-xs tabular-nums">
                  {item.voteCount.toLocaleString()} votes
                </div>
                <h3 className="text-foreground mt-2 text-sm font-semibold">{item.name}</h3>
                <p className="text-muted mt-1 line-clamp-2 text-xs leading-relaxed">{item.pitch}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
