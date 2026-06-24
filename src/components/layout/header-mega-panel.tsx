"use client";

/**
 * HeaderMegaPanel — the dropdown that appears when the header
 * "Tools" button is clicked. Shows all 11 tool categories as a
 * grid of clickable tiles, each linking to its category page.
 *
 * Why tiles (not columns of sub-tools):
 *   - The original `tools-banner` mega panel renders sub-tools in
 *     a flex-wrap of 200px columns. With 11 categories × 3-7
 *     subgroups × 1-7 items, that's 100+ sub-tool links in one
 *     panel — overwhelming and slow to scan.
 *   - The header mega panel's job is "browse categories" (the
 *     category page handles the deeper sub-tool drill-down). The
 *     Cmd+K command palette (or the category page) handles
 *     "find a specific tool".
 *   - A 4-column grid of category tiles is a familiar mega-menu
 *     pattern (Notion, Linear, Vercel) and is fast to scan.
 *
 * Each tile shows:
 *   - Colored icon tile (matches the subgroup accent palette)
 *   - Category name
 *   - Tool count (live from D1, falls back to static catalog)
 *   - "Browse →" affordance
 *
 * Live counts are passed in from the server so the data is
 * pre-computed and the panel renders with zero client work.
 */

import * as React from "react";
import { getIcon } from "@/lib/icons";
import { Link } from "@/i18n/navigation";
import { type HeaderCategory } from "@/lib/d1/header-tools";
import { cn } from "@/lib/utils";

export type HeaderMegaPanelProps = {
  id: string;
  categories: readonly HeaderCategory[];
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onLinkClick: () => void;
};

export function HeaderMegaPanel({
  id,
  categories,
  onMouseEnter,
  onMouseLeave,
  onLinkClick,
}: HeaderMegaPanelProps) {
  return (
    <div
      // z-50 (not z-40) so the panel renders above the tools-banner
      // underneath. Both share the same top anchor, so without the
      // bump the banner would win the z-stacking and visually
      // cover the panel.
      className="pointer-events-none fixed inset-x-0 top-[var(--wly-header-height)] z-50 flex justify-center"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className={cn(
          "animate-fade-in pointer-events-auto w-full max-w-[1200px]",
          "border-border/60 bg-popover/98 supports-[backdrop-filter]:bg-popover/85",
          "rounded-b-xl border shadow-2xl backdrop-blur"
        )}
      >
        <div id={id} role="menu" aria-label="Browse tools by category" className="p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-foreground">Browse by category</h2>
            <span className="text-muted-foreground text-xs">
              {categories.length} categories
            </span>
          </div>
          <ul
            className={cn(
              "grid gap-3",
              "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
            )}
          >
            {categories.map((cat) => (
              <CategoryTile key={cat.slug} category={cat} onLinkClick={onLinkClick} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function CategoryTile({
  category,
  onLinkClick,
}: {
  category: HeaderCategory;
  onLinkClick: () => void;
}) {
  const Icon = getIcon(category.iconName);
  return (
    <li>
      <Link
        href={category.href}
        role="menuitem"
        prefetch={false}
        onClick={onLinkClick}
        className={cn(
          "group border-border/60 bg-background hover:border-primary/40 hover:shadow-soft",
          "flex h-full flex-col gap-2 rounded-xl border p-4 transition-all"
        )}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="bg-primary/10 text-primary group-hover:bg-primary/15 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors"
            aria-hidden="true"
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-foreground truncate text-sm font-semibold">{category.name}</div>
            <div className="text-muted-foreground text-xs">
              {category.liveCount} {category.liveCount === 1 ? "tool" : "tools"}
              {category.isLive ? (
                <span className="text-primary ml-1.5" aria-label="Live in dashboard">
                  ●
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <span className="text-primary mt-auto text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100">
          Browse →
        </span>
      </Link>
    </li>
  );
}
