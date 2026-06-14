import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Clock, ArrowRight, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/layout/page-shell";
import { buildMetadata } from "@/lib/seo";
import { BLOG_POSTS } from "@/lib/blog";
import { SITE_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  Announcements: "Product launches, feature updates, and what we're building next at Widgetly.",
  Guides: "In-depth, no-fluff guides on the tools and workflows we think are worth your time.",
  Education: "How students, teachers, and lifelong learners get the most out of online tools.",
};

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  const cats = new Set(BLOG_POSTS.map((p) => p.category));
  return Array.from(cats).map((slug) => ({ slug: slug.toLowerCase().replace(/\s+/g, "-") }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.toLowerCase().replace(/-/g, " ");
  const matched = BLOG_POSTS.find((p) => p.category.toLowerCase() === slug);
  if (!matched) {
    return buildMetadata({ title: "Category", path: `/blog/category/${rawSlug}`, noIndex: true });
  }
  const description =
    CATEGORY_DESCRIPTIONS[matched.category] ??
    `All ${matched.category.toLowerCase()} posts from the Widgetly team.`;
  return buildMetadata({
    title: `${matched.category} — Blog`,
    description,
    path: `/blog/category/${rawSlug}`,
    type: "website",
    keywords: [matched.category.toLowerCase(), "widgetly blog", "online tools", "productivity"],
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function BlogCategoryPage({ params }: { params: Promise<Params> }) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.toLowerCase().replace(/-/g, " ");
  const matched = BLOG_POSTS.find((p) => p.category.toLowerCase() === slug);
  if (!matched) notFound();

  const category = matched.category;
  const posts = BLOG_POSTS.filter((p) => p.category === category);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category} — ${SITE_CONFIG.name} Blog`,
    description:
      CATEGORY_DESCRIPTIONS[category] ??
      `All ${category.toLowerCase()} posts from the Widgetly team.`,
    url: `${SITE_CONFIG.url}/blog/category/${rawSlug}`,
    isPartOf: { "@type": "WebSite", name: SITE_CONFIG.name, url: SITE_CONFIG.url },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: p.title,
        url: `${SITE_CONFIG.url}/blog/${p.slug}`,
      })),
    },
  };

  return (
    <PageShell width="wide" asArticle>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="flex flex-col items-start">
        <Badge variant="secondary" className="self-start">
          <BookOpen className="mr-1 h-3 w-3" aria-hidden="true" />
          {category}
        </Badge>
        <h1 className="text-foreground mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          {category}.
        </h1>
        <p className="text-muted mt-4 max-w-2xl text-base leading-relaxed">
          {CATEGORY_DESCRIPTIONS[category] ??
            `All ${category.toLowerCase()} posts from the Widgetly team.`}
        </p>
        <p className="text-muted mt-3 text-sm">
          {posts.length} {posts.length === 1 ? "post" : "posts"} in this category.
        </p>
      </div>

      <ul className="mt-12 grid gap-5 md:grid-cols-2">
        {posts.map((p) => (
          <li
            key={p.slug}
            className="border-border/60 hover:border-primary/40 group shadow-soft hover:shadow-soft-lg rounded-2xl border bg-white p-6 transition-all hover:-translate-y-0.5"
          >
            <Link href={`/blog/${p.slug}`} className="block">
              <div className="text-muted flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  {formatDate(p.publishedAt)}
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {p.readingTime} min read
                </span>
              </div>
              <h2
                className={cn(
                  "text-foreground mt-3 text-xl leading-snug font-semibold",
                  "group-hover:text-primary"
                )}
              >
                {p.title}
              </h2>
              <p className="text-muted mt-2 line-clamp-3 text-sm leading-relaxed">
                {p.description}
              </p>
              <span className="text-primary mt-4 inline-flex items-center text-sm font-medium">
                Read post
                <ArrowRight
                  aria-hidden="true"
                  className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-12">
        <Link
          href="/blog"
          className="text-foreground inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
        >
          ← All blog posts
        </Link>
      </div>
    </PageShell>
  );
}
