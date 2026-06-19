import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Clock } from "lucide-react";
import { BLOG_POSTS, type BlogPostMeta } from "@/lib/blog";
import { blogJsonLd } from "@/lib/seo-schemas";
import { PageShell } from "@/components/layout/page-shell";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Blog — Product Updates, Guides & Best-Of Lists",
  description:
    "Product news, in-depth guides, and curated best-of lists from the Widgetly team. AI tools, productivity, PDF, dev utilities, and more.",
  path: "/blog",
  type: "website",
  keywords: ["widgetly blog", "online tools blog", "productivity guides", "ai tools", "pdf tools"],
});

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
      <PageShell width="wide">
        <header>
          <span className="border-border/80 text-muted shadow-soft inline-flex items-center rounded-full border bg-white px-3 py-1 text-xs font-medium">
            Widgetly Blog
          </span>
          <h1 className="text-display-sm text-foreground sm:text-display-md mt-4 font-semibold tracking-tight">
            Product updates, guides, and curated best-of lists
          </h1>
          <p className="text-muted mt-4 max-w-2xl text-base sm:text-lg">
            Writing on AI tools, productivity, PDF, developer utilities, and everything in between.
            New posts weekly.
          </p>
        </header>

        <ul className="mt-10 grid gap-6 sm:grid-cols-2">
          {BLOG_POSTS.map((post) => (
            <li key={post.slug}>
              <BlogCard post={post} />
            </li>
          ))}
        </ul>
      </PageShell>
    </>
  );
}

function BlogCard({ post }: { post: BlogPostMeta }) {
  return (
    <article className="group border-border/60 shadow-soft hover:border-primary/40 hover:shadow-soft-lg relative h-full rounded-2xl border bg-white p-6 transition-all">
      <div className="text-primary text-xs font-medium tracking-wider uppercase">
        {post.category}
      </div>
      <h2 className="text-foreground mt-2 text-lg font-semibold tracking-tight">
        <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 hover:underline">
          {post.title}
        </Link>
      </h2>
      <p className="text-muted mt-2 line-clamp-3 text-sm">{post.description}</p>
      <div className="text-muted mt-4 flex items-center gap-3 text-xs">
        <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {post.readingTime} min read
        </span>
      </div>
      <Link
        href={`/blog/${post.slug}`}
        className="text-primary mt-4 inline-flex items-center gap-1 text-sm font-semibold group-hover:gap-2"
      >
        Read post <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </article>
  );
}
