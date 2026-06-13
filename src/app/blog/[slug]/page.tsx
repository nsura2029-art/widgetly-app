import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { BLOG_POSTS, BLOG_POSTS as ALL_POSTS, getBlogPost } from "@/lib/blog";
import { SITE_CONFIG } from "@/lib/constants";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/seo-schemas";

/**
 * Static-export friendly: enumerate every blog slug at build time.
 * `dynamicParams = false` means unknown slugs 404.
 */
export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export const dynamic = "force-static";

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const post = getBlogPost(params.slug);
  if (!post) return { title: "Not Found" };
  const canonical = `${SITE_CONFIG.url}/blog/${post.slug}`;
  return {
    title: `${post.title}`,
    description: post.description,
    keywords: post.tags.join(", "),
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: post.title,
      description: post.description,
      siteName: SITE_CONFIG.name,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author],
      tags: [...post.tags],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

export default function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = getBlogPost(params.slug);
  if (!post) notFound();

  const ldArticle = articleJsonLd(post);
  const ldBreadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_CONFIG.url },
    { name: "Blog", url: `${SITE_CONFIG.url}/blog` },
    { name: post.title, url: `${SITE_CONFIG.url}/blog/${post.slug}` },
  ]);

  // Related posts: same category, then by tag overlap, then most recent.
  const related = ALL_POSTS.filter((p) => p.slug !== post.slug)
    .map((p) => {
      let score = 0;
      if (p.category === post.category) score += 3;
      score += p.tags.filter((t) => post.tags.includes(t)).length;
      return { post: p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((r) => r.post);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldArticle) }}
      />
      {/* Page-level breadcrumb schema with the real post title. The global
          <BreadcrumbNav /> in the layout also emits a BreadcrumbList; both
          are valid per schema.org and Google picks the more specific one
          (this one). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldBreadcrumb) }}
      />
      <main className="container max-w-3xl py-20">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All posts
        </Link>

        <article className="mt-8">
          <header>
            <div className="text-xs font-medium uppercase tracking-wider text-primary">
              {post.category}
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {post.title}
            </h1>
            <p className="mt-4 text-lg text-muted">{post.description}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted">
              <span>By {post.author}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={post.publishedAt}>
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {post.readingTime} min read
              </span>
            </div>
          </header>

          <div className="prose prose-slate mt-10 max-w-none text-base leading-relaxed text-foreground">
            <p>
              This is a preview post on the Widgetly blog. Full content
              arrives at launch — in the meantime, every post is indexable,
              has rich-result schema, and links back to relevant tools and
              categories across the site.
            </p>
            <p>
              {post.description}
            </p>
            <h2>What you'll learn</h2>
            <ul>
              {post.tags.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </article>

        {related.length > 0 && (
          <aside className="mt-16 border-t border-border/60 pt-10">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Related posts
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-3">
              {related.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/blog/${p.slug}`}
                    className="block rounded-xl border border-border/60 bg-white p-4 shadow-soft transition-colors hover:border-primary/40"
                  >
                    <div className="text-xs font-medium uppercase tracking-wider text-primary">
                      {p.category}
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-foreground">
                      {p.title}
                    </h3>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </main>
    </>
  );
}
