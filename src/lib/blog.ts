/**
 * Blog post registry. Each post is a static, server-rendered MDX-ready
 * page once we wire up a content pipeline. For the pre-launch foundation,
 * we expose slugs + metadata so the sitemap, /blog index, and
 * /blog/[slug] routes are all crawlable from day 1.
 *
 * To add a new post: append an entry below, drop the markdown file in
 * /content/blog/{slug}.mdx, and the route will pick it up automatically
 * (the route loader reads from this list to keep things static-exportable).
 */

export type BlogPostMeta = {
  slug: string;
  title: string;
  description: string;
  /** ISO 8601 publish date. */
  publishedAt: string;
  /** ISO 8601 last-modified date. */
  updatedAt?: string;
  author: string;
  category: string;
  tags: readonly string[];
  /** Estimated read time, minutes. */
  readingTime: number;
};

export const BLOG_POSTS: readonly BlogPostMeta[] = [
  {
    slug: "introducing-widgetly",
    title: "Introducing Widgetly: One Search Bar, Endless Possibilities",
    description:
      "We're building the all-in-one AI tools platform we always wished existed. Here's why — and what's coming at launch.",
    publishedAt: "2025-01-15",
    updatedAt: "2025-01-15",
    author: "The Widgetly Team",
    category: "Announcements",
    tags: ["announcement", "launch", "product"],
    readingTime: 4,
  },
  {
    slug: "best-free-online-tools-2025",
    title: "The Best Free Online Tools You Should Be Using in 2025",
    description:
      "A curated guide to the 50 most useful free online tools for productivity, writing, design, and development in 2025.",
    publishedAt: "2025-02-01",
    author: "The Widgetly Team",
    category: "Guides",
    tags: ["productivity", "tools", "guide"],
    readingTime: 9,
  },
  {
    slug: "ai-tools-for-students",
    title: "10 AI Tools Every Student Should Use in 2025",
    description:
      "From essay outlines to math solvers, here are the AI tools that will actually save you time as a student this year.",
    publishedAt: "2025-02-10",
    author: "The Widgetly Team",
    category: "Education",
    tags: ["AI", "students", "education"],
    readingTime: 6,
  },
  {
    slug: "pdf-tools-online-guide",
    title: "The Complete Guide to Online PDF Tools (And When to Use Each)",
    description:
      "Merge, split, compress, convert, sign, redact — which PDF tool should you reach for? A no-nonsense guide.",
    publishedAt: "2025-02-20",
    author: "The Widgetly Team",
    category: "Guides",
    tags: ["PDF", "tools", "guide"],
    readingTime: 7,
  },
];

export function getBlogPost(slug: string): BlogPostMeta | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getAllBlogSlugs(): readonly string[] {
  return BLOG_POSTS.map((p) => p.slug);
}
