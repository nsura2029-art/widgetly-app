import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { BLOG_POSTS } from "@/lib/blog";
import { SITE_CONFIG } from "@/lib/constants";
import { PageShell } from "@/components/layout/page-shell";
import { BreadcrumbConfig } from "@/components/layout/breadcrumb-nav";

/**
 * Friendly "Coming soon" state for unknown /blog/[slug] URLs.
 *
 * Renders with HTTP 404 by virtue of being a co-located `not-found.tsx`
 * in the route segment. The framework handles the response status; this
 * file just provides the user-facing body, breadcrumb, and CTAs.
 *
 * Why a custom 404 instead of a generic one:
 *   - Users land here from shared links, social, or stale bookmarks
 *     looking for a specific post. A "this doesn't exist" wall is
 *     dead-end; a "here's what's live + where to suggest the topic you
 *     wanted" page turns a 404 into a discovery moment.
 *   - Crawlers get a clean 404 status (so we don't waste crawl budget)
 *     plus an explicit noindex via metadata.
 */

export const metadata: Metadata = {
  title: "Coming soon — Widgetly Blog",
  description:
    "This post isn't published yet. Browse the Widgetly blog for what's live, or suggest a topic you'd like to see covered.",
  robots: { index: false, follow: true },
  alternates: { canonical: `${SITE_CONFIG.url}/blog` },
};

// The three most recent posts, by publishedAt. Server-computed at build.
function recentPosts() {
  return [...BLOG_POSTS]
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .slice(0, 3);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function BlogPostNotFound() {
  const live = recentPosts();

  // Explicit breadcrumb: Home > Blog > Coming soon. We don't rely on
  // URL-derived segments here because the URL could be anything
  // (e.g. /blog/some-old-shared-link) and we want a stable, friendly trail.
  const breadcrumbItems = [
    { href: "/", label: "Home" },
    { href: "/blog", label: "Blog" },
    { href: "/blog/coming-soon", label: "Coming soon" },
  ];

  return (
    <>
      <BreadcrumbConfig
        items={breadcrumbItems.map((c) => ({ href: c.href, label: c.label }))}
        suppressSchema
      />
      <PageShell width="wide">
        <div className="mx-auto max-w-2xl text-center">
          <span className="border-border/80 text-muted shadow-soft inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1 text-xs font-medium">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            Coming soon
          </span>

          <h1 className="text-foreground mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
            This post isn&apos;t live yet.
          </h1>
          <p className="text-muted mt-4 text-base leading-relaxed sm:text-lg">
            We&apos;re writing it. In the meantime, the rest of the Widgetly
            blog is full of product updates, in-depth guides, and curated
            best-of lists on the tools we&apos;re shipping.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/blog"
              className="bg-brand-gradient inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-medium text-white shadow-glow-sm transition-all hover:brightness-110 hover:shadow-glow"
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Browse the blog
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/suggest"
              className="border-border bg-white text-foreground shadow-soft hover:border-primary/40 inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-5 text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-soft-lg"
            >
              Suggest a topic
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {live.length > 0 && (
          <section className="border-border/60 mt-20 border-t pt-12">
            <div className="mx-auto max-w-2xl">
              <h2 className="text-foreground text-sm font-semibold tracking-wider uppercase">
                What&apos;s live right now
              </h2>
              <p className="text-muted mt-2 text-sm">
                Fresh from the Widgetly team.
              </p>
            </div>

            <ul className="mt-8 grid gap-4 sm:grid-cols-3">
              {live.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/blog/${p.slug}`}
                    className="border-border/60 shadow-soft hover:border-primary/40 group block h-full rounded-xl border bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-soft-lg"
                  >
                    <div className="text-muted flex items-center gap-2 text-xs">
                      <span>{formatDate(p.publishedAt)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{p.readingTime} min read</span>
                    </div>
                    <h3 className="text-foreground group-hover:text-primary mt-3 text-base font-semibold tracking-tight">
                      {p.title}
                    </h3>
                    <p className="text-muted mt-2 line-clamp-2 text-sm leading-relaxed">
                      {p.description}
                    </p>
                    <span className="text-primary mt-4 inline-flex items-center gap-1 text-xs font-semibold">
                      Read post
                      <ArrowRight
                        aria-hidden="true"
                        className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </PageShell>
    </>
  );
}
