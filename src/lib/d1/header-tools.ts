/**
 * Header tools data layer.
 *
 * Composes the live D1 counts with the static `TOOLS_CATEGORIES` registry
 * so the header mega menu can render without doing N+1 fetches. Wrapped
 * in React `cache()` so the same data is reused across the header,
 * mobile sheet, and any other consumer in the same request.
 *
 * ## Why a single composed function instead of multiple calls
 *
 * The header appears on every page. The mega panel renders up to 11
 * categories with their sub-tools. A naive "fetch counts, then fetch
 * tools per category" loop would do 1 + N round-trips. Composing them
 * here, in one cached call, keeps the header cheap even on cold edge
 * cache.
 *
 * ## Why this doesn't break the static catalog
 *
 * If D1 is empty / unbound / errors, the function returns the static
 * `TOOLS_CATEGORIES` data unchanged. The /tools/[category] page keeps
 * working from its own static `tools-pages.ts` source of truth. Only
 * the header is "enriched" when D1 has data.
 *
 * ## Cache + revalidation
 *
 * - `cache()` deduplicates within a single request.
 * - The 60s `revalidate` window is handled by the caller (the route
 *   handler / RSC fetch). For now the header is a server component
 *   that calls this directly; on a soft navigation the function
 *   re-runs (cache() is per-request, not per-process).
 * - On-demand revalidation is wired through
 *   `POST /api/revalidate/tools` (TODO: not yet implemented) — the
 *   admin dashboard hits that route after publishing a tool.
 */
import { cache } from "react";
import { TOOLS_CATEGORIES, type ToolsCategory } from "@/lib/tools-categories";
import { getSubgroups, type Subgroup } from "@/lib/tools-subgroups";
import {
  getLiveToolCountsByCategory,
  getLiveToolsForCategoryPublic,
  type PublicTool,
} from "@/lib/d1/public-tools";
import { log } from "@/lib/log";

/**
 * A live tool as exposed to the header. Subset of `PublicTool` —
 * the header only needs slug, name, accent, and href to render
 * a link in the mega panel.
 */
export type HeaderLiveTool = Pick<PublicTool, "slug" | "name" | "accent_color" | "sort_order"> & {
  href: string;
};

/**
 * One category's worth of data for the header mega menu. Designed
 * to be JSON-serializable (no functions, no class instances) so it
 * can flow through RSC props cleanly.
 */
export type HeaderCategory = {
  /** URL slug, e.g. "pdf". */
  slug: string;
  /** Display name, e.g. "PDF Tools". */
  name: string;
  /** Browse-all URL, e.g. "/tools/pdf". */
  href: string;
  /** Lucide icon name (string, resolved via getIcon in the component). */
  iconName: string;
  /** Brand accent for the icon tile. */
  accent: "primary" | "secondary" | "accent";
  /**
   * Number of live tools (from D1) in this category. Falls back to
   * the static `TOOLS_CATEGORIES[].count` if D1 is empty — so the
   * count is never zero on a populated admin DB, and never zero on
   * an empty one either.
   */
  liveCount: number;
  /**
   * True iff `liveCount` came from the D1 query (i.e. D1 had at
   * least one live tool in this category). False if we fell back
   * to the static roadmap count. Used by the UI to subtly mark
   * "live now" vs "roadmap" without splitting the data structure.
   */
  isLive: boolean;
  /**
   * Sub-groupings from `TOOLS_SUBGROUPS` for the mega-panel columns.
   * `undefined` if no detailed mega-menu definition exists for the
   * category — the UI should fall back to the flat `examples` list.
   */
  subgroups: readonly Subgroup[] | undefined;
  /**
   * Flat example names from `TOOLS_CATEGORIES[].examples`. Used as
   * the fallback list when `subgroups` is undefined. Always
   * populated (non-empty) for registered categories.
   */
  examples: readonly string[];
  /**
   * Live tools fetched from D1. Empty when D1 has no live tools in
   * this category — the UI should render the static `subgroups` or
   * `examples` instead. The D1 list is sorted by `sort_order` then
   * `name` (see the SQL in `public-tools.ts`).
   */
  liveTools: readonly HeaderLiveTool[];
};

export type HeaderToolsData = {
  categories: readonly HeaderCategory[];
  /** True if any category came from D1 (i.e. the dashboard is populated). */
  hasAnyLive: boolean;
  /** ISO timestamp of when the data was last fetched — useful for debugging. */
  fetchedAt: string;
};

/**
 * Build the header data for all categories. Resolves live counts
 * in a single call, then enriches each category with its live
 * tools list (lazy: only fetches tools for categories that have
 * at least one live tool, so empty categories are O(1)).
 *
 * This function never throws. D1 errors are logged and the static
 * catalog is used as a fallback. The header always renders.
 */
export const getHeaderToolsData = cache(async (): Promise<HeaderToolsData> => {
  const fetchedAt = new Date().toISOString();

  // Single call for all counts. Falls back to {} on D1 errors.
  let liveCounts: Record<string, number> = {};
  try {
    liveCounts = await getLiveToolCountsByCategory();
  } catch (err) {
    log.warn("header.tools.counts.failed", "header-counts-failed", {
      error: (err as Error).message,
    });
  }

  const hasAnyLive = Object.values(liveCounts).some((n) => n > 0);

  const categories: HeaderCategory[] = await Promise.all(
    TOOLS_CATEGORIES.map(async (cat: ToolsCategory): Promise<HeaderCategory> => {
      const dbCount = liveCounts[cat.slug] ?? 0;
      const isLive = dbCount > 0;
      const liveCount = isLive ? dbCount : cat.count;

      // Only fetch live tools if D1 has any for this category.
      // Avoids unnecessary D1 round-trips for the long tail of
      // categories the admin hasn't populated yet.
      let liveTools: HeaderLiveTool[] = [];
      if (isLive) {
        try {
          const rows = await getLiveToolsForCategoryPublic(cat.slug);
          liveTools = rows.map((t) => ({
            slug: t.slug,
            name: t.name,
            accent_color: t.accent_color,
            sort_order: t.sort_order,
            href: `/tools/${cat.slug}/${t.slug}`,
          }));
        } catch (err) {
          log.warn("header.tools.list.failed", "header-list-failed", {
            category: cat.slug,
            error: (err as Error).message,
          });
          // Keep liveTools = [] and isLive = true; the UI will
          // show the "X live" badge but fall through to the
          // static sub-tool structure when rendering.
        }
      }

      return {
        slug: cat.slug,
        name: cat.name,
        href: `/tools/${cat.slug}`,
        iconName: cat.icon,
        accent: cat.accent,
        liveCount,
        isLive,
        subgroups: getSubgroups(cat.slug),
        examples: cat.examples,
        liveTools,
      };
    })
  );

  return {
    categories,
    hasAnyLive,
    fetchedAt,
  };
});
