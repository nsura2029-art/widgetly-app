import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/lib/constants";
import { BLOG_POSTS } from "@/lib/blog";
import { TOOLS_CATEGORIES } from "@/lib/tools-categories";
import { SUGGESTIONS } from "@/lib/suggestions-seed";

// Force static export for sitemap when using `output: export`.
export const dynamic = "force-static";

/**
 * Dynamic sitemap. Includes:
 *   - The marketing landing page and its in-page anchors
 *   - The tools index and every tools category page
 *   - Static pages (about, contact, suggest, help, legal)
 *   - The blog index, every blog category, and every blog post
 *   - Category deep-link anchors (top of the SEO copy block)
 *
 * As we add tool pages later, append them to the relevant section.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const base = SITE_CONFIG.url;

  // Unique blog categories derived from the post registry.
  const blogCategories = Array.from(new Set(BLOG_POSTS.map((p) => p.category)));

  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/#features`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/#categories`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/#waitlist`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/#faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/tools`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...TOOLS_CATEGORIES.map((c) => ({
      url: `${base}/tools/${c.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    {
      url: `${base}/help`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/contact`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${base}/suggest`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${base}/privacy-policy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/terms-and-conditions`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/cookies-policy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/security`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/blog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...blogCategories.map((cat) => ({
      url: `${base}/blog/category/${cat.toLowerCase().replace(/\s+/g, "-")}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...BLOG_POSTS.map((post) => ({
      url: `${base}/blog/post/${post.slug}`,
      lastModified: new Date(post.updatedAt ?? post.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    // Programmatic SEO surfaces — one URL per accepted suggestion.
    // Each page emits a Product/SoftwareApplication JSON-LD with
    // the appropriate ProductStatus (PreOrder while building,
    // InStock when shipped), so Google can serve rich results
    // when these rank for long-tail queries.
    ...SUGGESTIONS.map((s) => ({
      url: `${base}/suggest/${s.slug}`,
      lastModified: s.shippedAt
        ? new Date(s.shippedAt)
        : s.developmentStartedAt
          ? new Date(s.developmentStartedAt)
          : s.acceptedAt
            ? new Date(s.acceptedAt)
            : new Date(s.submittedAt),
      changeFrequency: s.status === "shipped" ? ("monthly" as const) : ("weekly" as const),
      priority: 0.7,
    })),
  ];
}
