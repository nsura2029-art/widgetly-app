import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { BLOG_POSTS, type BlogPostMeta } from "@/lib/blog";
import { SITE_CONFIG } from "@/lib/constants";
import { blogJsonLd } from "@/lib/seo-schemas";

export const metadata: Metadata = {
  title: "Blog | Widgetly — Product Updates, Guides & Best-Of Lists",
  description:
    "Product news, in-depth guides, and curated best-of lists from the Widgetly team. AI tools, productivity, PDF, dev utilities, and more.",
  alternates: { canonical: `${SITE_CONFIG.url}/blog` },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogIndexPage() {
  const ldBlog = blogJsonLd(BLOG_POSTS);
  // Breadcrumb schema is emitted globally by the layout's <BreadcrumbNav />.

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldBlog) }}
      />
      <main className="container max-w-4xl py-20">
        <header className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-border/80 bg-white px-3 py-1 text-xs font-medium text-muted shadow-soft">
            Widgetly Blog
          </span>
          <h1 className="mt-4 text-display-sm font-semibold tracking-tight text-foreground sm:text-display-md">
            Product updates, guides, and curated best-of lists
          </h1>
          <p className="mt-4 text-base text-muted sm:text-lg">
            Writing on AI tools, productivity, PDF, developer utilities, and
            everything in between. New posts weekly.
          </p>
        </header>

        <ul className="mt-14 grid gap-6 sm:grid-cols-2">
          {BLOG_POSTS.map((post) => (
            <li key={post.slug}>
              <BlogCard post={post} />
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}

function BlogCard({ post }: { post: BlogPostMeta }) {
  return (
    <article className="group h-full rounded-2xl border border-border/60 bg-white p-6 shadow-soft transition-all hover:border-primary/40 hover:shadow-soft-lg">
      <div className="text-xs font-medium uppercase tracking-wider text-primary">
        {post.category}
      </div>
      <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
        <Link
          href={`/blog/${post.slug}`}
          className="after:absolute after:inset-0 hover:underline"
        >
          {post.title}
        </Link>
      </h2>
      <p className="mt-2 text-sm text-muted line-clamp-3">{post.description}</p>
      <div className="mt-4 flex items-center gap-3 text-xs text-muted">
        <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {post.readingTime} min read
        </span>
      </div>
      <Link
        href={`/blog/${post.slug}`}
        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2"
      >
        Read post <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </article>
  );
}
