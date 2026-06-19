import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { SITE_CONFIG } from "@/lib/constants";
import { isD1Configured } from "@/lib/d1/server";
import {
  SUGGESTION_CATEGORIES,
  SUGGESTION_STATUSES,
  listSuggestions,
  normalizeCategory,
  normalizeSort,
  normalizeStatus,
  suggestionStatusLabel,
  type SuggestionSort,
} from "@/lib/d1/suggestions";
import { buildMetadata } from "@/lib/seo";
import { SUGGESTIONS } from "@/lib/suggestions-seed";
import { SuggestionBoardClient } from "./suggestion-board-client";
import type { PublicSuggestion } from "./suggestion-ui";

export const revalidate = 60;

export const metadata: Metadata = buildMetadata({
  title: "Suggest a Tool",
  description:
    "Browse community tool suggestions, vote on what Widgetly should build next, and submit your own idea.",
  path: "/suggest",
  keywords: [
    "suggest a tool",
    "tool requests",
    "public roadmap",
    "Widgetly suggestions",
    "online tools voting",
  ],
});

type SearchParams = {
  category?: string;
  status?: string;
  sort?: string;
  page?: string;
};

function seedSuggestions(): PublicSuggestion[] {
  return SUGGESTIONS.map((suggestion, index) => ({
    id: index + 1,
    slug: suggestion.slug,
    toolName: suggestion.name,
    description: suggestion.pitch,
    useCase: suggestion.description,
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
  }));
}

function pageHref(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== "all") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `/suggest?${query}` : "/suggest";
}

export default async function SuggestPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const category =
    params.category && params.category !== "all" ? normalizeCategory(params.category) : undefined;
  const status =
    params.status && params.status !== "all" ? normalizeStatus(params.status) : undefined;
  const sort = normalizeSort(params.sort) as SuggestionSort;
  const page = Math.max(Number(params.page ?? "1") || 1, 1);

  let suggestions: PublicSuggestion[];
  let totalPages = 1;
  let total = 0;

  if (isD1Configured()) {
    const live = await listSuggestions({ category, status, sort, page, pageSize: 20 });
    suggestions = live.suggestions.map(({ email: _email, ...suggestion }) => suggestion);
    totalPages = live.totalPages;
    total = live.total;
  } else {
    const filtered = seedSuggestions()
      .filter((suggestion) => (category ? suggestion.category === category : true))
      .filter((suggestion) => (status ? suggestion.status === status : true))
      .sort((a, b) => {
        if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
        if (sort === "recently_built") {
          return (b.builtAt ?? b.updatedAt).localeCompare(a.builtAt ?? a.updatedAt);
        }
        return b.upvotes - a.upvotes || b.createdAt.localeCompare(a.createdAt);
      });
    total = filtered.length;
    totalPages = Math.max(1, Math.ceil(filtered.length / 20));
    suggestions = filtered.slice((page - 1) * 20, page * 20);
  }

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_CONFIG.url },
        { "@type": "ListItem", position: 2, name: "Suggest", item: `${SITE_CONFIG.url}/suggest` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How does Widgetly choose what to build next?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Widgetly reviews every suggestion, watches community upvotes, and prioritizes tools that are useful, feasible, and requested by many users.",
          },
        },
        {
          "@type": "Question",
          name: "Can I vote without creating an account?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Anonymous upvotes are allowed and protected with a session cookie and hashed IP address to reduce duplicates.",
          },
        },
      ],
    },
  ];

  return (
    <PageShell width="wide">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="border-primary/20 bg-primary/10 text-primary inline-flex rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase">
            Community roadmap
          </span>
          <h1 className="text-foreground mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Suggest a Tool
          </h1>
          <p className="text-muted mt-3 max-w-2xl text-base leading-relaxed">
            Browse what the Widgetly community wants next, vote on your favorites, and submit ideas
            that should move into the build queue.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/suggest/new">
            <Plus className="h-4 w-4" />
            Submit an idea
          </Link>
        </Button>
      </header>

      <form className="border-border/60 shadow-soft mt-8 grid gap-3 rounded-2xl border bg-white/75 p-4 backdrop-blur md:grid-cols-4">
        <select
          name="category"
          defaultValue={category ?? "all"}
          className="border-border h-11 rounded-xl border bg-white px-3 text-sm"
        >
          <option value="all">All categories</option>
          {SUGGESTION_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status ?? "all"}
          className="border-border h-11 rounded-xl border bg-white px-3 text-sm"
        >
          <option value="all">All statuses</option>
          {SUGGESTION_STATUSES.map((item) => (
            <option key={item} value={item}>
              {suggestionStatusLabel(item)}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={sort}
          className="border-border h-11 rounded-xl border bg-white px-3 text-sm"
        >
          <option value="most_voted">Most Voted</option>
          <option value="newest">Newest</option>
          <option value="recently_built">Recently Built</option>
        </select>
        <Button type="submit" variant="secondary">
          Apply filters
        </Button>
      </form>

      <div className="text-muted mt-5 text-sm">
        Showing {suggestions.length.toLocaleString()} of {total.toLocaleString()} suggestions
      </div>

      <div className="mt-5">
        <SuggestionBoardClient suggestions={suggestions} />
      </div>

      {totalPages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Pagination">
          <Button asChild variant="outline" disabled={page <= 1}>
            <Link href={pageHref({ category, status, sort, page: Math.max(1, page - 1) })}>
              Previous
            </Link>
          </Button>
          <span className="text-muted text-sm tabular-nums">
            Page {page} of {totalPages}
          </span>
          <Button asChild variant="outline" disabled={page >= totalPages}>
            <Link href={pageHref({ category, status, sort, page: Math.min(totalPages, page + 1) })}>
              Next
            </Link>
          </Button>
        </nav>
      )}
    </PageShell>
  );
}
