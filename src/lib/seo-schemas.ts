import type { BlogPostMeta } from "./blog";
import { SITE_CONFIG } from "./constants";

/**
 * Server-only schema builders used by route components. Kept separate from
 * `seo.ts` (which is bundled into the client via the metadata helpers) so
 * the schema emitters stay lean and free of React Metadata types.
 */

const SCHEMA_BASE = "https://schema.org";

export function articleJsonLd(post: BlogPostMeta) {
  return {
    "@context": SCHEMA_BASE,
    "@type": "Article",
    headline: post.title,
    description: post.description,
    image: `${SITE_CONFIG.url}/og-image.png`,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: {
      "@type": "Organization",
      name: post.author,
      url: SITE_CONFIG.url,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_CONFIG.name,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_CONFIG.url}/logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_CONFIG.url}/blog/${post.slug}`,
    },
    keywords: post.tags.join(", "),
    articleSection: post.category,
  };
}

export function blogJsonLd(posts: ReadonlyArray<BlogPostMeta>) {
  return {
    "@context": SCHEMA_BASE,
    "@type": "Blog",
    name: `${SITE_CONFIG.name} Blog`,
    description:
      "Product updates, in-depth guides, and curated best-of lists from the Widgetly team.",
    url: `${SITE_CONFIG.url}/blog`,
    publisher: {
      "@type": "Organization",
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `${SITE_CONFIG.url}/blog/${p.slug}`,
      datePublished: p.publishedAt,
      author: { "@type": "Organization", name: p.author },
    })),
  };
}

export function breadcrumbJsonLd(
  items: ReadonlyArray<{ name: string; url: string }>,
) {
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
