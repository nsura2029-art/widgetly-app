import { TOOLS_CATEGORIES } from "./tools-categories";
import { TOOLS_SUBGROUPS } from "./tools-subgroups";
import { getIcon, type LucideIcon } from "./icons";

/**
 * Per-tool landing page registry.
 *
 * Programmatic SEO source of truth: every entry here generates a
 * static page at `/tools/[category]/[tool]` with its own title,
 * H1, meta description, OG tags, and JSON-LD. Every entry also
 * appears in `sitemap.xml` so Google can crawl and index it.
 *
 * Sources, in priority order:
 *   1. TOOLS_SUBGROUPS — the detailed mega-menu data with icons.
 *      Covers the 8 featured categories (~29 PDF tools, ~17 image
 *      tools, etc.). Each entry has a name + Lucide icon + accent.
 *   2. TOOLS_CATEGORIES[slug].examples — the flat list on each
 *      category. Covers the 4 non-featured categories (converters,
 *      business, education) that don't have subgroupings yet.
 *      Tools in this fallback inherit the category's icon + accent.
 *
 * Why two sources? The mega menu shows ~30 PDF tools (subgroups)
 * but the category page's `examples` array only lists 7. Without
 * falling back to `examples`, the 4 non-featured categories would
 * have ZERO indexed tool pages, which defeats pSEO.
 *
 * Dedup: if the same sub-tool name appears in both sources for a
 * category, the subgroups entry wins (richer data).
 */

export type ToolPage = {
  /** Category slug, used as parent path segment. */
  categorySlug: string;
  /** URL slug derived from the tool name. */
  slug: string;
  /** Display name, e.g. "Merge PDF". */
  name: string;
  /** Lucide icon name (from tools-subgroups if available, else
   *  the category icon). */
  icon: string;
  /**
   * Pre-resolved Lucide icon component. We resolve all icons at
   * module load (see `iconBySlug`) so server components can do
   * `const Icon = toolPage.Icon` without triggering the
   * `react-hooks/static-components` lint rule (which forbids
   * creating components during render).
   */
  Icon: LucideIcon;
  /** Accent color (from tools-subgroups if available, else a
   *  sensible default). */
  accent: string;
};

/** URL-safe slug from a tool display name. Same algorithm used
 *  for in-page anchors so URLs match what users see in the mega
 *  menu scroll positions. */
export function toolSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Default accent per category — used when a tool falls back to
 *  the category's `examples` list (no subgroupings defined). The
 *  colors mirror the accent map in tools-subgroups.ts so the
 *  fallback tools visually match the rest of the site. */
const CATEGORY_FALLBACK_ACCENT: Record<string, string> = {
  converters: "green",
  business: "blue",
  education: "indigo",
};
const FALLBACK_ACCENT_DEFAULT = "blue" as const;

function* iterAllTools(): Generator<Omit<ToolPage, "Icon">> {
  // Track names we've already emitted per category so dedup works.
  const seen = new Set<string>();

  // Source 1: subgroups (richer data, featured categories).
  for (const [categorySlug, subgroups] of Object.entries(TOOLS_SUBGROUPS)) {
    for (const group of subgroups) {
      for (const item of group.items) {
        const key = `${categorySlug}:${item.name.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        yield {
          categorySlug,
          slug: toolSlug(item.name),
          name: item.name,
          icon: item.icon,
          accent: group.accent,
        };
      }
    }
  }

  // Source 2: examples fallback for non-featured categories.
  for (const cat of TOOLS_CATEGORIES) {
    if (cat.slug in TOOLS_SUBGROUPS) continue; // already covered above
    const fallbackAccent: string = CATEGORY_FALLBACK_ACCENT[cat.slug] ?? FALLBACK_ACCENT_DEFAULT;
    for (const name of cat.examples) {
      const key = `${cat.slug}:${name.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      yield {
        categorySlug: cat.slug,
        slug: toolSlug(name),
        name,
        icon: cat.icon ?? "Sparkles", // category-level icon as placeholder
        accent: fallbackAccent,
      };
    }
  }
}

/**
 * Build the final ToolPage array with pre-resolved icon components.
 *
 * We resolve every icon at module load (rather than during render)
 * to satisfy `react-hooks/static-components`. The icon name is just
 * a string lookup against ICON_MAP, so the resolved component is
 * stable across renders — but the lint rule doesn't know that.
 */
const _ALL_TOOL_PAGES: readonly ToolPage[] = (() => {
  const all = Array.from(iterAllTools());
  const sorted = all.sort((a, b) => {
    if (a.categorySlug !== b.categorySlug) {
      return a.categorySlug.localeCompare(b.categorySlug);
    }
    return a.name.localeCompare(b.name);
  });
  return sorted.map((p) => ({ ...p, Icon: getIcon(p.icon) }));
})();

/** All tool pages, sorted by category then by name. Stable order
 *  makes `generateStaticParams` deterministic. Each entry has its
 *  Lucide icon pre-resolved (see `_ALL_TOOL_PAGES`). */
export function getAllToolPages(): readonly ToolPage[] {
  return _ALL_TOOL_PAGES;
}

/** Generate the `[category]/[tool]` static-params pairs Next.js
 *  uses to pre-render every per-tool page at build time. */
export function getAllToolStaticParams(): { category: string; tool: string }[] {
  return getAllToolPages().map((p) => ({
    category: p.categorySlug,
    tool: p.slug,
  }));
}

/** Lookup a single tool page by (category, slug). Returns undefined
 *  if no such tool exists (caller should 404). */
export function getToolPage(categorySlug: string, toolSlugParam: string): ToolPage | undefined {
  return getAllToolPages().find((p) => p.categorySlug === categorySlug && p.slug === toolSlugParam);
}

/** All tools in a category, for related-tools rails. */
export function getToolPagesInCategory(categorySlug: string): readonly ToolPage[] {
  return getAllToolPages().filter((p) => p.categorySlug === categorySlug);
}

/**
 * Per-tool meta description. Short pitch (~120 chars) that sells
 * the tool to a searcher and includes the primary keyword.
 *
 * Why a function and not stored data? Because the description
 * reads better when tailored to the tool name ("Merge PDF files
 * into one document..." vs a generic "Free PDF tool..."), and
 * keeping it derived avoids 200+ hand-written copy entries
 * landing in a config file.
 */
export function toolDescription(tool: ToolPage): string {
  // Pull the category's primary keyword as a relevance signal.
  const cat = TOOLS_CATEGORIES.find((c) => c.slug === tool.categorySlug);
  const keyword = cat?.keywords.primary ?? "online tool";
  const verbGuess = tool.name.toLowerCase().startsWith("pdf")
    ? tool.name.toLowerCase()
    : tool.name.toLowerCase();
  return `Free ${verbGuess} — ${keyword}, fast and private. Run ${tool.name.toLowerCase()} in your browser, no upload, no signup. Coming soon to Widgetly.`;
}

/** Tool-page keyword cluster: tool name + lower-case variations +
 *  the category's secondary keywords. */
export function toolKeywords(tool: ToolPage): readonly string[] {
  const cat = TOOLS_CATEGORIES.find((c) => c.slug === tool.categorySlug);
  const baseKeywords = [
    tool.name.toLowerCase(),
    `${tool.name.toLowerCase()} online`,
    `free ${tool.name.toLowerCase()}`,
    `${tool.name.toLowerCase()} widgetly`,
  ];
  return [...baseKeywords, ...(cat?.keywords.secondary ?? [])];
}
